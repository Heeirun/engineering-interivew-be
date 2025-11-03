# Task Management API - Project Plan

## Project Overview
Building a production-ready RESTful API for task management with multi-user support, focusing on authorization, clean architecture, and comprehensive testing.

**Time Budget:** 3-4 hours  
**Tech Stack:** TypeScript, Node.js, Fastify, PostgreSQL, Prisma, Docker

---

## Phase 1: Project Setup (30 minutes)

### 1.1 Initialize Project Structure
```
task-management-api/
├── src/
│   ├── config/          # Configuration management
│   ├── plugins/         # Fastify plugins
│   ├── routes/          # API route handlers
│   ├── services/        # Business logic layer
│   ├── repositories/    # Data access layer
│   ├── middlewares/     # Custom middlewares
│   ├── utils/           # Helper functions
│   ├── types/           # TypeScript types/interfaces
│   ├── validators/      # Request validation schemas
│   └── server.ts        # Fastify server setup
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Seed data for testing
├── tests/
│   ├── unit/
│   ├── integration/
│   └── setup.ts
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .dockerignore
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

### 1.2 Dependencies to Install
```json
{
  "dependencies": {
    "fastify": "^4.x",
    "@fastify/rate-limit": "^9.x",
    "@prisma/client": "^5.x",
    "pino": "^8.x",
    "pino-pretty": "^10.x",
    "dotenv": "^16.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "@types/node": "^20.x",
    "prisma": "^5.x",
    "vitest": "^1.x",
    "@vitest/coverage-v8": "^1.x",
    "tsx": "^4.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

### 1.3 Configuration Files
- **tsconfig.json**: Strict TypeScript configuration
- **.env.example**: Environment variables template
- **Docker setup**: Multi-stage build for optimization
- **ESLint/Prettier**: Code quality enforcement

---

## Phase 2: Database Design & Setup (30 minutes)

### 2.1 Prisma Schema Design

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tasks     Task[]

  @@map("users")
}

model Task {
  id          String     @id @default(uuid())
  title       String
  description String?
  status      TaskStatus @default(TODO)
  userId      String
  user        User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@index([userId])
  @@index([status])
  @@map("tasks")
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  DONE
  ARCHIVED
}
```

### 2.2 Database Considerations
- **Indexing**: On `userId` and `status` for query optimization
- **Cascade Delete**: Remove user's tasks when user is deleted
- **Timestamps**: Track creation and modification times
- **UUID**: For security (prevents enumeration attacks)

### 2.3 Seed Data
Create seed file with 2-3 mock users and sample tasks for testing

---

## Phase 3: Core API Implementation (90 minutes)

### 3.1 Server Setup (15 min)
- Configure Fastify instance with plugins
- Setup structured logging with Pino
- Add rate limiting
- Global error handler
- Request/Response logging

### 3.2 Authorization Middleware (15 min)
```typescript
// Middleware to extract and validate user identifier
// Accept userId via:
// 1. Header: x-user-id
// 2. Query param: userId (fallback)
// Validate user exists in database
// Attach user to request context
```

**Security Considerations:**
- Validate UUID format
- Verify user exists
- Return 401 for missing/invalid user
- Return 403 for unauthorized resource access

### 3.3 API Routes Implementation (60 min)

#### Task Routes
```
GET    /api/tasks              - List user's tasks (with status filter)
POST   /api/tasks              - Create new task
GET    /api/tasks/:id          - Get specific task
PATCH  /api/tasks/:id          - Update task (title, description, status)
DELETE /api/tasks/:id          - Delete task
POST   /api/tasks/:id/archive  - Archive task (convenience endpoint)
```

#### User Routes (Simplified)
```
GET    /api/users/:id          - Get user info (for testing)
POST   /api/users              - Create user (for testing)
```

### 3.4 Architecture Layers

**Controller Layer (Routes)**
- Handle HTTP concerns
- Request validation
- Response formatting
- Delegate to service layer

**Service Layer**
- Business logic
- Authorization checks
- Data transformation
- Error handling

**Repository Layer**
- Database operations
- Query building
- Data mapping

### 3.5 Request Validation
Use JSON Schema with Fastify's built-in validation:
```typescript
// Example schemas
const createTaskSchema = {
  body: {
    type: 'object',
    required: ['title'],
    properties: {
      title: { type: 'string', minLength: 1, maxLength: 200 },
      description: { type: 'string', maxLength: 2000 },
      status: { type: 'string', enum: ['TODO', 'IN_PROGRESS', 'DONE'] }
    }
  }
}
```

### 3.6 Error Handling Strategy
- Custom error classes (NotFoundError, UnauthorizedError, ValidationError)
- Consistent error response format
- Appropriate HTTP status codes
- No sensitive data in error messages (production)
- Structured error logging

---

## Phase 4: Testing (45 minutes)

### 4.1 Test Setup
- Configure Vitest with test database
- Setup test fixtures and factories
- Create test utilities for API requests
- Mock user authentication

### 4.2 Test Coverage

**Unit Tests** (20 min)
- Service layer logic
- Validation functions
- Utility functions
- Edge cases

**Integration Tests** (25 min)
- API endpoints (happy paths)
- Authorization enforcement
- Error scenarios
- Status transitions
- Cross-user isolation

### 4.3 Critical Test Cases
```
✓ Users can create tasks
✓ Users can list only their own tasks
✓ Users cannot access other users' tasks
✓ Users can update their own tasks
✓ Users can change task status
✓ Users can archive tasks
✓ Users cannot delete other users' tasks
✓ Invalid status transitions are rejected
✓ Validation errors return 400
✓ Missing user returns 401
✓ Unauthorized access returns 403
✓ Not found returns 404
```

---

## Phase 5: Docker Setup (20 minutes)

### 5.1 Dockerfile (Multi-stage)
```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 5.2 Docker Compose
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: taskuser
      POSTGRES_PASSWORD: taskpass
      POSTGRES_DB: taskdb
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://taskuser:taskpass@postgres:5432/taskdb
      NODE_ENV: production
    depends_on:
      postgres:
        condition: service_healthy
    command: sh -c "npx prisma migrate deploy && node dist/server.js"

volumes:
  postgres_data:
```

---

## Phase 6: Documentation & Polish (15 minutes)

### 6.1 README.md Sections
1. **Project Overview**: Brief description
2. **Features**: List key capabilities
3. **Tech Stack**: Technologies used
4. **Prerequisites**: Node, Docker requirements
5. **Quick Start**: 
   - Clone repo
   - Copy .env.example
   - `docker-compose up`
   - Access API at http://localhost:3000
6. **Development Setup**: Local development without Docker
7. **API Documentation**: Endpoint list with examples
8. **Testing**: How to run tests
9. **Architecture**: Brief explanation of design decisions
10. **Authorization**: How to use user identifiers
11. **Trade-offs**: What would be improved with more time

### 6.2 API Documentation Examples
```bash
# Create a task
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: <user-uuid>" \
  -d '{"title": "Complete project", "description": "Finish task API"}'

# List tasks
curl http://localhost:3000/api/tasks?status=TODO \
  -H "x-user-id: <user-uuid>"
```

---

## Phase 7: Extra Credit Features (If Time Permits)

### 7.1 Structured Logging (10 min)
- Request ID tracking
- Correlation IDs
- Structured log format
- Log levels by environment
- Performance metrics

### 7.2 Additional Enhancements
- **API Versioning**: `/api/v1/tasks`
- **Pagination**: Limit/offset for task lists
- **Filtering**: Multiple status filters, date ranges
- **Sorting**: By date, status, title
- **Health Check**: `/health` endpoint
- **Metrics**: Basic performance tracking
- **OpenAPI/Swagger**: Auto-generated docs

---

## Implementation Timeline

| Phase | Task | Time | Running Total |
|-------|------|------|---------------|
| 1 | Project Setup | 30 min | 30 min |
| 2 | Database Design | 30 min | 1h |
| 3 | Core API Implementation | 90 min | 2h 30min |
| 4 | Testing | 45 min | 3h 15min |
| 5 | Docker Setup | 20 min | 3h 35min |
| 6 | Documentation | 15 min | 3h 50min |
| 7 | Extra Credit (Buffer) | 10 min | 4h |

---

## Key Design Decisions

### 1. Authorization Approach
**Decision**: Simple user identifier via header  
**Rationale**: Focuses evaluation on authorization logic rather than auth boilerplate. Production would use JWT tokens.

### 2. Repository Pattern
**Decision**: Service + Repository layers  
**Rationale**: Separates business logic from data access, improves testability and maintainability.

### 3. Validation Strategy
**Decision**: JSON Schema with Fastify  
**Rationale**: Built-in, performant, type-safe with TypeScript integration.

### 4. Error Handling
**Decision**: Custom error classes with global handler  
**Rationale**: Consistent error responses, proper HTTP codes, security considerations.

### 5. Testing Approach
**Decision**: Integration tests over extensive unit tests  
**Rationale**: Given time constraint, integration tests provide better coverage of critical user flows.

---

## Production Considerations (Trade-offs)

### What's Simplified
- **Authentication**: No JWT/OAuth implementation
- **User Management**: Minimal user endpoints
- **Validation**: Basic validation (would add more edge cases)
- **Caching**: No Redis layer
- **Observability**: Basic logging (would add metrics, tracing)

### What Would Be Added
1. **Authentication**: JWT-based auth with refresh tokens
2. **Database Migrations**: Migration versioning strategy
3. **Rate Limiting**: Per-user limits
4. **API Documentation**: Full OpenAPI/Swagger spec
5. **Monitoring**: Prometheus metrics, health checks
6. **CI/CD**: GitHub Actions pipeline
7. **Security**: CORS configuration, Helmet security headers, input sanitization
8. **Performance**: Query optimization, connection pooling
9. **Audit Logging**: Track all data modifications
10. **Soft Deletes**: Archival strategy for compliance

---

## Risk Mitigation

### Potential Blockers
1. **Docker issues**: Test compose file early
2. **Prisma migration**: Verify schema before implementation
3. **Test database**: Setup separate test DB early
4. **Time overrun**: Prioritize core features, skip extras if needed

### Contingency Plan
- Core features first (Tasks CRUD + Authorization)
- Tests for critical paths only if time is tight
- Skip extra credit features if behind schedule
- Document trade-offs clearly in README

---

## Success Criteria

✅ All required API endpoints working  
✅ Authorization enforced (users isolated)  
✅ Validation on all inputs  
✅ Error handling with appropriate codes  
✅ Automated tests passing (>70% coverage)  
✅ Docker setup functional  
✅ Clear README with setup instructions  
✅ Clean, readable code  
✅ Proper TypeScript usage  
✅ Logging implemented  

---

## Final Checks Before Submission

- [ ] All tests passing
- [ ] Docker build succeeds
- [ ] `docker-compose up` works fresh
- [ ] README tested with clean environment
- [ ] Code formatted and linted
- [ ] No sensitive data in repo
- [ ] .env.example provided
- [ ] API examples in README work
- [ ] Trade-offs documented
- [ ] Git history clean and meaningful

---

## Estimated Effort Distribution

```
Core Implementation:  50%
Testing:             25%
Setup & Docker:      15%
Documentation:       10%
```

This plan balances production-ready code with pragmatic time management, demonstrating senior-level decision-making within the 3-4 hour constraint.
