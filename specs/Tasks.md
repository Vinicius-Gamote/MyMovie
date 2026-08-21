# Movie Database App — Implementation Plan

## 1. How to Use This Plan

Work through the phases in order. A task is complete only when its implementation, tests, documentation, and review are complete. Requirement IDs refer to `requirements.md`; architectural decisions refer to `Design.md`.

The MVP milestone includes catalog discovery, search, and movie details. Identity and watchlists form the next milestone. Reviews and moderation form the final product milestone.

## 2. Phase 0 — Product and Architecture Alignment

- [ ] **T-0001 — Review the specification.** Confirm MVP and post-MVP scope, actors, priorities, terminology, and success metrics with stakeholders.
- [ ] **T-0002 — Resolve blocking product decisions.** Decide email verification, review publication policy, hosting region/provider, data retention, and permitted TMDB cache freshness.
- [ ] **T-0003 — Validate provider obligations.** Create a TMDB account, obtain a development token, review current attribution/branding/usage rules, and document approved cache behavior. Never add the token to source control. Covers FR-EXT-003 and FR-EXT-004.
- [ ] **T-0004 — Record initial ADRs.** Document the modular monolith, DDD dependency rules, authentication approach, TMDB adapter, cache strategy, and deployment assumptions.
- [ ] **T-0005 — Create traceability.** Map every Must requirement to an implementation task and at least one verification activity.

Exit criteria: MVP scope and external-service constraints are approved; no unresolved decision blocks repository scaffolding.

## 3. Phase 1 — Repository and Engineering Foundation

- [x] **T-0101 — Create the repository layout.** Add `backend`, `frontend`, `deploy`, and test structures described in `Design.md`; add root documentation, editor settings, and ignore rules.
- [x] **T-0102 — Pin development toolchains.** Pin .NET 10 SDK, compatible Node.js, Angular 22 CLI/core/CDK/Material, TypeScript, and package manager versions; commit lockfiles.
- [x] **T-0103 — Scaffold the backend solution.** Create Api, Application, Domain, and Infrastructure projects plus the four test projects; configure project references so dependencies point inward.
- [x] **T-0104 — Scaffold the Angular application.** Enable standalone components, routing, strict TypeScript/template checks, SCSS, Angular Material, and test tooling.
- [x] **T-0105 — Add Docker-based local infrastructure.** Create Docker Compose profiles for required infrastructure and the full application stack. Define PostgreSQL, named development volumes, private networking, health checks, non-conflicting project names, ignored local secret configuration, and documented startup/shutdown commands.
- [ ] **T-0106 — Add configuration validation.** Define typed backend options for database, TMDB, authentication, cache, and telemetry; fail startup with actionable messages when required values are absent.
- [ ] **T-0107 — Establish code quality gates.** Configure backend analyzers and formatting plus frontend linting/formatting; treat newly introduced warnings according to the agreed policy.
- [ ] **T-0108 — Create continuous integration.** Restore, lint, build, run tests, verify migrations, build production artifacts, and publish OpenAPI and test reports.
- [ ] **T-0109 — Add secret scanning and dependency checks.** Fail CI for committed credentials and known critical vulnerabilities according to the release policy.
- [x] **T-0110 — Create production Dockerfiles.** Add multi-stage backend and frontend builds, minimal non-root runtime images, OCI metadata, health checks, graceful shutdown behavior, and `.dockerignore` rules. Covers NFR-DEP-001 and NFR-DEP-003.
- [ ] **T-0111 — Verify Docker portability.** Build and run the complete Compose stack from a clean checkout, verify it on supported developer operating systems, and document prerequisites, profiles, ports, volumes, and troubleshooting. Covers NFR-MNT-005.

Exit criteria: a clean checkout builds and tests through one documented command and CI produces backend and frontend artifacts.

## 4. Phase 2 — Backend Platform and Cross-Cutting Concerns

