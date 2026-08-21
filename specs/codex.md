# Movie Database App — Codex Implementation and Execution Guide

## 1. Purpose

This file is the operational knowledge base for implementing, testing, running, and delivering the Movie Database App with Codex. It consolidates the intent of the other specifications into an execution-oriented guide. It does not replace them.

Codex must read this file and the three authoritative source documents before making a material implementation decision:

- `requirements.md` defines product behavior, acceptance criteria, business rules, priorities, and quality requirements.
- `Design.md` defines architecture, technology, boundaries, contracts, persistence, security, testing, Docker, and delivery design.
- `Tasks.md` defines implementation order, milestones, task IDs, exit criteria, and the continuous definition of done.
- `codex.md` defines how Codex applies those sources during implementation and execution.

If the files conflict, use the following precedence:

1. Explicit current user instruction.
2. `requirements.md` for product behavior and quality expectations.
3. `Design.md` for technical decisions and boundaries.
4. `Tasks.md` for execution order and completion state.
5. `codex.md` for operational guidance.

Do not silently resolve a material conflict. Record the decision in the appropriate specification and, when architectural, in an ADR before relying on it.

## 2. Current Project State

As of August 20, 2026, the repository contains a working implementation of the catalog, identity, watchlist, review, and moderation milestones. The implementation includes:

- A .NET 10 modular monolith with Api, Application, Domain, and Infrastructure projects and inward-only project references.
- A versioned controller API, RFC 9457 Problem Details, OpenAPI, cookie authentication, anti-forgery protection, authorization, rate limits, health checks, and correlated security-aware HTTP behavior.
- A TMDB provider adapter behind application contracts, normalized catalog models, memory and PostgreSQL snapshot caching, request coalescing, resilience policies, and stale-detail fallback.
- PostgreSQL persistence and committed EF Core migrations for Identity, movie snapshots, watchlists, reviews, and immutable moderation records.
- An Angular 22 standalone frontend with Angular Material, responsive discovery/search/detail views, account flows, watchlists, review editing, and administrator moderation.
- Production multi-stage Docker images and a Compose stack for PostgreSQL, the API, and the Nginx-hosted single-page application.
- Domain, application, infrastructure, API, Angular component, and Playwright browser tests plus a CI workflow and Docker smoke checks.

The full stack is locally verified with a placeholder TMDB credential. A valid server-side `TMDB_ACCESS_TOKEN` is still required to display live catalog data. Stakeholder approvals, provider account obligations, production infrastructure, legal review, production secrets, backups, telemetry dashboards, and release acceptance remain external release activities and must not be represented as completed in `Tasks.md`.

Do not claim a task or requirement is implemented until the corresponding code, tests, documentation, and verification exist in the workspace.

The intended delivery order is:

1. Product and architecture alignment.
2. Repository and engineering foundation.
3. Backend platform and cross-cutting concerns.
4. TMDB provider boundary and catalog caching.
5. Catalog HTTP API.
6. Frontend shell and design system.
7. Catalog frontend and MVP acceptance.
8. Identity and authorization.
9. Watchlists.
10. Reviews and moderation.
11. Hardening and release readiness.
12. Production launch and follow-up.

Implement vertical slices inside this sequence. A slice should include domain/application behavior where applicable, infrastructure, HTTP contract, frontend behavior, tests, documentation, and observability rather than leaving disconnected layers unfinished.

## 3. Product Mission and Scope

The application helps visitors discover movies and helps registered members save and review them. Movie metadata comes initially from TMDB and is accessed only through the backend.

### MVP

- Show current/latest movies on the home page.
- Load additional results progressively in release-date order.
- Search movies by title.
- Open a stable, separate movie details route.
- Display synopsis, release date, runtime, genres, artwork, provider rating, vote count, and main cast when available.
- Provide responsive loading, empty, missing-data, not-found, and recoverable error states.
- Keep the TMDB credential out of the browser, repository, logs, and source maps.

### Post-MVP

- Local registration, sign-in, sign-out, and account lifecycle.
- A private personal watchlist.
- User reviews and ratings.
- Administrator review moderation and an audit trail.

### Out of scope for the initial release

- Streaming, downloading, or hosting movies.
- Ticket purchases.
- Social feeds, messaging, and user following.
- TV catalog support.
- Simultaneous use of multiple movie providers.
- Native mobile applications.

