# MyMovie

MyMovie is an English-language movie discovery application built with .NET 10, Domain-Driven Design, Angular 22, Angular Material, PostgreSQL, and Docker. Visitors can browse and search TMDB movies, inspect details and cast, while members can maintain a private watchlist and publish reviews. Administrators can moderate reviews with an audit reason.

## Architecture

The backend is a modular monolith with inward dependencies:

```text
MyMovie.Api -> MyMovie.Application -> MyMovie.Domain
                         ^                 ^
                         |                 |
                MyMovie.Infrastructure ----
```

The browser calls only the ASP.NET Core API. TMDB credentials remain on the server. PostgreSQL stores identity data, watchlists, reviews, moderation history, and movie detail snapshots. See [`specs`](specs/) for the complete requirements, design, task plan, and Codex implementation guide.

## Prerequisites

- .NET SDK 10.0.303 or a compatible newer .NET 10 feature band.
- Node.js 24 and npm 11 or a compatible Angular 22 toolchain.
- Docker Engine with Docker Compose v2+ for PostgreSQL and full-stack containers.
- A TMDB API read access token from the [TMDB developer portal](https://developer.themoviedb.org/docs/getting-started).

## Configuration

Copy `.env.example` to `.env` and replace the placeholder token. The file is ignored by source control.

```dotenv
TMDB_ACCESS_TOKEN=your-read-access-token
POSTGRES_PASSWORD=local-development-only
```

For host-based backend development, set the token without writing it to tracked configuration:

```powershell
dotnet user-secrets init --project backend/src/MyMovie.Api/MyMovie.Api.csproj
dotnet user-secrets set "Tmdb:AccessToken" "your-read-access-token" --project backend/src/MyMovie.Api/MyMovie.Api.csproj
```

## Local development with hot reload

Start PostgreSQL:

```powershell
docker compose --env-file .env -f deploy/compose/compose.yaml up -d database
```

Run the backend on the port expected by the Angular proxy:

```powershell
dotnet run --project backend/src/MyMovie.Api/MyMovie.Api.csproj --urls http://localhost:5080
```

In another terminal, restore and run Angular:

```powershell
cd frontend
npm ci
npm start
```

Open `http://localhost:4200`. The Angular development proxy keeps API calls same-origin from the application perspective.

## Full Docker stack

Build and start PostgreSQL, API, and the production Angular/Nginx image:

```powershell
docker compose --env-file .env -f deploy/compose/compose.yaml --profile full up --build -d
```

Open `http://localhost:4200`. API readiness is available through `http://localhost:4200/health/ready` and directly at `http://localhost:5080/health/ready` for local diagnostics.

Stop containers while preserving the developer database:

```powershell
docker compose --env-file .env -f deploy/compose/compose.yaml --profile full down
```

Deleting the named database volume is intentionally not part of the normal stop command.

## Database migrations

Restore the repository-pinned EF Core tool and create a migration after a reviewed model change:

```powershell
dotnet tool restore
dotnet tool run dotnet-ef migrations add DescriptiveName --project backend/src/MyMovie.Infrastructure/MyMovie.Infrastructure.csproj --startup-project backend/src/MyMovie.Api/MyMovie.Api.csproj --output-dir Persistence/Migrations
```

Local development and the full Compose profile apply committed migrations at startup. Production should run migrations once as a dedicated release job before application replicas are deployed.

## Verification

Backend:

```powershell
dotnet restore backend/MyMovie.slnx
dotnet build backend/MyMovie.slnx --no-restore
dotnet test backend/MyMovie.slnx --no-build
```

Frontend:

```powershell
cd frontend
npm ci
npm test
npx playwright install chromium
npm run e2e
npm run build
npm run format:check
```

Container configuration and images:

```powershell
docker compose --env-file .env -f deploy/compose/compose.yaml --profile full config
docker build -f deploy/docker/api.Dockerfile -t mymovie-api:local .
docker build -f deploy/docker/web.Dockerfile -t mymovie-web:local .
```

## API

The versioned API is rooted at `/api/v1`. Development OpenAPI is available at `/openapi/v1.json`. Errors use RFC 9457 Problem Details with stable `code` and `traceId` extensions. Authentication uses secure same-site cookies, and state-changing requests require the `X-XSRF-TOKEN` header issued by `GET /api/v1/auth/csrf`.

## Security notes

- Never place the TMDB token in Angular configuration, source control, logs, or a Docker image layer.
- Production must terminate TLS and inject secrets from the hosting platform's secret manager.
- Review content is plain text and is rendered through Angular's normal escaping.
- Container runtime images run as non-root and use read-only filesystems in Compose.
- Use a managed PostgreSQL service with encrypted connections, backups, and point-in-time recovery in production.
