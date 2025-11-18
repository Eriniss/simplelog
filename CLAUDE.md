# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Run

### Backend

```bash
# Start PostgreSQL database
docker-compose up -d

# Build the application
go build -o simplelog

# Run the built binary
./simplelog

# Or run directly without building
go run main.go
```

The backend server starts on port 3000 by default (configurable via PORT env var).

### Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies (first time only)
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

The frontend development server runs on port 5173.

## Architecture Overview

SimpleLog is a full-stack blog application using Logto for OIDC authentication:

- **Backend**: Fiber v3 web framework + GORM ORM + PostgreSQL 18
- **Frontend**: React 18 + TypeScript + Vite
- **Authentication**: Logto OIDC integration with session-based auth using cookies
- **Database**: PostgreSQL 18 (running in Docker)

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

**No User table in database** - all user data comes from Logto directly.

Post model (`models/models.go`):
- AuthorID: Logto user ID (sub claim)
- AuthorUsername: Denormalized snapshot at creation time
- AuthorAvatar: Denormalized snapshot at creation time
- Soft deletes enabled via `gorm.DeletedAt`

Comment model:
- Similar denormalization pattern as Post
- ParentID: nullable field for threaded replies
- Replies: loaded via GORM relationships

**Important**: Post and Comment store author snapshots (username, avatar) at creation time. This means even if user updates their profile, old posts/comments retain original author info.

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

React SPA with the following structure:

**Routes** (defined in `frontend/src/App.tsx`):
- `/` - Home page with post list
- `/posts/new` - Create new post
- `/posts/:id` - View single post with comments
- `/posts/:id/edit` - Edit post

**Key Components**:
- `Header`: User menu, logout
- `PostList`: Display all posts
- `PostDetail`: Single post view
- `PostForm`: Create/edit posts
- `Comments`: Comment list with nested replies

**API Client** (`frontend/src/api/client.ts`):
- Axios-based client with `withCredentials: true`
- Automatic redirect to `/auth/login` on 401
- Base URL configurable via `VITE_API_BASE_URL` env var

**Custom Hooks**:
- `useAuth()`: Current user state
- `usePosts()`: Post list with refetch
- `usePost(id)`: Single post with refetch
- `useComments(postId)`: Comments with refetch

All API calls automatically include session cookie. The Vite dev server proxies `/api`, `/auth`, `/oidc` to backend.

## Database

PostgreSQL 18 database running in Docker. Auto-migration enabled in `database/db.go`. Schema is defined in `models/models.go`.

To manually inspect:
```bash
# Connect to PostgreSQL in Docker
docker exec -it simplelog-postgres psql -U simplelog -d simplelog

# Inside psql
\dt  -- List tables
SELECT * FROM posts;
SELECT * FROM comments;
```

To set a user as admin, update Logto's customData:
- In Logto console, edit user and set `customData.role = "admin"`
- Changes will sync on next API request

## Environment Variables

### Backend (`.env` in project root):
- `LOGTO_ENDPOINT`: Logto OIDC endpoint (includes trailing `/oidc`)
- `LOGTO_APP_ID`: Logto application ID
- `LOGTO_APP_SECRET`: Logto application secret
- `LOGTO_REDIRECT_URI`: OAuth callback URL (e.g., `http://localhost:3000/oidc/callback`)
- `LOGTO_POST_LOGOUT_REDIRECT_URI`: Where to redirect after logout (e.g., `http://localhost:5173`)
- `PORT`: Server port (default: 3000)
- `DB_HOST`: PostgreSQL host (default: localhost)
- `DB_PORT`: PostgreSQL port (default: 5432)
- `DB_USER`: PostgreSQL user (default: simplelog)
- `DB_PASSWORD`: PostgreSQL password (default: simplelog_password)
- `DB_NAME`: PostgreSQL database name (default: simplelog)

### Frontend (`frontend/.env`):
- `VITE_API_BASE_URL`: Backend API URL (default: `http://localhost:3000`)

## Common Gotchas

1. **Avatar/Intro not syncing**: Ensure `custom_data` is in OAuth scope ([handlers/auth.go:31](handlers/auth.go#L31))
2. **Auth loop**: Check that Logto redirect URI matches exactly (including http/https, port)
3. **Session expires**: Logto access tokens have limited lifetime - users must re-login
4. **CORS issues**: Both `localhost:3000` and `localhost:5173` must be in AllowOrigins ([main.go:42](main.go#L42))
5. **Cookie not sent**: Axios client uses `withCredentials: true`, Vite proxy handles this in dev
6. **PostgreSQL not running**: Run `docker-compose up -d` before starting backend
7. **Database connection fails**: Check DB environment variables match docker-compose.yml
8. **Frontend can't reach backend**: Ensure backend is running on port 3000, or update Vite proxy config

## Debugging

### Backend Logs
Server logs auth flow extensively:
- Token exchange success/failure
- CustomData contents (intro, avatar)
- Permission checks
- Database connection status

### Frontend Console
React DevTools and browser console show:
- API call errors
- Component state
- Router navigation

### Database Debugging
```bash
# View PostgreSQL logs
docker logs simplelog-postgres

# Check database connection
docker exec -it simplelog-postgres pg_isready -U simplelog
```

## Development Workflow

1. Start PostgreSQL: `docker-compose up -d`
2. Start backend: `go run main.go`
3. Start frontend: `cd frontend && npm run dev`
4. Access app at `http://localhost:5173`

The frontend dev server proxies API calls to backend automatically. In production, serve the built frontend (`frontend/dist`) from a static file server or CDN.