## 4. Language and Presentation Rules

- All documentation, source identifiers, comments intended for maintainers, API descriptions, UI copy, validation text, operational messages, and presentation material must be in English.
- User-facing errors must be concise and must not expose implementation details, secrets, provider payloads, or stack traces.
- The UI must remain usable from a 320-pixel-wide viewport through large desktop screens.
- Accessibility targets WCAG 2.2 AA, visible keyboard focus, semantic structure, accessible names, keyboard-only operation, sufficient contrast, non-color status cues, and reduced-motion support.
- Provider ratings and local user ratings must be clearly labeled and visually distinct.
- Missing provider values must render explicit, accessible fallbacks rather than breaking the page.

## 5. Technology Baseline

Use the latest supported patch releases compatible with this pinned baseline:

- .NET 10 LTS, ASP.NET Core 10, and C# for the backend.
- Entity Framework Core 10 and Npgsql for persistence.
- PostgreSQL as the system of record and catalog snapshot store.
- Angular 22 with strict TypeScript and standalone components.
- Angular Material 22 and Angular CDK for UI structure, controls, design tokens, accessibility, and motion.
- OpenAPI for the public backend contract.
- xUnit for backend tests and Playwright for critical browser journeys.
- Docker Engine and Docker Compose for local infrastructure, disposable integration-test dependencies, full-stack verification, and production images.
- OpenTelemetry-compatible structured logs, traces, dependency spans, and metrics.

Keep Angular core, CLI, CDK, and Material on the same major version. Pin lockfiles, the .NET SDK feature band, container base versions, and release image digests. A major technology change requires specification review and an ADR.

## 6. Required Architecture

Build a modular monolith. Do not introduce microservices, a message broker, a distributed cache, or a global frontend state library without measured need and an accepted design change.

Initial logical modules:

- `Catalog`: discovery, search, details, provider mapping, snapshots, and cache policy.
- `Identity`: accounts, authentication, roles, authorization, and account lifecycle.
- `Watchlists`: private movie selections owned by a member.
- `Reviews`: ratings, text reviews, lifecycle, moderation, concurrency, and audit history.

Backend dependency direction is mandatory:

```text
API -> Application -> Domain
          ^             ^
          |             |
     Infrastructure ----
```

Layer responsibilities:

- `MyMovie.Domain` owns aggregates, entities, value objects, domain policies/services, domain events, repository abstractions where justified, and business invariants. It must not reference HTTP, ASP.NET Core, EF Core, PostgreSQL, Angular, or TMDB types.
- `MyMovie.Application` owns use cases, commands, queries, validation, authorization invocation, transaction orchestration, application result types, DTO mapping, and ports such as `IMovieProvider`. It depends only on Domain and framework-neutral primitives.
- `MyMovie.Infrastructure` owns EF Core, Npgsql, Identity stores, TMDB HTTP contracts and adapter, cache implementations, telemetry exporters, and implementations of Application or Domain ports.
- `MyMovie.Api` owns HTTP controllers, request/response contracts, middleware, filters, authentication composition, Problem Details, OpenAPI, health endpoints, dependency injection, and the composition root. Controllers must not contain business logic.

Modules must not share mutable domain entities or access another module's database tables directly. Coordinate through application interfaces or in-process domain events. Keep cross-cutting abstractions small and backed by a real use case.

## 7. Target Repository Layout

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

Separate projects and folders by responsibility and feature, not by one folder per database entity. Enforce references so dependencies point inward.

## 8. Domain Knowledge and Invariants

### Catalog

- `MovieReference` consists of `Provider` and `ProviderMovieId`.
- `MovieSnapshot` is cached, normalized external data with source/fetch/freshness metadata; the application does not own the external movie master record.
- `MovieRating` contains the provider score and vote count and is separate from local user review ratings.
- `CastMemberSnapshot` contains provider person ID, name, character, display order, and optional profile path.
- TMDB-specific DTOs never leave Infrastructure.

### Identity

- `ApplicationUser` contains identity key, normalized unique email, display name, status, and audit timestamps.
- Roles are `Member` and `Administrator`.
- ASP.NET Core Identity owns credential hashing, lockout, security tokens, and role storage.
- Other modules reference users only by immutable `UserId`.
- A deactivated account cannot change watchlists or reviews.

