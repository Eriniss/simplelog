# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run

```bash
# Build the application
go build -o simplelog

# Run the built binary
./simplelog

# Or run directly without building
go run main.go
```

The server starts on port 3000 by default (configurable via PORT env var).

## Architecture Overview

SimpleLog is a Go-based blog application using Logto for OIDC authentication. The architecture follows a clean separation:

- **Backend**: Fiber v3 web framework + GORM ORM + SQLite
- **Frontend**: Vanilla HTML/CSS/JavaScript (no frameworks)
- **Authentication**: Logto OIDC integration with session-based auth using cookies

### Key Architectural Patterns

#### 1. Logto Authentication Flow

The auth flow uses OIDC authorization code flow:

1. User visits `/auth/login` → redirects to Logto
2. Logto redirects back to `/oidc/callback` with authorization code
3. Backend exchanges code for access token via `handlers/auth.go:exchangeCodeForToken()`
4. Access token stored in HTTP-only cookie named `session_token`
5. Subsequent requests include cookie → `middleware/auth.go:RequireAuth()` validates token with Logto's `/oidc/me` endpoint

**Critical**: The OAuth scope in `handlers/auth.go:31` must include `custom_data` to sync user avatar and intro fields:
```go
scope=openid+profile+email+roles+custom_data
```

#### 2. User Synchronization from Logto

`middleware/auth.go:RequireAuth()` does more than just auth - it syncs user data on every authenticated request:

- Calls Logto's `/oidc/me` endpoint to get fresh user data
- Extracts `custom_data.role`, `custom_data.intro`, `custom_data.avatar` from Logto response
- Creates user in local DB if doesn't exist (using Logto `sub` as primary key)
- Updates existing user if role/intro/avatar changed
- Stores user object in Fiber context via `c.Locals("user", user)`

This means local user data is always eventually consistent with Logto.

#### 3. Database Models and Relationships

User model (`models/models.go`):
- ID is Logto's `sub` claim (string, not auto-increment)
- Intro and Avatar fields come from Logto's `customData`
- Role determines permissions (admin vs user)

Post model:
- AuthorID is foreign key to User.ID (Logto sub)
- Author relationship must be explicitly loaded via `Preload("Author")` in all read operations
- Soft deletes enabled via `gorm.DeletedAt`

**Important**: When querying posts, always use `.Preload("Author")` or frontend will show "익명" (anonymous) instead of author names.

#### 4. Permission Model

Two roles with different capabilities:

- **admin**: Can edit/delete any post
- **user**: Can only edit/delete their own posts (checked via `post.AuthorID == user.ID`)

All authenticated users can:
- Read all posts
- Create new posts
- View their profile

Permission checks in `handlers/blog.go:UpdatePost()` and `DeletePost()`:
```go
if user.Role != "admin" && post.AuthorID != user.ID {
    return Forbidden
}
```

#### 5. Frontend Architecture

Single-page application with three views managed by JavaScript:
- List view (`posts-list`)
- Single post view (`single-post-view`)
- Form view (`post-form-container`)

View switching handled by `showListView()`, `showSingleView()`, `showFormView()` in `public/app.js`.

All API calls use `credentials: 'include'` to send session cookie. Unauthenticated responses trigger redirect to `/auth/login`.

## Database

SQLite database (`blog.db`) with auto-migration enabled. Schema is defined in `models/models.go`.

To manually inspect:
```bash
sqlite3 blog.db
.schema
SELECT * FROM users;
SELECT * FROM posts;
```

To set a user as admin:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Environment Variables

Required in `.env` file:
- `LOGTO_ENDPOINT`: Logto OIDC endpoint (includes trailing `/oidc`)
- `LOGTO_APP_ID`: Logto application ID
- `LOGTO_APP_SECRET`: Logto application secret
- `LOGTO_REDIRECT_URI`: OAuth callback URL (e.g., `http://localhost:3000/oidc/callback`)
- `LOGTO_POST_LOGOUT_REDIRECT_URI`: Where to redirect after logout
- `PORT`: Server port (default: 3000)

## Common Gotchas

1. **Missing Author data**: Always use `.Preload("Author")` when querying posts
2. **Avatar/Intro not syncing**: Ensure `custom_data` is in OAuth scope (handlers/auth.go:31)
3. **Auth loop**: Check that Logto redirect URI matches exactly (including http/https, port)
4. **Session expires**: Logto access tokens have limited lifetime - users must re-login
5. **CORS issues**: Frontend and backend must be on same origin, or CORS configured in main.go
6. **Cookie not sent**: Frontend fetch calls need `credentials: 'include'`

## Debugging

Server logs auth flow extensively:
- Token exchange success/failure
- CustomData contents (intro, avatar)
- User creation/updates
- Permission checks

Frontend logs user data and avatar loading in browser console.
