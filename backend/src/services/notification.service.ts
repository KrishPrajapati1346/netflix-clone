import type { Types } from 'mongoose';
import type { NotificationDTO } from '@shared';
import { logger } from '../config/logger';
import { Notification, type NotificationKind } from '../models/Notification';
import { Profile } from '../models/Profile';

/**
 * In-app notifications.
 *
 * Delivery is dual: the row is always persisted, and a live socket push is
 * attempted on top. Persisting first means a notification raised while someone
 * is offline still appears in their list — a socket-only design silently drops
 * everything sent to a disconnected user.
 */

type Emitter = (profileId: string, notification: NotificationDTO) => void;

let emit: Emitter = () => {
  // Replaced once Socket.IO is initialised. Before that (and in tests) this is
  // a no-op, so the persisted row is still the source of truth.
};

export function registerNotificationEmitter(emitter: Emitter): void {
  emit = emitter;
}

export interface CreateNotificationInput {
  profileId: Types.ObjectId;
  userId: Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body?: string;
  href?: string;
  actorProfileId?: Types.ObjectId;
}

export async function notify(input: CreateNotificationInput): Promise<NotificationDTO | null> {
  /**
   * Honour the recipient's preferences.
   *
   * Checked here rather than at each call site so a new notification type
   * cannot forget to ask — the default is to respect the setting.
   */
  const profile = await Profile.findById(input.profileId).select('notifications').lean();
  if (!profile) return null;

  const prefs = profile.notifications;
  const allowed: Record<NotificationKind, boolean> = {
    follow: prefs.followActivity,
    party_invite: prefs.partyInvites,
    new_content: prefs.newContent,
    review_like: prefs.reviewLikes,
    // System messages are operational, not marketing, so they are not opt-out.
    system: true,
  };

  if (!allowed[input.kind]) return null;

  const row = await Notification.create({
    profileId: input.profileId,
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? '',
    href: input.href ?? null,
    actorProfileId: input.actorProfileId ?? null,
  });

  const dto = toDTO(row);

  try {
    emit(input.profileId.toString(), dto);
  } catch (error) {
    // A failed push must not fail the action that triggered it; the row is
    // already saved and will show up on next load.
    logger.debug({ err: error }, 'Notification push failed');
  }

  return dto;
}

export async function listNotifications(
  profileId: Types.ObjectId,
  limit = 30,
): Promise<{ items: NotificationDTO[]; unread: number }> {
  const [rows, unread] = await Promise.all([
    Notification.find({ profileId }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ profileId, readAt: null }),
  ]);

  return { items: rows.map(toDTO), unread };
}

export async function markRead(profileId: Types.ObjectId, ids?: string[]): Promise<number> {
  const filter: Record<string, unknown> = { profileId, readAt: null };
  // No ids means "mark all read"; the profile filter still scopes it.
  if (ids?.length) filter._id = { $in: ids };

  const result = await Notification.updateMany(filter, { $set: { readAt: new Date() } });
  return result.modifiedCount;
}

function toDTO(row: {
  _id: Types.ObjectId;
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  readAt?: Date | null;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: row._id.toString(),
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href ?? null,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}
