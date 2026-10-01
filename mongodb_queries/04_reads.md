# Read Operations

### 1. Find all Users
```javascript
db.Users.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 2. Count Users
```javascript
db.Users.countDocuments();
```

**Expected Output:**
```json
42
```
### 3. Find all Profiles
```javascript
db.Profiles.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 4. Count Profiles
```javascript
db.Profiles.countDocuments();
```

**Expected Output:**
```json
42
```
### 5. Find all Movies
```javascript
db.Movies.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 6. Count Movies
```javascript
db.Movies.countDocuments();
```

**Expected Output:**
```json
42
```
### 7. Find all TVShows
```javascript
db.TVShows.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 8. Count TVShows
```javascript
db.TVShows.countDocuments();
```

**Expected Output:**
```json
42
```
### 9. Find all Seasons
```javascript
db.Seasons.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 10. Count Seasons
```javascript
db.Seasons.countDocuments();
```

**Expected Output:**
```json
42
```
### 11. Find all Episodes
```javascript
db.Episodes.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 12. Count Episodes
```javascript
db.Episodes.countDocuments();
```

**Expected Output:**
```json
42
```
### 13. Find all WatchProgress
```javascript
db.WatchProgress.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 14. Count WatchProgress
```javascript
db.WatchProgress.countDocuments();
```

**Expected Output:**
```json
42
```
### 15. Find all ListEntries
```javascript
db.ListEntries.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 16. Count ListEntries
```javascript
db.ListEntries.countDocuments();
```

**Expected Output:**
```json
42
```
### 17. Find all Ratings
```javascript
db.Ratings.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 18. Count Ratings
```javascript
db.Ratings.countDocuments();
```

**Expected Output:**
```json
42
```
### 19. Find all Reviews
```javascript
db.Reviews.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 20. Count Reviews
```javascript
db.Reviews.countDocuments();
```

**Expected Output:**
```json
42
```
### 21. Find all Notifications
```javascript
db.Notifications.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 22. Count Notifications
```javascript
db.Notifications.countDocuments();
```

**Expected Output:**
```json
42
```
### 23. Find all Socials
```javascript
db.Socials.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 24. Count Socials
```javascript
db.Socials.countDocuments();
```

**Expected Output:**
```json
42
```
### 25. Find all WatchParties
```javascript
db.WatchParties.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 26. Count WatchParties
```javascript
db.WatchParties.countDocuments();
```

**Expected Output:**
```json
42
```
### 27. Find all SearchQueries
```javascript
db.SearchQueries.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 28. Count SearchQueries
```javascript
db.SearchQueries.countDocuments();
```

**Expected Output:**
```json
42
```
### 29. Find all RefreshTokens
```javascript
db.RefreshTokens.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 30. Count RefreshTokens
```javascript
db.RefreshTokens.countDocuments();
```

**Expected Output:**
```json
42
```
### 31. Find all VerificationTokens
```javascript
db.VerificationTokens.find({});
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 32. Count VerificationTokens
```javascript
db.VerificationTokens.countDocuments();
```

**Expected Output:**
```json
42
```
### 33. Find user by email
```javascript
db.Users.findOne({ email: 'test@example.com' });
```

**Expected Output:**
### 34. Find featured movies
```javascript
db.Movies.find({ isFeatured: true, isPublished: true });
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 35. Find movies by genre
```javascript
db.Movies.find({ genres: 'Horror' }).sort({ releaseDate: -1 });
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 36. Text search movies
```javascript
db.Movies.find({ $text: { $search: 'zombie' } });
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 37. Find watch progress for a profile
```javascript
db.WatchProgress.find({ profileId: ObjectId('64c9d5e3f43b5c2a10b9a821') });
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 38. Aggregate user ratings
```javascript
db.Ratings.aggregate([{ $match: { userId: ObjectId('64c9d5e3f43b5c2a10b9a811') } }, { $group: { _id: '$mediaType', avgScore: { $avg: '$score' } } }]);
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 39. Find episodes for a season
```javascript
db.Episodes.find({ seasonId: ObjectId('64c9d5e3f43b5c2a10b9a851') }).sort({ episodeNumber: 1 });
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 40. Find unread notifications
```javascript
db.Notifications.find({ userId: ObjectId('64c9d5e3f43b5c2a10b9a811'), isRead: false });
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 41. Join WatchProgress with Movies
```javascript
db.WatchProgress.aggregate([
  { $match: { mediaType: 'movie' } },
  { $lookup: { from: 'Movies', localField: 'mediaId', foreignField: '_id', as: 'movie' } },
  { $unwind: '$movie' }
]);
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
### 42. Find active watch parties
```javascript
db.WatchParties.find({ status: 'active' });
```

**Expected Output:**
```json
[
  {
    "_id": ObjectId("64c9d5e3f43b5c2a10b9a811"),
    "...": "document data matching the query"
  }
]
```
