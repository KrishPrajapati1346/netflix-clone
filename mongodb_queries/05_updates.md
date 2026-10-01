# Update Operations

### 1. Verify user
```javascript
db.Users.updateOne({ _id: ObjectId('64c9d5e3f43b5c2a10b9a811') }, { $set: { isVerified: true, updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 2. Update profile avatar
```javascript
db.Profiles.updateOne({ _id: ObjectId('64c9d5e3f43b5c2a10b9a821') }, { $set: { avatarUrl: 'https://example.com/new_avatar.png' } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 3. Increase movie popularity
```javascript
db.Movies.updateOne({ _id: ObjectId('64c9d5e3f43b5c2a10b9a831') }, { $inc: { popularity: 5 } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 4. Update watch progress
```javascript
db.WatchProgress.updateOne({ profileId: ObjectId('64c9d5e3f43b5c2a10b9a821'), mediaId: ObjectId('64c9d5e3f43b5c2a10b9a831') }, { $set: { watchedSeconds: 3000, progressPercentage: 52.08, lastWatchedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 5. Mark notification as read
```javascript
db.Notifications.updateOne({ _id: ObjectId('...') }, { $set: { isRead: true } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 6. Update WatchParty status
```javascript
db.WatchParties.updateOne({ _id: ObjectId('...') }, { $set: { status: 'ended' } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 7. Add genre to Movie
```javascript
db.Movies.updateOne({ _id: ObjectId('64c9d5e3f43b5c2a10b9a831') }, { $push: { genres: 'Classic' } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 8. Remove genre from TVShow
```javascript
db.TVShows.updateOne({ _id: ObjectId('64c9d5e3f43b5c2a10b9a841') }, { $pull: { genres: 'Action' } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 1,
  "modifiedCount": 1
}
```
### 9. Update all Users timestamps
```javascript
db.Users.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 10. Update all Profiles timestamps
```javascript
db.Profiles.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 11. Update all Movies timestamps
```javascript
db.Movies.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 12. Update all TVShows timestamps
```javascript
db.TVShows.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 13. Update all Seasons timestamps
```javascript
db.Seasons.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 14. Update all Episodes timestamps
```javascript
db.Episodes.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 15. Update all WatchProgress timestamps
```javascript
db.WatchProgress.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 16. Update all ListEntries timestamps
```javascript
db.ListEntries.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 17. Update all Ratings timestamps
```javascript
db.Ratings.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 18. Update all Reviews timestamps
```javascript
db.Reviews.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 19. Update all Notifications timestamps
```javascript
db.Notifications.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 20. Update all Socials timestamps
```javascript
db.Socials.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 21. Update all WatchParties timestamps
```javascript
db.WatchParties.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 22. Update all SearchQueries timestamps
```javascript
db.SearchQueries.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 23. Update all RefreshTokens timestamps
```javascript
db.RefreshTokens.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
### 24. Update all VerificationTokens timestamps
```javascript
db.VerificationTokens.updateMany({}, { $set: { updatedAt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "matchedCount": 5,
  "modifiedCount": 5
}
```