### Watchlists

- `Watchlist` is the aggregate root and has one `OwnerUserId`.
- `WatchlistEntry` contains a `MovieReference` and creation timestamp.
- A watchlist is private to its owner.
- A movie can appear at most once in one user's watchlist.
- Adding the same movie is idempotent; removal must verify ownership.

### Reviews

- `Review` is the aggregate root and contains author, movie reference, rating, text, status, concurrency version, and audit timestamps.
- `Rating` is an integer from 1 through 10 inclusive.
- `ReviewText` is trimmed plain text from 50 through 2,000 characters.
- Initial statuses are `Published`, `Hidden`, and `Deleted`; add `Pending` only if pre-moderation is selected.
- A member can have at most one active review for a movie.
- Only the author may edit or delete their review.
- Only an administrator may hide or restore a review.
- Review edits use optimistic concurrency and return a conflict rather than overwriting newer data.
- Deletion removes a review from public results while preserving required audit information.
- Moderation records actor, timestamp, action, and reason.

Enforce invariants both in domain behavior and with database constraints where possible. Do not rely only on UI validation.

## 9. Application Use Cases

Implement explicit use-case handlers or application services. A mediator library is optional and must not become part of domain behavior.

Catalog:

- `GetLatestMovies`
- `SearchMovies`
- `GetMovieDetails`
- `RefreshMovieSnapshot` as an internal command when needed

Identity:

- `GetCurrentUser`
- `RegisterUser`
- `SignIn`
- `SignOut`
- `DeactivateAccount`

Watchlists:

- `GetMyWatchlist`
- `IsMovieInMyWatchlist`
- `AddMovieToWatchlist`
- `RemoveMovieFromWatchlist`

Reviews:

- `GetMovieReviews`
- `GetMyReview`
- `CreateReview`
- `UpdateReview`
- `DeleteReview`
- `HideReview`
- `RestoreReview`

Every use case must have an input contract, validation, authorization rules where applicable, a defined transaction boundary for local writes, cancellation propagation, an explicit result type, and tests linked to requirement IDs.

## 10. HTTP Contract

Use controller-based HTTP endpoints under `/api/v1`. Use UTF-8 camelCase JSON, ISO 8601 UTC timestamps, and `YYYY-MM-DD` calendar dates. Use bounded paging and return pagination metadata. Propagate the request `CancellationToken` to database and provider calls.

Required endpoint surface:

| Method   | Route                                               | Access        | Purpose                          |
| -------- | --------------------------------------------------- | ------------- | -------------------------------- |
| `GET`    | `/api/v1/movies/latest?page={n}`                    | Public        | Latest movie summaries           |
| `GET`    | `/api/v1/movies/search?query={q}&page={n}`          | Public        | Title search                     |
| `GET`    | `/api/v1/movies/{providerMovieId}`                  | Public        | Movie details and main cast      |
| `POST`   | `/api/v1/auth/register`                             | Public        | Create member account            |
| `POST`   | `/api/v1/auth/sign-in`                              | Public        | Start session                    |
| `POST`   | `/api/v1/auth/sign-out`                             | Member        | End session                      |
| `GET`    | `/api/v1/users/me`                                  | Member        | Safe current-user profile        |
| `GET`    | `/api/v1/watchlist`                                 | Member        | Current user's private watchlist |
| `PUT`    | `/api/v1/watchlist/movies/{providerMovieId}`        | Member        | Idempotently add movie           |
| `DELETE` | `/api/v1/watchlist/movies/{providerMovieId}`        | Member        | Remove movie                     |
| `GET`    | `/api/v1/movies/{providerMovieId}/reviews?page={n}` | Public        | Published reviews                |
| `POST`   | `/api/v1/movies/{providerMovieId}/reviews`          | Member        | Create review                    |
| `PUT`    | `/api/v1/reviews/{reviewId}`                        | Owner         | Update review                    |
| `DELETE` | `/api/v1/reviews/{reviewId}`                        | Owner         | Soft-delete review               |
| `POST`   | `/api/v1/admin/reviews/{reviewId}/hide`             | Administrator | Hide review                      |
| `POST`   | `/api/v1/admin/reviews/{reviewId}/restore`          | Administrator | Restore review                   |

