# Task Management API

A production-ready RESTful API for task management with multi-user support, built with TypeScript, Fastify, PostgreSQL, and Prisma.

## Features

- **Task Management**: Full CRUD operations for tasks with status tracking (TODO, IN_PROGRESS, DONE, ARCHIVED)
- **Multi-User Support**: Complete user isolation with authorization middleware
- **Clean Architecture**: Repository pattern with separated layers (Routes, Services, Repositories)
- **Type Safety**: Full TypeScript implementation with Prisma ORM
- **Request Validation**: JSON Schema validation with Fastify
- **Error Handling**: Structured error responses with appropriate HTTP status codes
- **Structured Logging**: Request/response logging with Pino
- **Rate Limiting**: Built-in API rate limiting
- **Dockerized**: Multi-stage Docker build with docker-compose setup
- **Database Migrations**: Prisma migrations with seed data

## Tech Stack

- **Runtime**: Node.js 20
- **Framework**: Fastify 5.x
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5.x
- **Language**: TypeScript 5.x
- **Logging**: Pino
- **Testing**: Vitest
- **Containerization**: Docker & Docker Compose

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

## Quick Start with Docker

The easiest way to run the application:

```bash
# Clone the repository
git clone <repository-url>
cd engineering-interivew-be

# Start with Docker Compose (includes PostgreSQL + API)
docker-compose up --build

# The API will be available at http://localhost:3000
```

The database will be automatically seeded with test users and tasks.

### What Happens During Startup

When you run `docker compose up --build`, the following happens automatically:

1. **PostgreSQL** database starts and waits for health check
2. **App container** builds TypeScript code into JavaScript using multi-stage Docker build
3. **Database migrations** are applied - `npx prisma migrate deploy` runs existing migrations from `prisma/migrations/`
4. **Database seeding** - Sample users and tasks are created automatically
5. **Server starts** - API is available at http://localhost:3000

**Important**: Migrations are already included in the repository. You do **NOT** need to run migrations manually before starting Docker Compose.

## Database Migrations

### Understanding the Migration System

This project uses Prisma migrations with two different commands:

**Development (Local Machine)**
```bash
npx prisma migrate dev --name migration_name
```
- **Purpose**: Creates NEW migration files when you modify `prisma/schema.prisma`
- **Usage**: Only when developing locally and changing the database schema
- **Result**: Generates files in `prisma/migrations/` that should be committed to git

**Production (Docker Container)**
```bash
npx prisma migrate deploy
```
- **Purpose**: Applies EXISTING migrations from `prisma/migrations/` directory
- **Usage**: Automatically run during Docker startup
- **Result**: Updates database schema without creating new migration files

### For First-Time Setup

**The migrations are already included in this repository** (see `prisma/migrations/` directory). When you run `docker compose up`, they are automatically applied - no manual migration setup needed.

### Creating New Migrations (When Modifying Schema)

If you need to change the database schema:

```bash
# 1. Start PostgreSQL database only
docker compose up -d postgres

# 2. Modify prisma/schema.prisma with your changes

# 3. Create migration locally
npx prisma migrate dev --name descriptive_migration_name

# 4. Commit the new migration files
git add prisma/migrations/
git commit -m "Add migration: descriptive_migration_name"

# 5. Restart Docker to apply new migration
docker compose down
docker compose up --build
```

**Note**: The migration files in `prisma/migrations/` must exist before running Docker Compose, otherwise you'll get "table does not exist" errors.

## Local Development Setup

For local development without Docker:

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

```bash
cp .env.example .env
# Edit .env with your database connection string
```

### 3. Start PostgreSQL

```bash
# Using Docker
docker run -d \
  --name task-postgres \
  -e POSTGRES_USER=taskuser \
  -e POSTGRES_PASSWORD=taskpass \
  -e POSTGRES_DB=taskdb \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Setup Database Schema

```bash
# Generate Prisma client
npm run db:generate

# Apply migrations (uses existing migrations from prisma/migrations/)
npx prisma migrate deploy

# OR create initial migration if starting fresh (only needed once)
# npx prisma migrate dev --name init

# Seed database with test data
# This will build the TypeScript code and run the compiled seed file
npm run db:seed
```

**Note**: The `npm run db:seed` command automatically compiles TypeScript to JavaScript before running the seed. This ensures consistency between local development and Docker environments, which both use the compiled `dist/prisma/seed.js` file.

### 5. Start Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000`.

## API Documentation

### Base URL

```
http://localhost:3000/api
```

### Authentication