- [x] **T-0201 — Configure API composition.** Register controllers, dependency injection, JSON conventions, API version path, HTTPS behavior, and environment-specific settings.
- [x] **T-0202 — Implement Problem Details.** Add central exception/result mapping, stable error codes, field validation details, and correlation IDs. Test expected and unexpected error shapes.
- [ ] **T-0203 — Add OpenAPI.** Describe endpoints, authentication, pagination, response types, and error contracts; publish a deterministic contract artifact. Covers NFR-MNT-002.
- [x] **T-0204 — Configure PostgreSQL persistence.** Add Npgsql, EF Core contexts and mappings, naming conventions, resilient connection configuration, and design-time migration support.
- [ ] **T-0205 — Create the initial migration.** Add only the schemas needed by the first vertical slice, verify application and rollback/forward-fix locally, and document the deployment command.
- [x] **T-0206 — Add health checks.** Implement separate liveness and readiness endpoints without sensitive output. Covers NFR-REL-003.
- [ ] **T-0207 — Add observability.** Configure structured logs, trace propagation, HTTP/database dependency spans, metrics, log redaction, and local telemetry viewing. Covers NFR-OBS-001.
- [ ] **T-0208 — Add resilience primitives.** Configure named/typed HTTP clients, timeouts, request cancellation, bounded retry, rate-limit awareness, and policy metrics. Covers FR-EXT-002.
- [ ] **T-0209 — Add API integration-test hosting.** Start the application with isolated configuration and a real PostgreSQL instance in a disposable Docker container. Give every run an isolated scope, apply migrations, wait for readiness, clean up automatically, and provide deterministic identity/time/provider substitutes where appropriate. Covers NFR-MNT-006.

Exit criteria: the API starts against PostgreSQL, publishes a valid contract, reports health, emits correlated telemetry, and returns consistent errors.

## 5. Phase 3 — Catalog Provider and Domain Boundary

- [x] **T-0301 — Define catalog contracts.** Add `MovieReference`, normalized summaries/details/cast read models, pagination model, and `IMovieProvider` port without TMDB types. Covers FR-EXT-001 and BR-005.
- [x] **T-0302 — Implement the TMDB adapter.** Create provider-specific request/response DTOs, server-side authentication, endpoint mapping, localization defaults, and image URL resolution.
- [ ] **T-0303 — Map provider failures.** Translate not found, invalid credential, rate limit, timeout, cancellation, malformed response, and availability cases into stable application outcomes.
- [ ] **T-0304 — Add provider contract tests.** Test mapping against scrubbed fixtures and a controlled HTTP stub; include partial/missing data and error responses. Do not call live TMDB in CI.
- [x] **T-0305 — Implement catalog snapshots.** Create PostgreSQL mappings and migrations for normalized cached movie data with fetched and stale timestamps.
- [ ] **T-0306 — Implement cache-aside behavior.** Add configurable fresh/stale windows, per-key request coalescing, bounded stale fallback, and cache-effectiveness metrics.
- [ ] **T-0307 — Add provider attribution configuration.** Make required attribution text and approved provider branding available to the frontend. Covers FR-EXT-003.
- [ ] **T-0308 — Verify credential isolation.** Add tests and a manual browser/network check proving TMDB tokens do not appear in responses, frontend bundles, logs, or source maps. Covers FR-EXT-004.

Exit criteria: the backend can retrieve and normalize movie data through the provider abstraction, tolerate defined transient failures, and serve permitted cached data.

## 6. Phase 4 — Catalog API Vertical Slices

- [x] **T-0401 — Implement latest-movies query.** Add validation, deterministic release-date ordering, bounded paging, provider/cache orchestration, DTO mapping, controller action, and tests. Covers FR-CAT-001.
- [x] **T-0402 — Implement movie search query.** Normalize and validate title queries, page results, propagate cancellation, add the controller action, and test empty/no-result/provider-failure cases. Covers FR-CAT-003.
- [x] **T-0403 — Implement movie-details query.** Retrieve normalized movie metadata and main cast, handle partial values and not-found IDs, add the controller action, and test mapping. Covers FR-CAT-004.
- [x] **T-0404 — Finalize pagination contracts.** Document page-number semantics, limits, total/next-page behavior, and deterministic de-duplication expectations. Covers FR-CAT-002.
- [ ] **T-0405 — Add endpoint rate limits.** Apply differentiated policies to catalog reads and search while returning useful headers and Problem Details.
- [ ] **T-0406 — Verify catalog performance.** Measure cached and uncached endpoints under the agreed baseline and tune queries, serialization, cache, and connection usage. Covers NFR-PERF-001 and NFR-PERF-002.

