# Phase 0 — Skeleton & Docker Compose

## What We Did

Phase 0 is the foundation. Before writing any business logic, we set up the entire project skeleton so that every service can be built and started with a single `docker-compose up --build` command.

## Why This Matters

In a real system design interview or production system, you'd never jump straight into coding a Trie or a cache. You'd first make sure:

1. **Every service can start independently** — Each service has its own Dockerfile and can be built in isolation.
2. **Services can talk to each other** — They're on the same Docker network (`typeahead-net`) and can resolve each other by service name (e.g., `cache-node-1:3002`).
3. **Health checks work** — Docker Compose won't start dependent services until their dependencies are healthy. The backend waits for all 3 cache nodes; the frontend waits for the backend.
4. **The development workflow is smooth** — One command to build, one command to tear down. No manual setup.

## What Each Service Does Right Now

| Service | What It Does (Phase 0) |
|---------|----------------------|
| **Frontend** | Serves a static page (placeholder) |
| **Backend** | Returns `{ status: 'ok' }` on `/health` |
| **Cache Nodes (×3)** | Return `{ status: 'ok', node: NODE_ID }` on `/health`, stub GET/SET/DEL endpoints |

None of them do any real work yet — and that's the point. Phase 0 proves the **infrastructure** works before we build the **application**.

## Key Design Choices

- **3 Cache Nodes**: We're simulating a distributed cache ring. In later phases, the backend will use consistent hashing to route keys across these nodes.
- **SQLite over Postgres**: For a local demo system, SQLite is simpler (no separate database container) and the data volume is small enough that it's not a bottleneck.
- **Express for Everything**: Both backend and cache nodes use Express. It keeps the stack uniform and simple.
- **Alpine Docker Images**: `node:20-alpine` keeps image sizes small (~50MB vs ~350MB for the full image).

## What's Next (Phase 1)

Phase 1 will implement the **Trie data structure** in the backend and wire up the search endpoint. The backend will:

1. Load terms from SQLite on startup
2. Build an in-memory Trie
3. Expose `GET /api/suggest?q=<prefix>` that returns the top-k matches
