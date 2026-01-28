# Local Postgres (Recommended)

This repo supports Postgres for the backend via `DATABASE_URL`. Using Postgres locally keeps your dev environment aligned with production and avoids SQLite/native-module issues.

## Prereqs

- Docker Desktop (or Docker Engine)

## 1) Start Postgres

From the repo root:

```bash
docker compose up -d postgres
```

Verify it’s healthy:

```bash
docker compose ps
```

## 2) Configure backend `.env`

In `backend/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/joga_analytics
```

## 3) Run migrations

```bash
cd backend
npm run migrate
```

## 4) Start the backend

```bash
cd backend
npm run dev
```

## Useful commands

- Stop Postgres:

```bash
docker compose down
```

- Stop and wipe the database (DESTRUCTIVE):

```bash
docker compose down -v
```