Exit criteria: the OpenAPI-described catalog endpoints satisfy FR-CAT-001 through FR-CAT-004 through automated API tests.

## 7. Phase 5 — Frontend Shell and Design System

- [x] **T-0501 — Build the application shell.** Implement responsive toolbar, navigation, side navigation where appropriate, main landmark, skip link, footer, and TMDB attribution.
- [x] **T-0502 — Define the Material theme.** Establish light/dark color tokens, typography, spacing, density, elevation, shape, contrast, and responsive breakpoints.
- [ ] **T-0503 — Create shared UI states.** Implement accessible skeleton/loading, empty, error, retry, not-found, and fallback-artwork components.
- [x] **T-0504 — Create shared movie cards.** Use Material cards, buttons, icons, labels, responsive images, fixed aspect ratios, and a responsive CSS Grid for columns.
- [ ] **T-0505 — Configure typed API access.** Add environment-based base URL, typed contracts, correlation/anti-forgery interceptors, cancellation behavior, and centralized error mapping.
- [ ] **T-0506 — Establish route and state conventions.** Add lazy routes, page titles, focus management, guarded routes, and session-scoped scroll/result restoration.
- [x] **T-0507 — Add purposeful motion.** Implement short list/page state transitions and Material feedback while honoring `prefers-reduced-motion`. Covers UI-004.
- [ ] **T-0508 — Establish accessibility tests.** Add automated checks, keyboard smoke tests, semantic landmark assertions, focus visibility, and color-contrast verification.

Exit criteria: the application shell is responsive and accessible, the design tokens are documented, and shared components render all data states.

## 8. Phase 6 — Catalog Frontend and MVP Completion

- [x] **T-0601 — Build the home feed.** Render latest movie cards with title, poster/fallback, release date, and provider rating plus loading/error states. Covers FR-CAT-001.
- [x] **T-0602 — Add progressive loading.** Use `IntersectionObserver` plus an accessible “Load more” action, prevent parallel duplicate requests, de-duplicate movies, and show the terminal state. Covers FR-CAT-002.
- [x] **T-0603 — Preserve browsing context.** Restore results, current page, search parameters, and scroll position after returning from details. Covers FR-CAT-002.
- [x] **T-0604 — Build search.** Add a labeled Material search field, debounce, request cancellation, URL query synchronization, clear action, empty state, and results grid. Covers FR-CAT-003.
- [x] **T-0605 — Build movie details.** Display responsive artwork, synopsis, provider rating/vote count, genres, runtime, release date, and accessible cast list. Covers FR-CAT-004 and UI-006.
- [x] **T-0606 — Add not-found and provider-error experiences.** Distinguish an unknown movie from a temporary upstream failure and offer the correct navigation/retry action.
- [ ] **T-0607 — Optimize images and bundles.** Add responsive provider image sizes, lazy loading, reserved dimensions, route-level code splitting, and production budgets. Covers NFR-PERF-003 and NFR-PERF-004.
- [ ] **T-0608 — Add MVP end-to-end tests.** Cover initial feed, additional pages, back-navigation restoration, successful/empty search, details, missing data, keyboard navigation, and provider error recovery.
- [ ] **T-0609 — Conduct MVP acceptance review.** Demonstrate all Must functional and interface requirements and record any accepted deviations.

MVP exit criteria: visitors can discover, progressively browse, search, and inspect movies in a responsive English interface; all Must requirement checks pass.

## 9. Phase 7 — Identity and Authorization

