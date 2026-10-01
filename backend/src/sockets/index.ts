import type http from 'node:http';
import { Server, type Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  joinPartySchema,
  partyChatSchema,
  partyControlSchema,
  partyReactionSchema,
  type PartySyncPayload,
} from '@shared';
import { allowedOrigins } from '../config/env';
import { logger } from '../config/logger';
import { Profile, type ProfileDocument } from '../models/Profile';
import { User, type UserDocument } from '../models/User';
import * as party from '../services/party.service';
import { registerNotificationEmitter } from '../services/notification.service';
import { verifyAccessToken, verifyProfileToken } from '../services/token.service';

/**
 * Socket.IO server.
 *
 * Two rules shape everything here:
 *
 *  1. **A socket is authenticated once, then authorised per event.** The
 *     handshake proves who you are; it does not prove you may control a
 *     particular party. Every playback command re-checks host permission
 *     against the database.
 *  2. **Every payload is validated.** Sockets bypass Express middleware, so the
 *     same Zod schemas are applied by hand — a connected client is still an
 *     untrusted one.
 */

interface SocketData {
  user: UserDocument;
  profile: ProfileDocument;
}

type KinoraSocket = Socket & { data: SocketData };

/** Personal room per profile, so notifications address one person exactly. */
const profileRoom = (profileId: string) => `profile:${profileId}`;
const partyRoom = (code: string) => `party:${code}`;

