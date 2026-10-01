# Delete Operations

### 1. Delete a Profile
```javascript
db.Profiles.deleteOne({ _id: ObjectId('64c9d5e3f43b5c2a10b9a821') });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 1
}
```
### 2. Delete WatchProgress
```javascript
db.WatchProgress.deleteOne({ profileId: ObjectId('64c9d5e3f43b5c2a10b9a821'), mediaId: ObjectId('64c9d5e3f43b5c2a10b9a831') });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 1
}
```
### 3. Delete expired RefreshTokens
```javascript
db.RefreshTokens.deleteMany({ expiresAt: { $lt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 4. Delete expired VerificationTokens
```javascript
db.VerificationTokens.deleteMany({ expiresAt: { $lt: new ISODate() } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 5. Delete read Notifications older than 30 days
```javascript
db.Notifications.deleteMany({ isRead: true, createdAt: { $lt: new ISODate(new Date() - 30*24*60*60*1000) } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 6. Delete unverified Users older than 7 days
```javascript
db.Users.deleteMany({ isVerified: false, createdAt: { $lt: new ISODate(new Date() - 7*24*60*60*1000) } });
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 7. Delete all Users
```javascript
db.Users.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 8. Delete all Profiles
```javascript
db.Profiles.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 9. Delete all Movies
```javascript
db.Movies.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 10. Delete all TVShows
```javascript
db.TVShows.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 11. Delete all Seasons
```javascript
db.Seasons.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 12. Delete all Episodes
```javascript
db.Episodes.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 13. Delete all WatchProgress
```javascript
db.WatchProgress.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 14. Delete all ListEntries
```javascript
db.ListEntries.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 15. Delete all Ratings
```javascript
db.Ratings.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 16. Delete all Reviews
```javascript
db.Reviews.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 17. Delete all Notifications
```javascript
db.Notifications.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 18. Delete all Socials
```javascript
db.Socials.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 19. Delete all WatchParties
```javascript
db.WatchParties.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 20. Delete all SearchQueries
```javascript
db.SearchQueries.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 21. Delete all RefreshTokens
```javascript
db.RefreshTokens.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
### 22. Delete all VerificationTokens
```javascript
db.VerificationTokens.deleteMany({});
```

**Expected Output:**
```json
{
  "acknowledged": true,
  "deletedCount": 12
}
```
