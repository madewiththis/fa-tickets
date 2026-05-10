# Database Migration Guide

## Problem
Database migrations weren't running automatically when building the dev environment, resulting in empty databases.

## Solutions Implemented

### 1. Fixed Dockerfile (✅ Completed)
- Added `COPY alembic.ini /app/alembic.ini` to ensure the Alembic config is available in the container
- This was the primary issue preventing migrations from running

### 2. Improved Startup Migration Runner (✅ Completed)
- Enhanced error handling and logging in `app/main.py`
- Added path resolution for `alembic.ini` in different environments
- Better error messages to diagnose migration failures

### 3. Consolidated Migration (✅ Created)
- Created `20250101_0001_consolidated_initial.py` which contains the complete schema
- This is useful for fresh deployments where you don't need historical migration steps

### 4. Removed Duplicate Migration (✅ Completed)
- Deleted `20250925_0003_add_email_log.py` which conflicted with `20240925_0008_add_email_log.py`

## Usage Options

### Option A: Use Sequential Migrations (Recommended for existing databases)
This is the default approach. The startup script will run all migrations in order:
- `20240924_0001_initial.py`
- `20240924_0002_events_and_delivery_status.py`
- ... (through `20240925_0010_add_purchase_uuid.py`)

**When to use:**
- Existing databases that need incremental updates
- Production environments with data

### Option B: Use Consolidated Migration (✅ IMPLEMENTED - Automatic)
**This is now automatically implemented!** The startup script automatically detects fresh databases and uses the consolidated migration.

**How it works:**
- On app startup, the system checks if the database is fresh (no `alembic_version` table or empty)
- If fresh: Automatically applies the consolidated migration (`20250101_0001`)
- If existing: Runs sequential migrations to head as normal

**No manual intervention needed** - fresh deployments will automatically use the consolidated migration, while existing databases continue with sequential migrations.

**When it's used:**
- Fresh deployments with no existing data (automatic)
- New dev environments (automatic)
- Testing environments (automatic)

## Alternative Solutions

### Option C: Run Migrations in Dockerfile
Add migration step directly in Dockerfile (before CMD):

```dockerfile
# After COPY commands
RUN alembic upgrade head
```

**Pros:** Migrations run at build time
**Cons:** Requires database connection during build (not ideal for multi-stage builds)

### Option D: Use Init Container (Kubernetes/Docker Compose)
Create a separate init container that runs migrations:

```yaml
# In compose.yaml
migrate:
  build:
    context: ./backend
  command: alembic upgrade head
  depends_on:
    db:
      condition: service_healthy
  environment:
    DATABASE_URL: postgresql+psycopg://app:app@db:5432/fa_tickets
```

**Pros:** Clear separation of concerns, migrations run before app starts
**Cons:** Requires additional container/service

### Option E: Use Entrypoint Script
Create an entrypoint script that runs migrations before starting the app:

```bash
#!/bin/bash
set -e
alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Pros:** Simple, ensures migrations always run
**Cons:** Requires script management

## Recommended Approach for Dev Environment

For your dev environment, the current setup (Option A with fixed Dockerfile) should work. The startup migration runner will:

1. Wait for database to be healthy (via `depends_on` in compose.yaml)
2. Run migrations automatically on app startup
3. Log success/failure clearly

## Troubleshooting

### Migrations not running?
1. Check that `alembic.ini` is in the container: `docker exec <container> ls -la /app/alembic.ini`
2. Check logs: `docker logs <container>` for migration errors
3. Verify database connection: Check `DATABASE_URL` environment variable
4. Check Alembic version table: `SELECT * FROM alembic_version;` in database

### Want to reset and use consolidated migration?
```bash
# 1. Drop and recreate database
# 2. Run consolidated migration
alembic upgrade 20250101_0001

# Or stamp it if you want to mark it as applied without running
alembic stamp 20250101_0001
```

## Migration Files Reference

Current migration chain:
- `20240924_0001` - Initial schema (event, customer, person, ticket_type, ticket)
- `20240924_0002` - Event location changes, delivery_status
- `20240924_0003` - Event promotion table
- `20240924_0004` - Event public_id
- `20240925_0005` - Contacts, purchases, ticket updates
- `20240925_0006` - Backfill contacts (data migration, safe to skip on fresh DB)
- `20240925_0007` - Ticket purchase FK
- `20240925_0008` - Email log table
- `20240925_0009` - Ticket status 'held' enum value
- `20240925_0010` - Purchase UUID column
- `20250101_0001` - **Consolidated initial** (all of the above in one)