- [x] **T-0701 — Add the Identity model and schema.** Configure ASP.NET Core Identity, `ApplicationUser`, member/administrator roles, uniqueness, lockout, secure password policy, and migrations.
- [x] **T-0702 — Implement registration.** Add application use case, endpoint, normalized unique email, display-name validation, password handling, generic errors, and tests. Covers FR-ID-001.
- [x] **T-0703 — Implement sign-in and sign-out.** Configure secure same-site `HttpOnly` cookies, session expiry, lockout behavior, security-stamp validation, and endpoints. Covers FR-ID-002.
- [x] **T-0704 — Implement anti-forgery protection.** Issue and validate tokens for state-changing cookie-authenticated requests and test missing/invalid cases. Covers NFR-SEC-003.
- [x] **T-0705 — Add current-user and authorization policies.** Expose the safe current-user profile and define member, owner, and administrator policies. Covers FR-ID-003.
- [x] **T-0706 — Build identity UI.** Add reactive registration and sign-in forms, field errors, disabled/loading states, sign-out, account summary, return URL, and session restoration.
- [ ] **T-0707 — Test identity threats and flows.** Test enumeration resistance, authorization failures, cookies, CSRF, rate limits, open redirects, session invalidation, and browser flows.

Exit criteria: account and session flows are secure, protected routes/endpoints enforce policy, and tests prove 401/403/CSRF behavior.

## 10. Phase 8 — Watchlists

- [x] **T-0801 — Implement the Watchlist aggregate.** Add owner and entry value types, idempotent add/remove behavior, domain tests, and requirement-linked invariants. Covers BR-001.
- [ ] **T-0802 — Persist watchlists.** Add EF Core mappings, ownership and unique constraints, indexes, repository adapter, migration, and PostgreSQL integration tests.
- [x] **T-0803 — Implement watchlist use cases and endpoints.** Add the current user's query plus idempotent `PUT` and `DELETE` operations with ownership enforcement. Covers FR-WAT-001 through FR-WAT-003.
- [ ] **T-0804 — Enrich watchlist results.** Batch provider/cache lookups, preserve available entries during partial provider failure, and avoid N+1 external calls.
- [x] **T-0805 — Build watchlist UI.** Add authenticated route, empty state, responsive cards, add/remove controls on discovery/detail pages, optimistic or immediate feedback, and sign-in return flow.
- [ ] **T-0806 — Add watchlist tests.** Cover duplicate adds, unauthorized access, cross-user isolation, removal, partial catalog data, session expiry, and critical browser journeys.

Exit criteria: each member can privately and reliably manage a de-duplicated watchlist from all specified views.

## 11. Phase 9 — Reviews and Moderation

- [x] **T-0901 — Implement review domain types.** Add `Review`, `Rating`, `ReviewText`, statuses, author rules, concurrency version, moderation records, and comprehensive domain tests. Covers BR-002 through BR-004.
- [ ] **T-0902 — Persist reviews and audit records.** Add constraints, indexes, optimistic concurrency, soft-delete behavior, repository adapters, migration, and PostgreSQL integration tests.
- [x] **T-0903 — Implement public review queries.** Return paginated published reviews newest first without exposing hidden/deleted content or private user data. Covers FR-REV-001.
- [x] **T-0904 — Implement create-review flow.** Validate rating/text, enforce one active review per user/movie in domain and database, authorize members, and map conflicts. Covers FR-REV-002.
- [x] **T-0905 — Implement edit/delete flow.** Enforce ownership, detect stale versions, update audit timestamps, soft-delete, and test concurrent requests. Covers FR-REV-003.
- [x] **T-0906 — Implement moderation flow.** Enforce administrator policy, require reasons, hide/restore reviews, record immutable audit entries, and test visibility. Covers FR-REV-004.
- [x] **T-0907 — Build review UI.** Add paginated review list, plain-text rendering, Material rating/editor form, validation, edit/delete actions, confirmations, conflict recovery, and user/provider rating distinction.
- [ ] **T-0908 — Build moderation UI.** Add administrator-only queue or review controls, reason dialog, audit context, and hide/restore feedback.
- [ ] **T-0909 — Add abuse controls.** Apply mutation rate limits, text normalization, size limits, telemetry, and moderation alerts without weakening plain-text output encoding.
- [ ] **T-0910 — Add review end-to-end tests.** Cover read/create/edit/delete, duplicate prevention, cross-user denial, stale update, unsafe text display, hidden visibility, and administrator restore.

Exit criteria: members can safely publish and manage one review per movie, and administrators can auditably moderate reviews.

