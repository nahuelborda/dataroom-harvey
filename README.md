# Dataroom - Google Drive Importer

A full-stack web application that allows users to connect their Google Drive, browse files, and import them into organized "datarooms" for secure local storage and management.

## Project Overview

**Goal:** Build a web app that lets users:
1. Connect their Google Drive via OAuth
2. Browse/select files from a specific Drive folder
3. Import selected files into a local "dataroom" (metadata in DB, files on disk)
4. Browse/manage imported files (list, view/download, delete)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   Google APIs   │
│  React + Vite   │◀────│     Flask       │◀────│  (OAuth/Drive)  │
│    (Vercel)     │     │    (Render)     │     └─────────────────┘
└─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (Render DB)   │
                        └─────────────────┘
```

### High-Level Flow

1. User visits the React SPA (hosted on Vercel)
2. Clicks "Sign in with Google"
3. Frontend redirects to backend `/auth/google/start`
4. Backend redirects to Google OAuth consent screen
5. Google redirects back to `/auth/google/callback` with authorization code
6. Backend exchanges code for access + refresh tokens, stores them in DB
7. Backend issues JWT session token to frontend
8. User can now:
   - List Drive files from a specific folder (`/api/drive/files`)
   - Import selected files into a Dataroom (`/api/files/import`)
9. Imported files are stored with metadata in PostgreSQL and content on disk

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | React 18 + TypeScript + Vite | Modern, fast, type-safe |
| **Styling** | Tailwind CSS | Utility-first, rapid development |
| **Backend** | Flask (Python) | Lightweight, easy to deploy |
| **Database** | PostgreSQL | Production-ready, relational integrity |
| **ORM** | SQLAlchemy + Flask-Migrate | Robust migrations, type safety |
| **Auth** | Google OAuth 2.0 + JWT | Industry standard, secure |
| **Hosting** | Vercel (FE) + Render (BE) | Free tier, easy deployment |

## Database Schema

```sql
-- Users table
users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- OAuth accounts linked to users
oauth_accounts (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    provider VARCHAR(50),           -- 'google'
    provider_account_id VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    expires_at TIMESTAMP,
    scope TEXT
)

-- Datarooms for organizing files
datarooms (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    name VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
)

-- Imported files
files (
    id UUID PRIMARY KEY,
    dataroom_id UUID REFERENCES datarooms(id),
    user_id UUID REFERENCES users(id),
    google_file_id VARCHAR(255),
    name VARCHAR(500),
    mime_type VARCHAR(255),
    size_bytes BIGINT,
    storage_path VARCHAR(1000),
    original_url TEXT,
    status VARCHAR(50),             -- 'imported', 'deleted', 'failed'
    imported_at TIMESTAMP
)
```

## Design Decisions

### 1. Backend-Owned OAuth
All OAuth flows and token management happen on the backend. The frontend **never** sees Google refresh tokens—only receives a signed JWT session token. This prevents token leakage and simplifies security.

### 2. Lazy Token Refresh
Access tokens are refreshed on-demand when close to expiry, rather than on a scheduled background job. This reduces complexity and is sufficient for this use case.

### 3. Folder-Scoped File Browsing
The Drive file picker is scoped to a specific folder (`ALLOWED_FOLDER_ID` in `drive_routes.py`). This:
- Prevents users from browsing all files in their Drive
- Provides a focused, curated experience
- Can be configured per-deployment

### 4. Structured File Storage
Files are stored on disk at: `data/{user_id}/{dataroom_id}/{uuid}.{ext}`

Benefits:
- Clear organization by user and dataroom
- Easy to migrate to S3/GCS later (just change storage.py)
- UUID filenames prevent conflicts

### 5. Logical Deletes
Deleted files are marked with `status='deleted'` rather than physically removed. This enables:
- Audit trails
- Easy restoration if needed
- Consistent file counts in reports

### 6. Auto-Detecting Redirect URIs
The OAuth redirect URI auto-detects from `request.host_url` if not explicitly configured. This simplifies deployment across different environments.

## Local Development Setup

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL (or Docker)
- Google Cloud Console project with OAuth credentials

### 1. Clone the Repository
```bash
git clone https://github.com/nahuelborda/dataroom-harvey.git
cd dataroom-harvey
```

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Drive API**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URI: `http://localhost:5000/auth/google/callback`
7. Add authorized JavaScript origins: `http://localhost:5173`, `http://localhost:5000`
8. Copy the Client ID and Client Secret

