# MovieMate

A group movie decision app where friends swipe on movies Tinder-style to find what everyone wants to watch.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Testing | Jest, Supertest |
| DevOps | Docker, Docker Compose |

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/moviemate.git
cd moviemate

# Install backend dependencies
cd backend
npm install
```

### 2. Start Database

```bash
# From root directory
docker-compose up -d
```

### 3. Set Up Database Schema

```bash
# Connect to database and run schema
docker exec -it moviemate-db psql -U postgres -d moviemate -f /dev/stdin < backend/src/db/schema.sql
```

Or manually:
```bash
docker exec -it moviemate-db psql -U postgres -d moviemate
# Then paste contents of backend/src/db/schema.sql
```

### 4. Start Backend

```bash
cd backend
npm run dev
```

API will be running at `http://localhost:5000`

### 5. Run Tests

```bash
cd backend
npm test
```

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Rooms
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/rooms` | Create a room |
| POST | `/api/rooms/join` | Join with code |
| GET | `/api/rooms` | Get user's rooms |
| GET | `/api/rooms/:id` | Get room details |
| GET | `/api/rooms/:id/members` | Get members |
| PATCH | `/api/rooms/:id/status` | Update status |
| DELETE | `/api/rooms/:id/leave` | Leave room |

## Project Structure

```
/moviemate
├── docker-compose.yml
├── /backend
│   ├── /src
│   │   ├── /config        # Database config
│   │   ├── /controllers   # Route handlers
│   │   ├── /services      # Business logic
│   │   ├── /middleware    # Auth middleware
│   │   ├── /routes        # API routes
│   │   └── /db            # Schema
│   └── /tests             # Jest tests
└── /frontend              # Next.js app (coming soon)
```

## License

MIT
