# Data Insertions

### 1. Insert a User
```javascript
db.Users.insertOne({
  _id: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  email: 'test@example.com',
  passwordHash: '$2b$10$EP...dummy...hash',
  username: 'testuser',
  role: 'user',
  isVerified: true,
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a811")
}
```
### 2. Insert a Profile
```javascript
db.Profiles.insertOne({
  _id: ObjectId('64c9d5e3f43b5c2a10b9a821'),
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  profileName: 'Main Profile',
  avatarUrl: 'https://example.com/avatar.png',
  maturityRating: 'R',
  language: 'en',
  settings: { autoplay: true },
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a821")
}
```
### 3. Insert a Movie (Night of the Living Dead)
```javascript
db.Movies.insertOne({
  _id: ObjectId('64c9d5e3f43b5c2a10b9a831'),
  title: 'Night of the Living Dead',
  overview: 'A group of strangers barricade themselves inside a rural Pennsylvania farmhouse...',
  tagline: 'They keep coming back in a bloodthirsty lust for human flesh.',
  genres: ['Horror', 'Thriller'],
  language: 'en',
  maturityRating: 'R',
  releaseDate: new ISODate('1968-10-01T00:00:00Z'),
  runtimeMinutes: 96,
  directors: ['George A. Romero'],
  cast: [
    { name: 'Duane Jones', character: 'Ben' },
    { name: 'Judith O’Dea', character: 'Barbra' }
  ],
  keywords: ['zombie', 'siege', 'independent', 'public domain'],
  popularity: 92,
  isFeatured: true,
  isPublished: true,
  sources: [
    { label: 'auto', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', type: 'hls' }
  ],
  subtitles: [],
  chapters: [],
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a831")
}
```
### 4. Insert a TVShow
```javascript
db.TVShows.insertOne({
  _id: ObjectId('64c9d5e3f43b5c2a10b9a841'),
  title: 'Sample TV Show',
  overview: 'A sample TV show overview.',
  genres: ['Drama', 'Action'],
  language: 'en',
  maturityRating: 'TV-MA',
  releaseDate: new ISODate('2020-01-01T00:00:00Z'),
  directors: ['John Doe'],
  cast: [],
  keywords: ['sample'],
  popularity: 80,
  isFeatured: false,
  isPublished: true,
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a841")
}
```
### 5. Insert a Season
```javascript
db.Seasons.insertOne({
  _id: ObjectId('64c9d5e3f43b5c2a10b9a851'),
  tvShowId: ObjectId('64c9d5e3f43b5c2a10b9a841'),
  seasonNumber: 1,
  title: 'Season 1',
  overview: 'The first season.',
  releaseDate: new ISODate('2020-01-01T00:00:00Z'),
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a851")
}
```
### 6. Insert an Episode
```javascript
db.Episodes.insertOne({
  _id: ObjectId('64c9d5e3f43b5c2a10b9a861'),
  tvShowId: ObjectId('64c9d5e3f43b5c2a10b9a841'),
  seasonId: ObjectId('64c9d5e3f43b5c2a10b9a851'),
  episodeNumber: 1,
  title: 'Pilot',
  overview: 'The first episode.',
  runtimeMinutes: 45,
  releaseDate: new ISODate('2020-01-01T00:00:00Z'),
  sources: [
    { label: 'auto', url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', type: 'hls' }
  ],
  subtitles: [],
  chapters: [],
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a861")
}
```
### 7. Insert WatchProgress
```javascript
db.WatchProgress.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  profileId: ObjectId('64c9d5e3f43b5c2a10b9a821'),
  mediaId: ObjectId('64c9d5e3f43b5c2a10b9a831'),
  mediaType: 'movie',
  watchedSeconds: 1200,
  totalSeconds: 5760,
  progressPercentage: 20.8,
  isFinished: false,
  lastWatchedAt: new ISODate(),
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 8. Insert a ListEntry
```javascript
db.ListEntries.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  profileId: ObjectId('64c9d5e3f43b5c2a10b9a821'),
  mediaId: ObjectId('64c9d5e3f43b5c2a10b9a831'),
  mediaType: 'movie',
  addedAt: new ISODate(),
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 9. Insert a Rating
```javascript
db.Ratings.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  profileId: ObjectId('64c9d5e3f43b5c2a10b9a821'),
  mediaId: ObjectId('64c9d5e3f43b5c2a10b9a831'),
  mediaType: 'movie',
  score: 5,
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 10. Insert a Review
```javascript
db.Reviews.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  profileId: ObjectId('64c9d5e3f43b5c2a10b9a821'),
  mediaId: ObjectId('64c9d5e3f43b5c2a10b9a831'),
  mediaType: 'movie',
  content: 'An absolute masterpiece of horror.',
  isApproved: true,
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 11. Insert a Notification
```javascript
db.Notifications.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  type: 'system',
  title: 'Welcome to the App',
  message: 'Enjoy streaming public domain classics!',
  isRead: false,
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 12. Insert a Social Connection
```javascript
db.Socials.insertOne({
  requesterId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  recipientId: ObjectId('64c9d5e3f43b5c2a10b9a812'),
  status: 'accepted',
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 13. Insert a WatchParty
```javascript
db.WatchParties.insertOne({
  hostId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  mediaId: ObjectId('64c9d5e3f43b5c2a10b9a831'),
  mediaType: 'movie',
  status: 'active',
  participants: [ObjectId('64c9d5e3f43b5c2a10b9a811'), ObjectId('64c9d5e3f43b5c2a10b9a812')],
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 14. Insert a SearchQuery
```javascript
db.SearchQueries.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  profileId: ObjectId('64c9d5e3f43b5c2a10b9a821'),
  keyword: 'zombie',
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 15. Insert a RefreshToken
```javascript
db.RefreshTokens.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  token: 'abc123xyz',
  expiresAt: new ISODate(new Date().getTime() + 7*24*60*60*1000),
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
### 16. Insert a VerificationToken
```javascript
db.VerificationTokens.insertOne({
  userId: ObjectId('64c9d5e3f43b5c2a10b9a811'),
  token: 'verify_abc123',
  type: 'email_verification',
  expiresAt: new ISODate(new Date().getTime() + 1*24*60*60*1000),
  createdAt: new ISODate(),
  updatedAt: new ISODate()
});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "insertedId": ObjectId("64c9d5e3f43b5c2a10b9a899")
}
```