### 3. Start PostgreSQL

Using Docker:
```bash
docker-compose up -d
```

Or create a local database:
```bash
createdb dataroom
```

### 4. Set Up Backend

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
SECRET_KEY=dev-secret-key
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/dataroom
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
FRONTEND_ORIGIN=http://localhost:5173
STORAGE_PATH=./data
JWT_SECRET=dev-jwt-secret
JWT_EXPIRY_HOURS=24
EOF

# Initialize database
export FLASK_APP=app.main:app
flask db init
flask db migrate -m "Initial"
flask db upgrade

# Run server
flask run --port 5000
```

### 5. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_BACKEND_URL=http://localhost:5000" > .env

# Run development server
npm run dev
```

### 6. Access the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Production Deployment

### Deploy Backend to Render

1. Go to [render.com](https://render.com) → **New + → Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `chmod +x build.sh && ./build.sh`
   - **Start Command**: `.venv/bin/gunicorn app.main:app --bind 0.0.0.0:$PORT`

4. Create PostgreSQL database: **New + → PostgreSQL**

5. Add Environment Variables:
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (auto-linked from PostgreSQL) |
   | `FRONTEND_ORIGIN` | `https://your-app.vercel.app` |
   | `GOOGLE_REDIRECT_URI` | `https://your-backend.onrender.com/auth/google/callback` |

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import your GitHub repo
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Vite

4. Add Environment Variable:
   | Key | Value |
   |-----|-------|
   | `VITE_BACKEND_URL` | `https://your-backend.onrender.com` |

### Update Google OAuth

Add to your Google Cloud Console credentials:

**Authorized redirect URIs:**
```
https://your-backend.onrender.com/auth/google/callback
```

**Authorized JavaScript origins:**
```
https://your-backend.onrender.com
https://your-app.vercel.app
```

## Project Structure

```
dataroom-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py          # Flask app factory
│   │   ├── config.py            # Configuration management
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── auth.py              # JWT authentication
│   │   ├── google_client.py     # Google API client
│   │   ├── storage.py           # File storage utilities
│   │   └── routes/
│   │       ├── auth_routes.py   # OAuth endpoints
│   │       ├── drive_routes.py  # Drive API endpoints
│   │       ├── dataroom_routes.py
│   │       └── file_routes.py
│   ├── migrations/              # Alembic migrations
│   ├── requirements.txt
│   ├── build.sh                 # Render build script
│   └── Procfile
├── frontend/
│   ├── src/
│   │   ├── api/client.ts        # API client
│   │   ├── context/AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── DataroomsPage.tsx
│   │   │   └── DataroomDetailPage.tsx
│   │   └── components/
│   │       ├── DriveFilePickerModal.tsx
│   │       └── CreateDataroomModal.tsx
│   ├── package.json
│   └── vercel.json
├── docker-compose.yml
├── DEPLOY.md
└── README.md
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google/start` | Initiate OAuth flow |
| GET | `/auth/google/callback` | OAuth callback handler |
| GET | `/auth/me` | Get current user info |
| POST | `/auth/logout` | Logout |

### Google Drive
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/drive/files` | List files from configured folder |

### Datarooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/datarooms` | List all datarooms |
| POST | `/api/datarooms` | Create dataroom |
| GET | `/api/datarooms/:id` | Get dataroom details |
| PUT | `/api/datarooms/:id` | Update dataroom |
| DELETE | `/api/datarooms/:id` | Delete dataroom |

### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/files/import` | Import file from Drive |
| GET | `/api/files/:id` | Get file metadata |
| GET | `/api/files/:id/download` | Download file |
| DELETE | `/api/files/:id` | Delete file |

## Security Considerations

- All secrets in environment variables, never in code
- Backend validates resource ownership on every request
- Google refresh tokens never exposed to frontend
- JWT tokens with configurable expiry
- Only Google Drive read-only scope requested
- CORS configured to allow only frontend origin
- Drive browsing scoped to specific folder

## Future Improvements

- [ ] Replace local disk storage with S3/GCS
- [ ] Add full-text search over imported file contents
- [ ] Support bulk import with background processing
- [ ] Add file preview functionality
- [ ] Implement file sharing between users
- [ ] Add rate limiting on sensitive endpoints
- [ ] Support additional OAuth providers
