# FA Tickets - Event Ticketing System

A full-stack event ticketing and check-in management system built with React (TypeScript), FastAPI, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** (recommended) or local PostgreSQL installation
- **Node.js 18+** (for frontend development)
- **Python 3.11+** (if running backend locally)

### Option 1: Docker Compose (Recommended)

This is the easiest way to get everything running:

```bash
# 1. Clone and navigate to the project
cd fa-tickets

# 2. Create environment file
cp .env.example .env
# Edit .env if needed (default values work for Docker)

# 3. Start all services (database + backend)
docker compose up --build

# 4. In a new terminal, start the frontend
cd frontend
npm install
npm run dev
```

**Access the application:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

### Option 2: Local Development Setup

For active backend development, you might prefer running the backend locally:

#### 1. Setup Environment

```bash
# Create environment file
cp .env.example .env
```

Edit `.env` and set:
```env
DATABASE_URL=postgresql+psycopg://app:app@localhost:5432/fa_tickets
BACKEND_PORT=8000
# AUTH_TOKEN=your-secret-token  # Optional: uncomment to enable auth
# VITE_API_TOKEN=your-secret-token  # Must match AUTH_TOKEN if using auth
```

#### 2. Start PostgreSQL Database

```bash
# Start only the database with Docker
docker compose up db -d
```

Or use a local PostgreSQL installation and create the database:
```sql
CREATE DATABASE fa_tickets;
CREATE USER app WITH PASSWORD 'app';
GRANT ALL PRIVILEGES ON DATABASE fa_tickets TO app;
```

#### 3. Setup and Run Backend

```bash
# Use the provided script (recommended)
./scripts/run_local_backend.sh
```

Or manually:
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Load environment variables
export $(grep -v '^#' ../.env | xargs)

# Run database migrations
alembic -c alembic.ini upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```

#### 4. Setup and Run Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📊 Database Management

### Seed Sample Data

After setting up the backend, you can seed the database with sample events and tickets:

**With Docker:**
```bash
docker compose exec app python -m app.db.seed
```

**Local backend:**
```bash
cd backend
source .venv/bin/activate
python -m app.db.seed
```

### Database Migrations

The system uses Alembic for database migrations:

```bash
# Apply migrations (Docker)
docker compose exec app alembic -c alembic.ini upgrade head

# Apply migrations (Local)
cd backend
source .venv/bin/activate
alembic -c alembic.ini upgrade head

# Create new migration (after model changes)
alembic -c alembic.ini revision --autogenerate -m "Description of changes"
```

### Reset Database (Development Only)

**Docker:**
```bash
docker compose down -v  # Removes volumes
docker compose up --build
```

**Local:**
```bash
# Drop and recreate database, then run migrations
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql+psycopg://app:app@localhost:5432/fa_tickets

# Backend Configuration
BACKEND_PORT=8000

# Authentication (Optional)
# Uncomment to enable simple token-based authentication
# AUTH_TOKEN=your-secret-token-here
# VITE_API_TOKEN=your-secret-token-here  # Must match AUTH_TOKEN
```

### Email

The backend supports multiple email transports. For SendGrid, add to `.env`:

```env
# Prefer SendGrid when API key is present
EMAIL_TRANSPORT=sendgrid
SENDGRID_API_KEY=your-sendgrid-api-key
EMAIL_FROM=noreply@example.com
# Ensure links in emails and preview point to your app origin
PUBLIC_APP_ORIGIN=https://your-frontend.example.com
VITE_PUBLIC_APP_ORIGIN=https://your-frontend.example.com
```

You can send a test email via the API:

- `POST /test_email?to=you@example.com`

If `EMAIL_TRANSPORT` is not set but `SENDGRID_API_KEY` is present, the backend defaults to SendGrid automatically. Otherwise it falls back to a console printout.

### Authentication

The system supports optional simple token-based authentication:

1. Set `AUTH_TOKEN` in `.env` to enable backend authentication
2. Set `VITE_API_TOKEN` in `.env` to the same value for frontend to authenticate automatically
3. When enabled, all API endpoints (except `/` and `/health`) require the `X-Auth-Token` header

## 🏗️ Architecture

### Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: FastAPI + SQLAlchemy + Alembic
- **Database**: PostgreSQL 16
- **Containerization**: Docker + Docker Compose

### Project Structure

```
fa-tickets/
├── frontend/                 # React TypeScript frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Page components
│   │   └── lib/api/        # API client
│   └── package.json
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Configuration
│   │   ├── db/             # Database models & migrations
│   │   ├── services/       # Business logic
│   │   └── schemas/        # Pydantic schemas
│   └── requirements.txt
├── scripts/                # Development scripts
├── compose.yaml           # Docker Compose configuration
└── .env                  # Environment variables
```

## 🎫 Core Features

### Event Management
- Create and manage events
- Set up ticket types and pricing
- Generate tickets with unique codes

### Ticket Assignment
- Assign tickets to customers
- Generate unique 3-digit check-in codes per event
- Send confirmation emails (printed to console in development)

### Check-in System
- Quick check-in using 3-digit codes
- Real-time attendance tracking
- Prevents duplicate check-ins

### Reporting
- Export attendance data as JSON or CSV
- Reconciliation reports
- Real-time event statistics

## 🛠️ Development

### Available Scripts

**Frontend:**
```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
```

**Backend:**
```bash
uvicorn app.main:app --reload  # Start development server
alembic revision --autogenerate -m "message"  # Create migration
alembic upgrade head                           # Apply migrations
python -m app.db.seed                         # Seed sample data
```

**Docker:**
```bash
docker compose up --build     # Start all services
docker compose down -v        # Stop and remove volumes
docker compose logs app       # View backend logs
```

### API Documentation

When the backend is running, visit:
- **Interactive docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔍 Troubleshooting

### Common Issues

**Backend won't start:**
- Ensure PostgreSQL is running and accessible
- Check DATABASE_URL in `.env`
- Verify all environment variables are set correctly

**Frontend can't connect to backend:**
- Ensure backend is running on port 8000
- Check Vite proxy configuration in `vite.config.ts`
- Verify CORS settings if accessing from different origin

**Database connection issues:**
- Check if PostgreSQL is running: `docker compose ps`
- Verify database credentials match between `.env` and `compose.yaml`
- Try restarting the database: `docker compose restart db`

**Docker issues:**
- If containers fail to start, try: `docker compose down -v && docker compose up --build`
- For permission issues on macOS/Linux: ensure Docker has proper file access permissions
- Check Docker logs: `docker compose logs`

### Development Tips

1. **Hot Reload**: Both frontend (Vite) and backend (uvicorn --reload) support hot reloading
2. **Database Changes**: After modifying models, create and apply migrations
3. **API Testing**: Use the automatic API docs at `/docs` for testing endpoints
4. **Logging**: Backend logs are visible in the terminal or via `docker compose logs app`

## 📝 License

This project is for internal use. Please check with the project maintainers for usage guidelines.
