# Indexes

### 1. Index Users by createdAt
```javascript
db.Users.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 2. Index Profiles by createdAt
```javascript
db.Profiles.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"userId_1_profileName_1"
```
### 3. Index Movies by createdAt
```javascript
db.Movies.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 4. Index TVShows by createdAt
```javascript
db.TVShows.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 5. Index Seasons by createdAt
```javascript
db.Seasons.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 6. Index Episodes by createdAt
```javascript
db.Episodes.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 7. Index WatchProgress by createdAt
```javascript
db.WatchProgress.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 8. Index ListEntries by createdAt
```javascript
db.ListEntries.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 9. Index Ratings by createdAt
```javascript
db.Ratings.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 10. Index Reviews by createdAt
```javascript
db.Reviews.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 11. Index Notifications by createdAt
```javascript
db.Notifications.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 12. Index Socials by createdAt
```javascript
db.Socials.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 13. Index WatchParties by createdAt
```javascript
db.WatchParties.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 14. Index SearchQueries by createdAt
```javascript
db.SearchQueries.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 15. Index RefreshTokens by createdAt
```javascript
db.RefreshTokens.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 16. Index VerificationTokens by createdAt
```javascript
db.VerificationTokens.createIndex({ createdAt: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 17. Unique index on Users email
```javascript
db.Users.createIndex({ email: 1 }, { unique: true });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 18. TTL index on RefreshTokens
```javascript
db.RefreshTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 19. TTL index on VerificationTokens
```javascript
db.VerificationTokens.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 20. Compound index on Profiles
```javascript
db.Profiles.createIndex({ userId: 1, profileName: 1 }, { unique: true });
```

**Expected Output:**
```json
"userId_1_profileName_1"
```
### 21. Text index on Movies
```javascript
db.Movies.createIndex({ title: 'text', overview: 'text' });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 22. Movie releaseDate index
```javascript
db.Movies.createIndex({ isPublished: 1, releaseDate: -1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
### 23. Movie runtime index
```javascript
db.Movies.createIndex({ isPublished: 1, runtimeMinutes: 1 });
```

**Expected Output:**
```json
"createdAt_-1"
```