Use RFC 9457 Problem Details for errors. Include a stable application error code, `traceId`, and field-level validation details when applicable. Expected status codes include `200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, and `503`. Select one consistent convention for validation failures before finalizing the contract. Centralize exception and result mapping.

Publish deterministic OpenAPI as a build artifact. An API change is not complete until the OpenAPI document, frontend types/client, integration tests, and affected documentation agree.

## 11. PostgreSQL Persistence

Use lower-case snake_case identifiers. Prefer restrictive foreign-key deletion. Account deletion follows a deliberate privacy workflow and must not trigger accidental cascades.

Required tables and constraints:

- Identity-managed user and role tables: unique normalized email, status, and audit fields.
- `watchlists`: unique owner user ID.
- `watchlist_entries`: watchlist ID, provider, provider movie ID, timestamp, and unique `(watchlist_id, provider, provider_movie_id)`.
- `reviews`: author, provider, provider movie ID, rating check from 1 to 10, text, status, concurrency version, timestamps, and database enforcement of one active author/movie review.
- `review_moderation_records`: review, administrator, action, reason, and timestamp.
- `movie_snapshots`: unique provider/movie identity, normalized data, source update time, fetch time, and stale-after time.
- `outbox_messages`: introduce only when durable post-commit work has an actual use case.

Index movie-reference lookups, review pagination/order, and watchlist ownership. Commit EF Core migrations with the code that requires them. Test migrations against real PostgreSQL. Run production migrations once as a separate release job before application rollout. Seed reference roles only; development administrators must never create production credentials.

## 12. TMDB Boundary and Cache

Define `IMovieProvider` in Application and implement it with a typed HTTP client in Infrastructure. The adapter exclusively owns:

- Provider authentication and URL construction.
- TMDB request and response DTOs.
- Image configuration and URL mapping.
- Localization defaults.
- Error and rate-limit mapping.
- Normalization into application read models.

Provider calls must use explicit connect/total timeouts, request cancellation, bounded retries with jitter only for safe transient read failures, `Retry-After` awareness, and concurrency limiting. Do not retry invalid credentials, validation failures, or not-found responses. Record dependency duration and outcomes without logging credentials or unnecessary bodies.

Use cache-aside behavior:

- Briefly cache normalized latest and search results.
- Cache details and credits longer.
- Store PostgreSQL snapshots and optionally use in-memory hot caching.
- Support configurable fresh and bounded-stale windows.
- Coalesce concurrent cache misses per key to prevent stampedes.
- Serve bounded stale data during a temporary provider outage when permitted.
- Add a distributed cache only after measurements justify it.

Do not finalize freshness durations without checking current TMDB terms. Never call live TMDB from CI. Use scrubbed fixtures and a controlled HTTP stub for contract tests.

## 13. Authentication, Authorization, and Security

For the same-origin web application, use ASP.NET Core Identity with secure `HttpOnly`, `SameSite=Lax` cookies. Do not store authentication secrets or long-lived bearer tokens in browser local storage. Protect state-changing cookie-authenticated requests with anti-forgery tokens.

Mandatory controls:

- HTTPS and HSTS in production.
- Strict credentialed CORS allowlist; never combine credentials with wildcard origins.
- Generic authentication and recovery responses that resist account enumeration.
- Passwords handled only by the identity framework as adaptive salted hashes.
- Lockout and session invalidation behavior.
- Member, resource-owner, and administrator authorization policies.
- Rate limits for authentication, search, provider-backed reads, and review mutations.
- Server-side request validation plus domain invariant enforcement.
- Angular default output escaping and plain-text review rendering; never bypass sanitization for review content.
- CSP, frame restrictions, MIME sniffing protection, and other appropriate secure headers.
- Runtime secret injection through local user secrets, ignored environment files, or a deployment secret manager.
- Log and telemetry redaction for passwords, tokens, cookies, session IDs, and unnecessary personal data.
- Structured audit events for authentication, authorization failures, and review moderation.

Return HTTP 401 for unauthenticated protected requests and HTTP 403 for authenticated users lacking permission. Test cross-user watchlist and review access using modified requests, not only UI guards.

## 14. Angular Application

Use standalone components, lazy feature routes, strict TypeScript and templates, reactive forms, Angular HTTP client, signals, and focused services. Keep state close to its feature. Add a larger state library only with measured evidence and a design decision.

Required areas:

- `core`: API configuration, authentication session, HTTP interceptors, route guards, global error mapping, and singleton services.
- `shared`: presentational components, directives, pipes, typed UI models, fallback artwork, and reusable Material compositions.
- `layout`: application shell, header, responsive navigation, footer, and provider attribution.
- `features/catalog`: feed, search, cards, details, and cast.
- `features/identity`: registration, sign-in, and account profile.
- `features/watchlist`: list page and reusable add/remove action.
- `features/reviews`: review list/editor, delete confirmation, and moderation.

Required routes:

```text
/
/search?q=
/movies/:movieId
/sign-in
/register
/watchlist
/account
/admin/reviews
/**
```

Guard watchlist/account/member routes and administrator routes, while enforcing the same rules again in the API.

Angular Material usage:

- `MatToolbar`, `MatSidenav`, and `MatMenu` for the shell.
- `MatCard` compositions in responsive CSS Grid columns for movies.
- `MatFormField`, `MatLabel`, `MatInput`, validation errors, and hints for forms.
- Material buttons, icon buttons, chips, and tooltips for actions and metadata.
- Progress indicators, skeleton styles, snack bars, dialogs, and reusable empty/error states for feedback.
- A limited, consistent `MatIcon` set for icons; responsive provider images for movie/person artwork.
- Material motion and small route/list transitions only when they communicate state; honor `prefers-reduced-motion`.

Use Material design tokens for color, typography, spacing, density, elevation, shape, contrast, and light/dark themes. Do not style against private Material DOM internals.

Frontend behavior rules:

- Debounce title search, cancel superseded requests, and do not call the API for blank queries.
- Use `IntersectionObserver` for progressive loading with an accessible “Load more” fallback.
- Prevent duplicate parallel page requests and de-duplicate movie results.
- Preserve feed/search state and scroll position during the browser session when returning from details.
- Lazy-load below-the-fold images, request appropriate sizes, and reserve dimensions to prevent layout shift.
- Render skeleton, empty, not-found, partial-data, provider-error, and retry states.
- Keep API contracts typed and synchronized with OpenAPI.

## 15. Docker Rules

Docker is mandatory for reproducible infrastructure and deployable artifacts.

### Local development

- `deploy/compose/compose.yaml` defines canonical services and networks.
- The default development profile starts PostgreSQL and optional telemetry dependencies while backend/frontend may run on the host for hot reload.
- A full-stack profile builds and runs database, API, and web services for production-like review.
- Use named volumes only for persistent developer data; tests use disposable storage.
- Define health checks and wait for actual readiness.
- Avoid fixed container names so parallel projects do not collide.
- Expose only required development ports and use a private project network.
- Version safe defaults; load secrets from ignored files or host secret storage.
- Document commands and behavior for Windows, macOS, and Linux.

### Tests

- Domain, application, and frontend unit tests remain fast and container-independent.
- Infrastructure and API integration tests start isolated disposable PostgreSQL containers, wait for readiness, apply migrations, and clean up automatically.
- Full-stack end-to-end, migration, and image smoke tests may use Docker Compose profiles.
- Tests never depend on the developer's persistent Compose database.

### Images and deployment

- Use separate multi-stage `api.Dockerfile` and `web.Dockerfile` builds.
- Run final containers as non-root with minimal supported runtime images.
- Copy only published application/static output into runtime stages.
- Keep credentials, local configuration, source-control metadata, development dependencies, test results, and local databases out of layers and build contexts.
- Use `.dockerignore` to exclude build output, dependencies, secrets, and unnecessary source context.
- Handle termination signals and graceful shutdown; use read-only application filesystems and declared ephemeral paths where supported.
- Add OCI metadata for revision, build time, version, and ownership.
- Generate an SBOM, scan images, and block critical vulnerabilities according to release policy.
- Build an image once and promote the exact immutable digest between environments.
- Run database migrations as a separate single-instance job from the approved API image.
- Use a managed PostgreSQL service in production, not a database container colocated with the application.

## 16. Testing and Verification Strategy

Use the lowest test level that proves the behavior, then add boundary tests where framework or infrastructure behavior matters.

- Domain unit tests: value objects, aggregate invariants, transitions, and domain policies.
- Application tests: validation, use-case orchestration, authorization invocation, results, transactions, and cancellation.
- Infrastructure integration tests: EF Core mappings, migrations, PostgreSQL constraints, repositories, and the TMDB adapter against a controlled HTTP stub.
- API integration tests: controllers, serialization, authentication, authorization, CSRF, Problem Details, status codes, rate limits, and OpenAPI.
- Angular unit/component tests: forms, feature state, data states, accessibility behavior, errors, and Material compositions.
- Playwright end-to-end tests: feed-to-details, progressive load, restored navigation state, search, identity, watchlist, review lifecycle, and moderation.
- Non-functional tests: WCAG automation and keyboard checks, frontend budgets, baseline load/latency, secure headers, vulnerability policy, container health, outages, and graceful shutdown.

Use deterministic clocks and IDs where needed. Scrub and version provider fixtures. Never make the test suite depend on live TMDB or persistent developer data.

Critical MVP browser paths must cover:

1. Open the latest feed and inspect required card information.
2. Load additional unique results and reach the terminal state.
3. Open details and return with results and scroll restored.
4. Search successfully, clear search, and handle no results.
5. Display details with full and partial provider data.
6. Handle unknown IDs and temporary provider failure differently.
7. Complete the same essential flow with keyboard navigation and reduced motion.

Post-MVP paths must cover registration/session behavior, watchlist isolation/idempotency, review ownership/uniqueness/concurrency, unsafe review text, and administrator moderation visibility.

## 17. Performance, Reliability, and Observability Targets

Performance:

- Cached catalog API p95: at most 500 ms under the agreed baseline, excluding network time outside the application boundary.
- Normal uncached provider-backed API p95 target: at most 2.5 seconds.
- Enforce frontend compressed JavaScript, image, and Core Web Vitals budgets before production.
- Lazy-load and appropriately size below-the-fold artwork.

Reliability:

- Production monthly availability target: 99.5%, excluding planned maintenance and upstream-provider outages.
- Separate `/health/live` process liveness from `/health/ready` essential dependency readiness.
- Support bounded stale catalog responses during temporary provider failure.
- Use versioned migrations with reviewed rollback or forward-fix plans.
- Configure encrypted backups and point-in-time recovery and perform a restoration test.

Observability:

- Correlate application logs, inbound traces, TMDB dependency traces, and PostgreSQL spans.
- Measure API latency/errors, provider latency/rate limits, cache effectiveness, database pool health, authentication anomalies, and moderation activity.
- Do not emit passwords, tokens, cookies, session identifiers, provider credentials, or unnecessary personal data.
- Create production dashboards and actionable alerts before release.

## 18. Expected Developer Command Contract

As scaffolding is implemented, expose stable documented commands in the root `README.md` and, where useful, task runner scripts. The final names may follow repository conventions, but the workflow must support these operations without manual IDE steps:

```text
Restore backend dependencies
Restore frontend dependencies from the lockfile
Start local PostgreSQL with Docker Compose
Run backend with hot reload
Run frontend with hot reload
Run fast unit tests
Run Docker-backed integration/API tests
Run frontend component tests
Run Playwright end-to-end tests
Apply or verify EF Core migrations
Build production backend and frontend artifacts
Build API and web Docker images
Start the complete production-like Docker Compose stack
Run health and smoke checks
Stop the stack without deleting developer data
Explicitly remove local disposable test resources
```

Commands must be non-interactive in CI, return meaningful exit codes, avoid embedding secrets, and behave consistently from a clean checkout. Never delete persistent developer volumes as an implicit side effect of a normal stop command.

## 19. Codex Execution Protocol

For every implementation request, Codex must:

1. Read the relevant sections of all four specification files and inspect the current repository state.
2. Identify the current phase and exact `Tasks.md` task IDs in scope.
3. State any safe assumption that affects behavior or architecture. Do not silently decide an item listed as an open product decision.
4. Check for existing user changes and preserve unrelated work.
5. Implement the smallest complete vertical slice that satisfies the scoped acceptance criteria.
6. Preserve DDD dependency direction and keep controllers, EF models/configuration, TMDB DTOs, and Angular view concerns in their assigned layers.
7. Add or update automated tests at the appropriate levels.
8. Run the narrowest relevant checks first, followed by broader build/test/Compose verification in proportion to the change.
9. Inspect failures, fix root causes within scope, and rerun affected checks.
10. Update OpenAPI, migrations, Docker artifacts, README instructions, ADRs, specifications, and traceability when the change affects them.
11. Mark a `Tasks.md` checkbox complete only when its implementation, tests, documentation, and exit conditions actually pass. Do not mark partial work complete.
12. Report the outcome, important decisions, files changed, verification performed, remaining risks, and the next task without overstating completion.

When credentials or external approval are missing, continue with provider abstractions, controlled fixtures, local configuration templates, and all other safe work that does not require the secret. Never invent, commit, print, or request that a credential be pasted into tracked source.

## 20. Definition of Done

A change is done only when all applicable conditions hold:

- Product acceptance criteria and business rules are satisfied.
- UI and implementation text are in English.
- DDD boundaries and inward dependencies are preserved.
- Appropriate automated tests exist and pass.
- Security, privacy, accessibility, performance, reliability, and observability impacts are addressed.
- PostgreSQL changes include a reviewed migration and deployment plan.
- API changes are reflected in OpenAPI and typed frontend contracts.
- Docker images and Compose behavior are updated and smoke-tested when affected.
- No secrets or unnecessary personal data appear in code, images, logs, fixtures, or documentation.
- Formatting, static analysis, tests, build, vulnerability policy, and production packaging pass in CI or the equivalent verified local workflow.
- Documentation, ADRs, requirement traceability, and `Tasks.md` status are accurate.
- The result is demonstrable in a production-like environment.

## 21. Open Decisions and Stop Conditions

The following decisions remain open in the source specifications:

- Whether initial production registration requires email verification.
- Whether reviews publish immediately or enter pre-moderation.
- Production hosting provider, region, and final availability agreement.
- Exact TMDB cache freshness and stale-serving periods permitted by current terms.
- Account, review, moderation audit, and telemetry retention periods.
- Final validation status convention where the API design currently permits `400` or `422`.

Codex may scaffold configurable boundaries and test both expected policies, but it must not hard-code a product or legal decision that changes user behavior without direction. An unresolved decision blocks only the task that depends on it unless it makes safe forward progress impossible.

Stop and request direction when:

- A proposed change contradicts a Must requirement or accepted ADR.
- A missing product decision would materially alter persisted data, public API behavior, authentication, privacy, moderation, or deployment architecture.
- Completion requires a real credential, paid service, production access, destructive data operation, or external action that has not been authorized.
- Existing user changes overlap the same code and cannot be safely preserved.

## 22. Milestone Acceptance

### MVP acceptance

Visitors can browse latest movies in deterministic release-date order, load more without duplicates, restore browsing position, search by title, and view accessible movie details and cast. Loading, empty, partial, not-found, and provider-error states work. The TMDB secret is absent from browser artifacts and logs. Must requirements and critical end-to-end tests pass.

### Identity and watchlist acceptance

Members can register, sign in and out, resume the intended route, and privately manage a de-duplicated watchlist. Cookie, anti-forgery, authorization, 401/403, cross-user isolation, and session invalidation tests pass.

### Reviews acceptance

Visitors can read published reviews. Members can create, edit, and delete one review per movie with validated rating and plain text. Ownership, database uniqueness, optimistic concurrency, hidden/deleted visibility, abuse controls, and administrator moderation audit tests pass.

### Release acceptance

Requirement traceability is complete, critical defects are resolved, production migrations and recovery are verified, accessibility and performance targets are met, Docker images are scanned and pinned by digest, deployment and rollback are documented, telemetry and alerts are active, legal/provider attribution is approved, and all continuous definition-of-done checks pass.

## 23. Knowledge Maintenance

Keep this guide synchronized when a source specification changes materially. Update the authoritative source first, then revise this operational synthesis. Do not copy temporary debugging notes, secrets, transient tool output, or unaccepted ideas into this file.

When implementation begins, maintain progress in `Tasks.md` and use ADRs for durable technical decisions. Keep `codex.md` focused on stable project knowledge and execution rules so a future Codex session can safely continue from the repository without relying on conversation history.
