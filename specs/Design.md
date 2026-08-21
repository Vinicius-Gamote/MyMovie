# Movie Database App — Technical Design

## 1. Purpose and Status

This document describes how the requirements in `requirements.md` will be implemented. It is an initial design baseline and should be updated through architecture decision records when a material choice changes.

## 2. Design Goals

- Keep business rules independent from frameworks and vendors.
- Use Domain-Driven Design (DDD) boundaries without adding unnecessary distributed-system complexity.
- Protect provider credentials and user data.
- Make catalog browsing fast and resilient to upstream failures.
- Make the application independently testable at domain, application, infrastructure, API, and browser levels.
- Keep the first deployment simple: a modular monolith with one PostgreSQL database and one Angular single-page application.

## 3. Technology Baseline

The baseline reflects stable releases available when this specification was written in August 2026:

| Area | Choice | Policy |
| --- | --- | --- |
| Backend | .NET 10 LTS, ASP.NET Core 10, C# | Pin the .NET 10 feature band and consume current security patches. Reassess major upgrades through an ADR. |
| Data access | Entity Framework Core 10 with Npgsql | Keep provider versions compatible with the selected .NET and PostgreSQL versions. |
| Frontend | Angular 22 and TypeScript 6.0-compatible tooling | Use the latest stable patch versions; keep Angular core, CLI, CDK, and Material on the same major version. |
| UI | Angular Material 22 and Angular CDK | Use Material components, theming, icons, layout primitives, accessibility support, and motion. |
| Database | PostgreSQL | Use a currently supported stable major version selected by the deployment platform; pin the production image by major and patch policy. |
| Containers | Docker Engine and Docker Compose | Use Docker for reproducible local dependencies, disposable integration-test infrastructure, and production application images. Pin base images by supported major version and image digest in release builds. |
| API description | OpenAPI | Generate the contract from the HTTP API and validate breaking changes in CI. |
| Testing | xUnit, integration tests with real PostgreSQL, Angular unit tests, and Playwright | Prefer behavior-level tests and avoid mocking domain behavior. |
| Delivery | Docker images and CI/CD | Build, scan, sign where supported, and promote immutable Docker image digests; run migrations as an explicit deployment step. |

Version references:

- [.NET support policy](https://dotnet.microsoft.com/en-us/platform/support/policy)
- [Angular releases and support policy](https://angular.dev/reference/releases)
- [Angular version compatibility](https://angular.dev/reference/versions)

## 4. System Context

```text
Browser
  |
  | HTTPS / JSON
  v
Angular SPA  --->  ASP.NET Core HTTP API  --->  PostgreSQL
                         |
                         | HTTPS / provider credential
                         v
                      TMDB API
```

The Angular application communicates only with the application API. The ASP.NET Core API owns authentication, authorization, orchestration, local persistence, caching, and the TMDB integration. Direct browser-to-TMDB requests are prohibited because they would expose credentials and couple the UI to the provider contract.

## 5. Architecture Style

### 5.1 Deployment architecture

The backend is a modular monolith. A single deployable API process contains clearly separated domain modules. This provides transactional simplicity and operational economy while retaining boundaries that can support future extraction if scale or team ownership requires it.

Initial logical modules:

- **Catalog:** movie discovery, search, detail retrieval, provider mapping, and cache policy.
- **Identity:** accounts, authentication, roles, and account lifecycle.
- **Watchlists:** private movie selections owned by a member.
- **Reviews:** user ratings, review lifecycle, moderation, and audit trail.

### 5.2 DDD and dependency direction

Each backend module uses the following layers:

```text
HTTP/API -> Application -> Domain
               ^            ^
               |            |
          Infrastructure ----
```

- **Domain layer:** aggregates, entities, value objects, domain services, domain events, repository abstractions, specifications, and business-rule exceptions. It has no dependency on ASP.NET Core, EF Core, PostgreSQL, or TMDB.
- **Application layer:** use cases expressed as commands and queries, input validation, authorization policy invocation, transaction boundaries, DTO mapping, and ports such as `IMovieProvider` and repositories. It depends on Domain.
- **Infrastructure layer:** EF Core persistence, PostgreSQL mappings, ASP.NET Core Identity stores, distributed-cache implementation, TMDB client, time provider, telemetry exporters, and external service adapters. It implements Application or Domain ports.
- **API layer:** HTTP controllers, request and response contracts, authentication configuration, middleware, filters, Problem Details mapping, OpenAPI, dependency injection, health checks, and composition root. Controllers contain no business logic.

Cross-cutting building blocks must remain small and explicit. Modules should not share mutable domain entities or query one another's tables directly. Cross-module coordination occurs through application interfaces or domain events inside the same process.

## 6. Proposed Repository Structure

```text
MyMovie/
├─ backend/
│  ├─ src/
│  │  ├─ MyMovie.Api/
│  │  ├─ MyMovie.Application/
│  │  ├─ MyMovie.Domain/
│  │  └─ MyMovie.Infrastructure/
│  ├─ tests/
│  │  ├─ MyMovie.Domain.Tests/
│  │  ├─ MyMovie.Application.Tests/
│  │  ├─ MyMovie.Infrastructure.IntegrationTests/
│  │  └─ MyMovie.Api.IntegrationTests/
│  └─ MyMovie.slnx
├─ frontend/
│  ├─ src/app/
│  │  ├─ core/
│  │  ├─ shared/
│  │  ├─ layout/
│  │  └─ features/
│  │     ├─ catalog/
│  │     ├─ identity/
│  │     ├─ watchlist/
│  │     └─ reviews/
│  └─ e2e/
├─ deploy/
│  ├─ docker/
│  │  ├─ api.Dockerfile
│  │  ├─ web.Dockerfile
│  │  └─ nginx.conf
│  └─ compose/
│     ├─ compose.yaml
│     └─ compose.override.yaml
├─ .dockerignore
├─ specs/
└─ README.md
```

Projects are separated by responsibility, not by individual entity. Namespace and internal-access rules enforce layer boundaries. If the solution grows significantly, modules may later be split into vertical project sets without changing the HTTP contract.

## 7. Domain Model

### 7.1 Catalog

Catalog data is primarily external and read-oriented. The application stores a local cache snapshot rather than claiming ownership of the movie master record.

- `MovieReference` value object: `Provider`, `ProviderMovieId`.
- `MovieSnapshot`: normalized cached provider data and freshness metadata.
- `MovieRating`: provider score and vote count; distinct from a local review rating.
- `CastMemberSnapshot`: provider person ID, name, character, ordering, and profile path.

Catalog provider DTOs never leave Infrastructure. The adapter maps them into application read models.

### 7.2 Identity

- `ApplicationUser`: identity key, normalized email, display name, status, and audit timestamps.
- Roles: `Member` and `Administrator`.
- ASP.NET Core Identity manages credential hashing, lockout, token generation, and role storage.

Identity persistence is infrastructure-owned. Other domain modules refer to a user only through an immutable `UserId`.

### 7.3 Watchlists

- `Watchlist` aggregate root: `WatchlistId`, `OwnerUserId`, entries, and timestamps.
- `WatchlistEntry`: `MovieReference`, creation timestamp.

Invariants:

- A watchlist belongs to exactly one user.
- A movie may appear only once in a user's watchlist.
- All mutations require the owner identity.

### 7.4 Reviews

- `Review` aggregate root: `ReviewId`, `AuthorUserId`, `MovieReference`, `Rating`, `Text`, `Status`, version, and audit timestamps.
- `Rating` value object: integer from 1 through 10.
- `ReviewText` value object: trimmed plain text from 50 through 2,000 characters.
- `ReviewStatus`: `Published`, `Hidden`, or `Deleted`; add `Pending` only if pre-moderation is selected.
- `ModerationRecord`: action, administrator ID, reason, and timestamp.

Invariants:

- One active review per author and movie.
- Only the author can edit or delete a review.
- Only an administrator can hide or restore a review.
- Edits use optimistic concurrency.

## 8. Application Use Cases

Commands and queries are explicit application services or handlers. A mediator library is optional; application behavior must not depend on a particular dispatcher.

| Module | Queries | Commands |
| --- | --- | --- |
| Catalog | `GetLatestMovies`, `SearchMovies`, `GetMovieDetails` | `RefreshMovieSnapshot` (internal) |
| Identity | `GetCurrentUser` | `RegisterUser`, `SignIn`, `SignOut`, `DeactivateAccount` |
| Watchlists | `GetMyWatchlist`, `IsMovieInMyWatchlist` | `AddMovieToWatchlist`, `RemoveMovieFromWatchlist` |
| Reviews | `GetMovieReviews`, `GetMyReview` | `CreateReview`, `UpdateReview`, `DeleteReview`, `HideReview`, `RestoreReview` |

Every use case defines:

- An input contract.
- Validation and authorization rules.
- A transaction boundary when local state changes.
- A result type that distinguishes expected outcomes from faults.
- Unit or integration tests tied to requirement IDs.

## 9. HTTP API Design

### 9.1 Conventions

- Base path: `/api/v1`.
- JSON uses camelCase and UTF-8.
- All timestamps use ISO 8601 UTC values; dates use `YYYY-MM-DD`.
- Errors use RFC 9457 Problem Details with stable application error codes, `traceId`, and field-level validation details where applicable.
- List endpoints use a bounded page size and return pagination metadata.
- State-changing endpoints require authentication and anti-forgery protection when cookie authentication is used.
- `CancellationToken` propagates from the HTTP request to database and provider calls.
- OpenAPI is available in development and published as a build artifact for all environments.

### 9.2 Controller surface

Controllers use attribute routing and standard HTTP semantics:

| Method | Route | Access | Result |
| --- | --- | --- | --- |
| `GET` | `/api/v1/movies/latest?page={n}` | Public | Paged movie summaries |
| `GET` | `/api/v1/movies/search?query={q}&page={n}` | Public | Paged movie summaries |
| `GET` | `/api/v1/movies/{providerMovieId}` | Public | Movie details with cast |
| `POST` | `/api/v1/auth/register` | Public | Creates a member |
| `POST` | `/api/v1/auth/sign-in` | Public | Starts a session |
| `POST` | `/api/v1/auth/sign-out` | Member | Ends the session |
| `GET` | `/api/v1/users/me` | Member | Current user profile |
| `GET` | `/api/v1/watchlist` | Member | Current user's watchlist |
| `PUT` | `/api/v1/watchlist/movies/{providerMovieId}` | Member | Idempotently adds a movie |
| `DELETE` | `/api/v1/watchlist/movies/{providerMovieId}` | Member | Removes a movie |
| `GET` | `/api/v1/movies/{providerMovieId}/reviews?page={n}` | Public | Published reviews |
| `POST` | `/api/v1/movies/{providerMovieId}/reviews` | Member | Creates a review |
| `PUT` | `/api/v1/reviews/{reviewId}` | Owner | Updates a review |
| `DELETE` | `/api/v1/reviews/{reviewId}` | Owner | Soft-deletes a review |
| `POST` | `/api/v1/admin/reviews/{reviewId}/hide` | Administrator | Hides a review |
| `POST` | `/api/v1/admin/reviews/{reviewId}/restore` | Administrator | Restores a review |

Expected status codes include `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, and `503`. Controllers translate application results consistently rather than catching broad exceptions individually.

## 10. Persistence Design

### 10.1 Main tables

| Table | Important fields and constraints |
| --- | --- |
| `users` and identity tables | Identity-managed keys, normalized unique email, display name, status, audit timestamps |
| `watchlists` | ID, unique owner user ID, created and updated timestamps |
| `watchlist_entries` | ID, watchlist ID, provider, provider movie ID, created timestamp; unique `(watchlist_id, provider, provider_movie_id)` |
| `reviews` | ID, author user ID, provider, provider movie ID, rating check 1–10, text, status, row version, timestamps; filtered or policy-compatible uniqueness for active author/movie review |
| `review_moderation_records` | ID, review ID, administrator user ID, action, reason, timestamp |
| `movie_snapshots` | provider, provider movie ID, normalized JSON or columns, source update timestamp, fetched timestamp, stale-after timestamp; unique provider identity |
| `outbox_messages` | ID, event type, payload, occurrence and processing metadata, used only when durable post-commit work is introduced |

Use lower-case snake_case database identifiers. Foreign keys use restrictive deletion by default; account deletion follows an explicit privacy workflow rather than cascading accidentally. Index movie-reference lookups, review paging, and watchlist ownership. Validate invariants in the domain and back them with database constraints wherever possible.

### 10.2 Migrations and transactions

- EF Core migrations are committed with the code that requires them.
- Production migrations run as an explicit, single-instance pipeline job before application rollout.
- Local state-changing use cases use one unit-of-work transaction.
- Optimistic concurrency protects review edits.
- Seed only reference roles and a development-only test administrator; never seed production credentials.

## 11. TMDB Integration and Caching

`IMovieProvider` is defined in Application and implemented by a typed HTTP client in Infrastructure. The adapter owns TMDB authentication, URL construction, response contracts, localization, image configuration, error mapping, and normalization.

Resilience policy:

- Apply a short connect timeout and an explicit total request timeout.
- Retry only safe idempotent reads for bounded transient failures, using jitter and respecting `Retry-After`.
- Do not retry invalid credentials, validation failures, or not-found responses.
- Limit concurrent upstream calls and fail predictably when the provider is unavailable.
- Record dependency duration and outcome without logging tokens or unnecessary response bodies.

Cache policy:

- Cache normalized latest/search responses briefly to absorb repeated traffic.
- Cache movie details and credits longer because they change less often.
- Use a cache-aside strategy with fresh and bounded stale windows.
- Prevent cache stampedes through per-key request coalescing.
- Start with PostgreSQL-backed snapshots and in-memory hot caching. Introduce a distributed cache only after measurements justify it.
- Make all durations configurable and confirm them against current TMDB terms before production.

## 12. Authentication and Security

For the same-site web deployment, use ASP.NET Core Identity with secure, `HttpOnly`, `SameSite=Lax` cookies. Keep short session lifetimes, rotate security stamps when account security changes, and use anti-forgery tokens on state-changing requests. If the frontend and API later require separate sites or third-party clients, document an OpenID Connect/OAuth 2.0 migration in an ADR rather than placing long-lived bearer tokens in local storage.

Additional controls:

- HTTPS and HSTS in production.
- Strict CORS allowlist; no wildcard origins with credentials.
- Rate limits for authentication, search, review mutation, and provider-backed endpoints.
- Server-side validation at the API boundary and invariant enforcement in the domain.
- Plain-text review rendering with Angular's default escaping; no unsafe HTML bypass.
- Security headers including content security policy, frame restrictions, and MIME sniffing protection.
- Secrets supplied by the deployment platform; local development uses user secrets or ignored environment files.
- Generic sign-in and password-recovery responses to reduce account enumeration.
- Structured audit events for authentication, authorization failures, and moderation.

## 13. Angular Frontend Design

### 13.1 Application structure

Use standalone components, lazy feature routes, strict TypeScript, reactive forms, and the Angular HTTP client. Feature state remains local through signals and services unless measured complexity justifies a larger state library.

- `core`: API configuration, authentication session, interceptors, route guards, global error handling, and singleton services.
- `shared`: presentational components, pipes, directives, typed UI models, fallback artwork, and reusable Material compositions.
- `layout`: application shell, header, navigation, responsive side navigation, footer, and provider attribution.
- `features/catalog`: latest feed, search, movie cards, detail page, and cast list.
- `features/identity`: registration, sign-in, and profile.
- `features/watchlist`: watchlist page and reusable toggle action.
- `features/reviews`: review list, editor, delete confirmation, and moderation view.

### 13.2 Routes

```text
/
/search?q=
/movies/:movieId
/sign-in
/register
/watchlist                 (authenticated)
/account                   (authenticated)
/admin/reviews             (administrator)
/**                        (not found)
```

### 13.3 Angular Material usage

- Application shell: `MatToolbar`, `MatSidenav`, `MatMenu`, and CDK layout utilities.
- Movies and responsive columns: `MatCard` compositions in a CSS Grid, with Material breakpoints and design tokens.
- Forms and labels: `MatFormField`, `MatLabel`, `MatInput`, validation errors, and accessible hints.
- Actions: `MatButton`, `MatIconButton`, `MatChips`, and `MatTooltip` where supplemental text is useful.
- Feedback: `MatProgressSpinner`, skeleton styles, `MatSnackBar`, `MatDialog`, and reusable empty/error states.
- Icons and drawings: `MatIcon` with a deliberately limited icon set; provider artwork uses responsive images. Custom SVG is allowed only for application-owned decorative artwork and must be accessible or hidden from assistive technology as appropriate.
- Motion: Material component motion plus small route/list transitions. Motion communicates hierarchy or state, stays brief, avoids layout jank, and is disabled or reduced when `prefers-reduced-motion` is set.

The theme uses Material design tokens for color, typography, spacing, density, elevation, shape, light/dark modes, and contrast. Avoid component-wide CSS overrides that depend on private Material DOM structure.

### 13.4 Frontend data flow

- Generated or manually verified typed clients mirror the OpenAPI contract.
- HTTP interceptors add correlation metadata and anti-forgery tokens, but never swallow errors.
- Route resolvers are used sparingly; pages render skeletons quickly and load cancellable data.
- Infinite scrolling uses `IntersectionObserver` with a keyboard-accessible “Load more” fallback.
- The router or a session-scoped catalog store preserves feed results and scroll position.
- Images use provider configuration, responsive sizes, lazy loading, fixed aspect ratios, and a fallback component.

## 14. Error Handling

- A central API exception handler converts known domain/application failures and unexpected faults to Problem Details.
- Validation errors map to `400` or `422` according to the final API convention, selected once and tested consistently.
- Business conflicts such as a duplicate review or stale edit return `409`.
- Provider rate limiting maps to a retryable application response and `429` or `503` as appropriate.
- The UI maps error codes to concise English messages and provides retry actions for recoverable reads.
- Unexpected error details remain in correlated server telemetry and are not exposed to users.

## 15. Observability and Operations

- Use OpenTelemetry-compatible traces and metrics with ASP.NET Core, HTTP client, and Npgsql instrumentation.
- Use structured application logs with correlation, user pseudonymous ID where justified, module, use case, and outcome.
- Expose `/health/live` for process liveness and `/health/ready` for essential dependencies.
- Monitor API latency and error rate, provider latency/rate limits, cache effectiveness, PostgreSQL pool health, authentication failures, and review moderation volume.
- Keep environment-specific configuration outside artifacts and validate required settings at startup.

## 16. Testing Strategy

| Test level | Purpose |
| --- | --- |
| Domain unit tests | Aggregate invariants, value objects, transitions, and permissions expressed as domain policy |
| Application tests | Use-case orchestration, validation, authorization, result mapping, and cancellation |
| Infrastructure integration tests | EF Core mappings and constraints against real PostgreSQL; TMDB adapter against a controlled HTTP stub |
| API integration tests | Authentication, authorization, HTTP semantics, Problem Details, serialization, and OpenAPI |
| Angular unit/component tests | Component behavior, forms, state, accessibility, and error/loading states |
| End-to-end tests | Home-to-detail, search, registration/sign-in, watchlist, review lifecycle, and administrator moderation |
| Non-functional tests | Accessibility scan, performance budgets, basic load, security checks, and container health |

Tests use deterministic clocks and IDs when needed. Provider contract fixtures are scrubbed and versioned. Integration tests must not depend on the live TMDB service.

## 17. Docker and Delivery Topology

### 17.1 Local development

Docker Compose is the canonical way to provision local infrastructure. The default development profile starts PostgreSQL and optional telemetry dependencies while the API and Angular development server may run directly on the host for fast hot reload. A full-stack profile also builds and runs the API and web containers, allowing developers and reviewers to exercise a production-like topology with one command.

The Compose configuration shall:

- Use named volumes only for developer database persistence; test containers use disposable volumes.
- Define health checks and dependency conditions without treating startup order as service readiness.
- Load non-secret defaults from versioned configuration and secrets from ignored local environment files or the host secret store.
- Bind only required development ports and place services on a private project network.
- Avoid fixed container names so parallel test or developer projects do not collide.
- Support clean startup on Windows, macOS, and Linux with documented prerequisites and commands.

### 17.2 Local and CI tests

Infrastructure integration tests use disposable Docker containers for PostgreSQL and any other real dependency that materially affects behavior. The test harness creates a unique database/container scope, waits for readiness, applies migrations, runs tests, and removes disposable resources after completion. Tests never depend on a developer's persistent Compose database or on the live TMDB service.

The regular test workflow keeps fast domain, application, and frontend unit tests container-independent. Docker is required only for integration, API, full-stack end-to-end, migration, and production-image smoke tests.

### 17.3 Docker image design

- `api.Dockerfile` uses a multi-stage .NET build and publishes a framework-dependent ASP.NET Core application into a minimal supported runtime image.
- `web.Dockerfile` uses a multi-stage Node/Angular build and copies only static production output into an unprivileged web-server image.
- Both runtime containers execute as non-root users, have read-only application filesystems where the platform supports them, write temporary data only to declared ephemeral paths, and handle termination signals gracefully.
- Images contain no source-control metadata, development dependencies, credentials, local configuration, or test results.
- OCI labels record source revision, build time, version, and ownership. Release tags are human-readable aliases; deployments pin immutable digests.
- `.dockerignore` files minimize build context and prevent secrets, local databases, build output, and dependency directories from entering image layers.
- CI scans images and their software bill of materials before promotion. Critical findings block release according to policy.

### 17.4 Production topology

Production deploys:

- One Angular static artifact served by an edge/static host or the ASP.NET Core host.
- One or more stateless API instances.
- Managed PostgreSQL with encrypted connections, backups, and point-in-time recovery.
- A secret manager for database and TMDB credentials.
- Central telemetry storage.

The preferred same-origin topology serves the SPA and `/api` behind one public origin, simplifying cookies, CORS, CSP, and anti-forgery protection.

The target container platform may be a managed container service or an orchestrator, but it must run the same tested Docker images. PostgreSQL is an external managed service in production rather than a database container colocated with the application. Database migrations run from the API image as a separate, single-instance release job and never race across application replicas.

## 18. Architecture Decisions to Record

Before implementation closes the related task, create ADRs for:

1. Modular monolith and layer dependency rules.
2. Same-origin secure-cookie authentication.
3. TMDB as the initial catalog provider and the provider abstraction boundary.
4. PostgreSQL-backed catalog snapshot and cache freshness policy.
5. Review publication and moderation policy.
6. Production hosting, migration, backup, and rollback strategy.

## 19. Key Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| TMDB outage, contract change, or rate limiting | Provider adapter, timeouts, bounded retries, contract tests, cache, stale reads, and monitoring |
| Credential exposure | Backend-only calls, secret manager, log redaction, repository scanning, and CSP |
| DDD over-engineering | Modular monolith, use-case-oriented code, no infrastructure abstractions without an actual boundary |
| Slow image-heavy pages | Responsive image sizes, lazy loading, fixed dimensions, CDN/provider image configuration, and performance budgets |
| Duplicate watchlist entries or reviews | Domain rules plus database unique constraints and idempotent API semantics |
| Review abuse or unsafe content | Authentication, limits, plain-text rendering, rate limits, moderation, and audit trail |
| Framework version drift | Pinned lockfiles, automated dependency checks, supported-version policy, and incremental upgrades |

## 20. Definition of Done for the Design

The design is ready for implementation when open product decisions blocking the MVP are resolved, the initial ADRs are accepted, endpoint contracts are reviewed, data ownership and constraints are agreed, threat modeling is complete, and every Must requirement maps to one or more implementation and test tasks.