export function createSocketServer(httpServer: http.Server): Server {
  const io = new Server(httpServer, {
    cors: {
      // Same allow-list as the HTTP API: Socket.IO's handshake is a real
      // cross-origin request and a permissive default here would undo the
      // CORS policy set on Express.
      origin: allowedOrigins,
      credentials: true,
    },
    // Bound the payload so a hostile client cannot exhaust memory with one frame.
    maxHttpBufferSize: 1e6,
    pingTimeout: 20_000,
  });

  /**
   * Handshake authentication.
   *
   * Both tokens are required: the access token says which account, the profile
   * grant says which profile — and the grant is checked against the account, so
   * one cannot be paired with another's.
   */
  io.use(async (socket, next) => {
    try {
      const auth = socket.handshake.auth as { token?: string; profileToken?: string };

      if (!auth.token) return next(new Error('UNAUTHORIZED'));

      const payload = verifyAccessToken(auth.token);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('UNAUTHORIZED'));

      if (payload.iat * 1000 < user.credentialsChangedAt.getTime()) {
        return next(new Error('CREDENTIALS_CHANGED'));
      }

      if (!auth.profileToken) return next(new Error('PROFILE_REQUIRED'));
      const profileId = verifyProfileToken(auth.profileToken, user._id.toString());
      if (!profileId) return next(new Error('PROFILE_REQUIRED'));

      const profile = await Profile.findOne({ _id: profileId, userId: user._id });
      if (!profile) return next(new Error('PROFILE_REQUIRED'));

      (socket as KinoraSocket).data = { user, profile };
      next();
    } catch (error) {
      logger.debug({ err: error }, 'Socket handshake rejected');
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (rawSocket) => {
    const socket = rawSocket as KinoraSocket;
    const { profile } = socket.data;
    const profileId = profile._id.toString();

    socket.join(profileRoom(profileId));
    logger.debug({ profileId }, 'Socket connected');

    /** Tracks which party this socket is in, for cleanup on disconnect. */
    let joinedCode: string | null = null;

    const fail = (message: string) => socket.emit(SOCKET_EVENTS.partyError, { message });

    socket.on(SOCKET_EVENTS.partyJoin, async (raw: unknown) => {
      const parsed = joinPartySchema.safeParse(raw);
      if (!parsed.success) return fail('Invalid party code');

      try {
        const record = await party.findParty(parsed.data.code);
        const code = record.code;

        socket.join(partyRoom(code));
        joinedCode = code;

        const members = party.joinPresence(code, {
          profileId,
          name: profile.name,
          avatarKey: profile.avatarKey,
          isHost: record.hostProfileId.toString() === profileId,
        });

        // The joiner gets full state plus history; everyone else just needs the
        // updated member list.
        socket.emit(SOCKET_EVENTS.partyState, {
          state: await party.toPartyState(record, profile),
          messages: await party.getMessages(record._id),
        });
        io.to(partyRoom(code)).emit(SOCKET_EVENTS.partyMembers, { members });

        const joinMessage = await party.addMessage(
          record,
          profile,
          'system',
          `${profile.name} joined`,
          party.projectedPosition(record),
        );
        socket.to(partyRoom(code)).emit(SOCKET_EVENTS.partyMessage, joinMessage);
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Could not join that party');
      }
    });

    socket.on(SOCKET_EVENTS.partyControl, async (raw: unknown) => {
      const parsed = partyControlSchema.safeParse(raw);
      if (!parsed.success) return fail('Invalid playback command');

      try {
        const record = await party.findParty(parsed.data.code);
        await party.applyControl(
          record,
          profile,
          parsed.data.action,
          parsed.data.positionSeconds,
        );

        const payload: PartySyncPayload = {
          action: parsed.data.action,
          positionSeconds: parsed.data.positionSeconds,
          // Clients add their own elapsed time to this before seeking, which is
          // what keeps members aligned across varying latency.
          atServerTime: new Date().toISOString(),
          byProfileId: profileId,
        };

        // `socket.to` excludes the sender: the host's own player is already in
        // the requested state, and echoing back causes a seek-loop.
        socket.to(partyRoom(record.code)).emit(SOCKET_EVENTS.partySync, payload);
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Playback command failed');
      }
    });

    socket.on(SOCKET_EVENTS.partyChat, async (raw: unknown) => {
      const parsed = partyChatSchema.safeParse(raw);
      if (!parsed.success) return fail('Message is empty or too long');

      try {
        const record = await party.findParty(parsed.data.code);
        const message = await party.addMessage(
          record,
          profile,
          'chat',
          parsed.data.body,
          parsed.data.atSeconds,
        );
        io.to(partyRoom(record.code)).emit(SOCKET_EVENTS.partyMessage, message);
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Could not send that message');
      }
    });

    socket.on(SOCKET_EVENTS.partyReaction, async (raw: unknown) => {
      const parsed = partyReactionSchema.safeParse(raw);
      if (!parsed.success) return fail('Unknown reaction');

      try {
        const record = await party.findParty(parsed.data.code);
        const message = await party.addMessage(
          record,
          profile,
          'reaction',
          parsed.data.emoji,
          parsed.data.atSeconds,
        );
        io.to(partyRoom(record.code)).emit(SOCKET_EVENTS.partyMessage, message);
      } catch (error) {
        fail(error instanceof Error ? error.message : 'Could not send that reaction');
      }
    });

    socket.on(SOCKET_EVENTS.partyLeave, async () => {
      if (joinedCode) await leaveParty(joinedCode);
      joinedCode = null;
    });

    socket.on('disconnect', async () => {
      if (joinedCode) await leaveParty(joinedCode);
      logger.debug({ profileId }, 'Socket disconnected');
    });

    async function leaveParty(code: string): Promise<void> {
      socket.leave(partyRoom(code));
      const members = party.leavePresence(code, profileId);
      io.to(partyRoom(code)).emit(SOCKET_EVENTS.partyMembers, { members });

      try {
        const record = await party.findParty(code);
        const message = await party.addMessage(
          record,
          profile,
          'system',
          `${profile.name} left`,
          party.projectedPosition(record),
        );
        io.to(partyRoom(code)).emit(SOCKET_EVENTS.partyMessage, message);
      } catch {
        // The party may already have ended; leaving one that is gone is fine.
      }
    }
  });

  /**
   * Wire notification delivery to the socket layer.
   *
   * The service knows nothing about Socket.IO — it calls an emitter it was
   * handed. That keeps notifications testable without standing up a server, and
   * means a future transport (web push, email digest) is another registration
   * rather than a rewrite.
   */
  registerNotificationEmitter((targetProfileId, notification) => {
    io.to(profileRoom(targetProfileId)).emit(SOCKET_EVENTS.notification, notification);
  });

  logger.info('Socket.IO ready');
  return io;
}
