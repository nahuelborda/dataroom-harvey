# Dataroom - Google Drive Importer

A full-stack web application that allows users to connect their Google Drive, browse files, and import them into organized "datarooms" for secure local storage and management.

![Dataroom App](https://via.placeholder.com/800x400?text=Dataroom+App)

## Features

- **Google OAuth Integration**: Secure authentication via Google OAuth 2.0
- **Drive File Browsing**: Browse and search files in your connected Google Drive
- **File Import**: Import files from Google Drive to local storage
- **Dataroom Management**: Organize files into separate datarooms
- **File Management**: View, download, and delete imported files
- **Token Refresh**: Automatic access token refresh for seamless experience

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API communication
- **Lucide React** for icons

### Backend
- **Flask** - Python web framework
- **Flask-SQLAlchemy** - ORM for database operations
- **Flask-Migrate** - Database migrations with Alembic
- **PostgreSQL** - Database (SQLite supported for development)
- **PyJWT** - JWT token handling
- **Google APIs** - Drive API integration

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │────▶│     Backend     │────▶│   Google APIs   │
│   (React SPA)   │◀────│    (Flask)      │◀────│  (OAuth/Drive)  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   + File Store  │
                        └─────────────────┘
```

### Key Design Decisions

1. **Backend-owned OAuth**: All OAuth flows and token management happen on the backend. The frontend never sees Google refresh tokens, only receives a signed JWT session token.

2. **Lazy Token Refresh**: Access tokens are refreshed on-demand when they're close to expiry, rather than on a schedule.

3. **Structured File Storage**: Files are stored on disk in `data/{user_id}/{dataroom_id}/{uuid}`. The database stores paths and metadata, allowing easy migration to cloud storage (S3/GCS) later.

4. **Logical Deletes**: Files can be marked as deleted while keeping records for audit purposes.

## Database Schema

```sql
-- Users table
users (id, email, name, created_at, updated_at)

-- OAuth accounts linked to users
oauth_accounts (id, user_id, provider, provider_account_id, 
                access_token, refresh_token, expires_at, scope)

-- Datarooms for organizing files
datarooms (id, user_id, name, description, created_at, updated_at)

-- Imported files
files (id, dataroom_id, user_id, google_file_id, name, mime_type, 
       size_bytes, storage_path, original_url, status, imported_at)
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL (or Docker)
- Google Cloud Console project with OAuth credentials

### 1. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Google Drive API**
4. Go to **Credentials** → Create **OAuth 2.0 Client ID**
5. Set application type to **Web application**
6. Add authorized redirect URI: `http://localhost:5000/auth/google/callback`
7. Copy the Client ID and Client Secret

### 2. Start PostgreSQL

Using Docker:
```bash
cd dataroom-app
docker-compose up -d
```

Or install PostgreSQL locally and create a database:
```bash
createdb dataroom
```

### 3. Set Up Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file and configure
cp env.example .env
# Edit .env with your Google credentials and database URL

# Initialize database
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Run the server
flask run --port 5000
```

Backend will be available at http://localhost:5000

### 4. Set Up Frontend

```bash
cd frontend

# Install dependencies
npm install

# Copy environment file
cp env.example .env

# Run development server
npm run dev
```

Frontend will be available at http://localhost:5173

## Environment Variables

### Backend (.env)

```env
# Flask
SECRET_KEY=your-secret-key-change-in-production
FLASK_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/dataroom

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback

# Frontend
FRONTEND_ORIGIN=http://localhost:5173

# Storage
STORAGE_PATH=./data

# JWT
JWT_SECRET=your-jwt-secret-change-in-production
JWT_EXPIRY_HOURS=24
```

### Frontend (.env)

```env
VITE_BACKEND_URL=http://localhost:5000
```

## API Endpoints

### Authentication
- `GET /auth/google/start` - Start Google OAuth flow
- `GET /auth/google/callback` - OAuth callback handler
- `GET /auth/me` - Get current user info
- `POST /auth/logout` - Logout

### Google Drive
- `GET /api/drive/files` - List files from Google Drive

### Datarooms
- `GET /api/datarooms` - List all datarooms
- `POST /api/datarooms` - Create a new dataroom
- `GET /api/datarooms/:id` - Get dataroom details
- `PUT /api/datarooms/:id` - Update dataroom
- `DELETE /api/datarooms/:id` - Delete dataroom
- `GET /api/datarooms/:id/files` - List files in dataroom

### Files
- `POST /api/files/import` - Import file from Google Drive
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

## Error Handling

The API returns structured error responses:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

Common error codes:
- `UNAUTHORIZED` - Missing or invalid authentication
- `OAUTH_REVOKED` - Google access was revoked, user needs to reconnect
- `NOT_FOUND` - Resource not found
- `VALIDATION_ERROR` - Invalid request data
- `GOOGLE_NOT_CONNECTED` - User hasn't connected Google account

## Security Considerations

- All secrets stored in environment variables, never in code
- Backend validates resource ownership for every request
- Google refresh tokens never exposed to frontend
- JWT tokens used for session management with configurable expiry
- Only Google Drive read-only scope requested
- CORS configured to only allow frontend origin

## Trade-offs & Future Improvements

### Current Limitations
- **SQLite for development**: While simpler, PostgreSQL is recommended for production
- **Local file storage**: Files stored on disk, not suitable for distributed deployments

### Future Improvements
- Replace local storage with S3/GCS for scalable file storage
- Add full-text search over imported file contents
- Support bulk import with background processing
- Add multi-user permissions and sharing
- Implement CSRF protection with httpOnly cookies
- Add rate limiting on sensitive endpoints
- Support more OAuth providers

## Project Structure

```
dataroom-app/
├── backend/
│   ├── app/
│   │   ├── __init__.py       # Flask app factory
│   │   ├── config.py         # Configuration
│   │   ├── models.py         # Database models
│   │   ├── auth.py           # JWT authentication
│   │   ├── google_client.py  # Google API client
│   │   ├── storage.py        # File storage utilities
│   │   ├── main.py           # App entry point
│   │   └── routes/
│   │       ├── auth_routes.py
│   │       ├── drive_routes.py
│   │       ├── dataroom_routes.py
│   │       └── file_routes.py
│   ├── migrations/           # Database migrations
│   ├── requirements.txt
│   └── env.example
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── types.ts
│   │   ├── api/
│   │   │   └── client.ts     # API client
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── AuthCallbackPage.tsx
│   │   │   ├── DataroomsPage.tsx
│   │   │   └── DataroomDetailPage.tsx
│   │   └── components/
│   │       ├── Navbar.tsx
│   │       ├── CreateDataroomModal.tsx
│   │       └── DriveFilePickerModal.tsx
│   ├── package.json
│   └── env.example
├── docker-compose.yml        # PostgreSQL setup
├── data/                     # File storage directory
└── README.md
```

## License

MIT