## 12. Phase 10 — Hardening and Release Readiness

- [ ] **T-1001 — Complete threat modeling.** Review trust boundaries, authentication, authorization, CSRF, XSS, injection, SSRF, secrets, provider abuse, logs, and privacy; track mitigations.
- [ ] **T-1002 — Verify security headers and transport.** Test HTTPS redirect, HSTS, CSP, frame policy, MIME protection, cookie attributes, and strict CORS behavior.
- [ ] **T-1003 — Run accessibility acceptance.** Complete automated WCAG checks plus keyboard, screen-reader spot checks, zoom/reflow, contrast, reduced-motion, and error identification. Covers NFR-ACC-001 through NFR-ACC-003.
- [ ] **T-1004 — Run performance and load tests.** Verify API p95 targets, frontend budgets, image behavior, database indexes/pool, cache hit rate, and provider concurrency under the agreed baseline.
- [ ] **T-1005 — Verify reliability behavior.** Exercise provider outage, provider rate limit, database restart, stale cache, cancellation, deployment restart, and health probes.
- [ ] **T-1006 — Finalize observability.** Create operational dashboards and alerts for errors, latency, dependencies, cache, database, authentication anomalies, and moderation. Covers NFR-OBS-002.
- [ ] **T-1007 — Define backup and recovery.** Configure encrypted backups and point-in-time recovery, document recovery objectives, and perform a restoration test.
- [ ] **T-1008 — Create the Docker deployment pipeline.** Build multi-stage images once, generate an SBOM, scan for critical vulnerabilities, publish versioned images, record immutable digests, run migration gates, promote the same digests to staging and production, smoke test, require production approval, and support rollback or forward-fix. Covers NFR-DEP-002 and NFR-DEP-004.
- [ ] **T-1009 — Complete legal and privacy review.** Publish privacy/retention behavior, TMDB attribution, terms links, account deletion handling, and telemetry disclosures.
- [ ] **T-1010 — Prepare operational documentation.** Add environment setup, configuration reference, deployment, migration, rollback, provider outage, credential rotation, alert response, and incident runbooks.
- [ ] **T-1011 — Conduct release acceptance.** Verify requirement traceability, zero unresolved critical defects, successful migrations, green CI, accepted risk register, and stakeholder sign-off.

Exit criteria: the release candidate meets functional, security, accessibility, performance, reliability, observability, legal, and operational acceptance criteria.

## 13. Phase 11 — Production Launch and Follow-Up

- [ ] **T-1101 — Provision production.** Create isolated production database, secret storage, TLS, DNS, telemetry, backups, resource limits, and least-privilege service identities.
- [ ] **T-1102 — Deploy the release candidate.** Run migrations as a separate single-instance job from the approved API image, deploy the approved Docker image digests, inject secrets at runtime, verify readiness and graceful shutdown, and run smoke tests without exposing test accounts or secrets.
- [ ] **T-1103 — Monitor launch.** Observe error rate, latency, provider behavior, database capacity, authentication anomalies, and Core Web Vitals during the agreed launch window.
- [ ] **T-1104 — Validate recovery.** Confirm current backups, alert delivery, rollback procedure, and on-call contacts.
- [ ] **T-1105 — Review outcomes.** Compare success metrics with actual telemetry, collect user feedback, close or prioritize launch findings, and update the specification for the next increment.

Exit criteria: production is stable through the launch window, recovery controls are verified, and follow-up work is prioritized from evidence.

## 14. Continuous Definition of Done

Every completed task must satisfy all applicable items:

- Implementation and user-facing text are in English.
- Acceptance criteria and business rules are met.
- Architecture boundaries and dependency direction are preserved.
- Unit, integration, contract, component, or end-to-end tests are added at the appropriate level.
- Relevant security, privacy, accessibility, performance, and observability concerns are addressed.
- Database schema changes include a reviewed migration and rollout plan.
- API changes update OpenAPI and typed frontend contracts.
- Logs contain no secrets or unnecessary personal data.
- Documentation and requirement traceability are updated.
- CI formatting, static analysis, tests, vulnerability policy, and production builds pass.
- The change is reviewed and demonstrable in a production-like environment.