This simplified API uses user identification via:
- **Header**: `x-user-id: <user-uuid>`
- **Query Parameter**: `?userId=<user-uuid>` (fallback)

In production, this would be replaced with JWT-based authentication.

### Endpoints

#### Health Check

```http
GET /health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

#### Create User (For Testing)

```http
POST /api/users
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "John Doe"
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### Get User

```http
GET /api/users/:id
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### List Tasks

```http
GET /api/tasks
x-user-id: <user-uuid>

# Optional query parameters
?status=TODO          # Filter by status (TODO, IN_PROGRESS, DONE, ARCHIVED)
```

Response (200):
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Complete project",
      "description": "Finish the task management API",
      "status": "IN_PROGRESS",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

#### Create Task

```http
POST /api/tasks
x-user-id: <user-uuid>
Content-Type: application/json

{
  "title": "New task",
  "description": "Task description (optional)",
  "status": "TODO"  // Optional, defaults to TODO
}
```

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "New task",
    "description": "Task description",
    "status": "TODO",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### Get Specific Task

```http
GET /api/tasks/:id
x-user-id: <user-uuid>
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Complete project",
    "description": "Finish the task management API",
    "status": "IN_PROGRESS",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### Update Task

```http
PATCH /api/tasks/:id
x-user-id: <user-uuid>
Content-Type: application/json

{
  "title": "Updated title",         // Optional
  "description": "Updated desc",    // Optional
  "status": "DONE"                  // Optional
}
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426655440000",
    "title": "Updated title",
    "description": "Updated desc",
    "status": "DONE",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.001Z"
  }
}
```

---

#### Archive Task

```http
POST /api/tasks/:id/archive
x-user-id: <user-uuid>
```

Response (200):
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426655440000",
    "title": "Complete project",
    "description": "Finish the task management API",
    "status": "ARCHIVED",
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.001Z"
  }
}
```

---

#### Delete Task

```http
DELETE /api/tasks/:id
x-user-id: <user-uuid>
```

Response (204 No Content)

---

### Error Responses

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}  // Optional additional details
  }
}
```

**Common Error Codes:**

- `400` - Validation Error
- `401` - Unauthorized (Missing or invalid user ID)
- `403` - Forbidden (Attempting to access another user's resource)
- `404` - Not Found
- `409` - Conflict (e.g., email already exists)
- `429` - Too Many Requests (Rate limit exceeded)
- `500` - Internal Server Error

## Testing with cURL

After seeding the database, you can use these example commands (replace `<user-id>` with actual UUID from seed output):

```bash
# Get seeded user IDs from docker logs
docker logs task-api-app | grep "User"

# Create a new task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-uuid>" \
  -d '{
    "title": "Test task",
    "description": "Testing the API"
  }'

# List all tasks for user
curl http://localhost:3000/api/tasks \
  -H "x-user-id: 55e7963c-d0cb-4155-92a8-0c32788a698d"

# Filter tasks by status
curl "http://localhost:3000/api/tasks?status=TODO" \
  -H "x-user-id: <user-uuid>"

# Update a task
curl -X PATCH http://localhost:3000/api/tasks/<task-id> \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-uuid>" \
  -d '{
    "status": "DONE"
  }'

# Archive a task
curl -X POST http://localhost:3000/api/tasks/<task-id>/archive \
  -H "x-user-id: <user-uuid>"

# Delete a task
curl -X DELETE http://localhost:3000/api/tasks/<task-id> \
  -H "x-user-id: <user-uuid>"
```

## Architecture

### Project Structure

```
src/
├── config/          # Configuration management
├── middlewares/     # Custom middleware (auth)
├── plugins/         # Fastify plugins (error handler)
├── repositories/    # Data access layer
├── routes/          # API route handlers
├── services/        # Business logic layer
├── types/           # TypeScript type definitions
├── utils/           # Helper functions (errors, database)
├── validators/      # Request validation schemas
└── server.ts        # Main application entry point
```

### Design Patterns

**Repository Pattern**: Separates data access from business logic
- `repositories/` - Database queries and operations
- `services/` - Business logic and authorization
- `routes/` - HTTP request/response handling

**Error Handling**: Custom error classes with global error handler
- Consistent error responses
- Proper HTTP status codes
- Development vs production error details

**Validation**: JSON Schema with Fastify's built-in validation
- Type-safe validation
- Automatic error responses
- Clear validation messages

## Testing

This project includes comprehensive tests using Vitest:

### Test Types

**Unit Tests** - Test individual functions and utilities
- `src/utils/errors.test.ts` - Custom error classes
- `src/validators/task.test.ts` - Request validation schemas

**Integration Tests** - Test full API endpoints with real database
- `src/routes/task.routes.integration.test.ts` - Complete task API testing

### Running Tests

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm test -- --run

# Run tests with coverage report
npm run test:coverage

# Run only integration tests
npm test -- task.routes.integration

# Run only unit tests
npm test -- errors.test validators.test
```

### Test Coverage

Current test coverage includes:
- ✅ **53 passing tests** across all test suites
- ✅ **26 integration tests** for task API endpoints
- ✅ **100% coverage** for error utilities and validators
- ✅ **96% coverage** for task service layer
- ✅ Full CRUD operations with authorization
- ✅ Status transitions and edge cases

### Integration Test Features

The integration tests (src/routes/task.routes.integration.test.ts) validate:

**Create Tasks**
- Creating tasks with full data
- Creating tasks with minimal data (title only)
- Validation errors (missing required fields)
- Authentication requirements

**List Tasks**
- Fetching all user tasks
- Filtering by status (TODO, IN_PROGRESS, DONE, ARCHIVED)
- User isolation (users can't see other users' tasks)

**Get Task by ID**
- Fetching specific tasks
- Authorization checks (403 for other users' tasks)
- Not found handling (404)
- UUID validation (400 for invalid format)

**Update Tasks**
- Updating title, description, status
- Partial updates (only changed fields)
- Authorization enforcement
- Not found handling

**Archive Tasks**
- Archiving via dedicated endpoint
- Status changes to ARCHIVED
- Authorization checks

**Delete Tasks**
- Successful deletion (204 response)
- Authorization checks (403 forbidden)
- Verification of actual deletion

**Status Transitions**
- Full lifecycle: TODO → IN_PROGRESS → DONE → ARCHIVED

### Prerequisites for Running Tests

1. **PostgreSQL must be running** (via Docker Compose or locally)
   ```bash
   docker compose up -d postgres
   ```

2. **Database must be migrated**
   ```bash
   npx prisma migrate deploy
   ```

3. **Environment variables** (.env file should exist)
   ```bash
   DATABASE_URL="postgresql://taskuser:taskpass@localhost:5432/taskdb"
   ```

Note: Integration tests use the same database as development. Tests clean up after themselves but run `cleanDatabase()` between test suites.

## Scripts

```bash
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm start                # Start production server
npm test                 # Run tests in watch mode
npm test -- --run        # Run tests once (CI mode)
npm run test:coverage    # Run tests with coverage report
npm run lint             # Lint TypeScript files
npm run format           # Format code with Prettier
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run database migrations
npm run db:push          # Push schema changes to database
npm run db:seed          # Build and seed database (compiles TS then runs seed)
```

**Note on Seeding**: The seed command (`npm run db:seed`) compiles TypeScript before seeding to maintain consistency between local development and Docker production environments. Both use the compiled JavaScript file (`dist/prisma/seed.js`).

## Production Considerations

### What's Implemented

- Clean, layered architecture
- Type-safe code with TypeScript
- Request validation
- Error handling with appropriate status codes
- Authorization (simplified)
- Structured logging
- Rate limiting
- Docker containerization
- Database migrations
- Seed data for testing

### Trade-offs & Future Improvements

Given the 3-4 hour time constraint, several production features were simplified or omitted:

**Authentication** (Simplified)
- Current: Simple user ID via header
- Production: JWT tokens with refresh tokens, password hashing, OAuth2 support

**Database** (Basic Setup)
- Current: Single PostgreSQL instance
- Production: Connection pooling, read replicas, query optimization

**Caching** (Not Implemented)
- Production: Redis for session management and frequently accessed data

**Observability** (Basic)
- Current: Pino logging
- Production: Metrics (Prometheus), distributed tracing (Jaeger), APM

**Security** (Basic)
- Current: Rate limiting, input validation
- Production: CORS configuration, helmet security headers, CSRF protection, SQL injection prevention with parameterized queries

**Testing** (Minimal)
- Current: Test structure setup
- Production: Comprehensive unit tests, integration tests, E2E tests, >80% coverage

**API Features** (Basic)
- Current: Simple CRUD operations
- Production: Pagination, advanced filtering, sorting, bulk operations, search

**Documentation** (Manual)
- Current: Markdown README
- Production: OpenAPI/Swagger auto-generated docs with interactive UI

**CI/CD** (Not Implemented)
- Production: GitHub Actions for linting, testing, building, deploying

**Monitoring** (Not Implemented)
- Production: Health checks, performance monitoring, error tracking (Sentry)

## License

ISC
