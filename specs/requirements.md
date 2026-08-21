# Movie Database App — Software Requirements Specification

## 1. Document Purpose

This document defines the product requirements, scope, acceptance criteria, and quality attributes for the Movie Database App. It is the source of truth for product behavior. Technical implementation decisions are documented in `Design.md`, and the delivery plan is documented in `Tasks.md`.

## 2. Product Summary

The Movie Database App helps people discover their next movie by presenting current releases and useful movie information, including synopsis, ratings, cast, release date, genres, and artwork. Registered users can also maintain a personal watchlist and publish reviews.

The application obtains movie catalog data from an external provider. The initial provider is [The Movie Database (TMDB) API](https://developer.themoviedb.org/docs/getting-started), accessed only through the backend.

## 3. Goals

- Make current and recently released movies easy to discover.
- Let users browse movies in release-date order without losing their position.
- Provide a dedicated, informative page for every movie.
- Let registered users save movies for later and share reviews.
- Deliver a responsive, accessible, secure, and observable web application.

## 4. Scope

### 4.1 Minimum Viable Product (MVP)

- Latest-movie feed on the home page.
- Progressive loading of additional movies ordered by release date.
- Movie details page with synopsis, ratings, genres, runtime, release information, artwork, and cast.
- Search by movie title.
- Responsive user interface with loading, empty, and error states.
- Backend integration with TMDB; the browser must never receive the TMDB credential.

### 4.2 Post-MVP Features

- Local user registration, sign-in, sign-out, and account management.
- Personal watchlist.
- User reviews and ratings.
- Review moderation capabilities for administrators.

### 4.3 Out of Scope for the Initial Release

- Movie streaming, downloading, or hosting.
- Ticket purchasing.
- Social feeds, private messaging, or following other users.
- TV series catalog support.
- Multiple external movie providers at the same time.
- Native mobile applications.

## 5. Actors

- **Visitor:** an unauthenticated person who can browse, search, and read movie information and published reviews.
- **Member:** an authenticated person who has all visitor capabilities and can manage a watchlist and their own reviews.
- **Administrator:** an authorized person who can moderate user-generated reviews.
- **Movie data provider:** the external service that supplies movie metadata, images, credits, and provider ratings.

## 6. Assumptions and Constraints

- The application language, documentation, code identifiers, UI copy, and presentation content are English.
- Movie data availability and accuracy depend on TMDB.
- A valid TMDB access token and compliance with the provider's attribution and terms are required before deployment.
- Times are stored in UTC. Movie release dates are represented as calendar dates without a time zone.
- The first production release targets current evergreen desktop and mobile browsers supported by the selected Angular version.
- PostgreSQL is the system of record for local accounts, watchlists, reviews, and cached provider data.
- Docker is the standard container technology for reproducible local environments, integration tests, and deployable application artifacts.

## 7. Functional Requirements

### 7.1 Catalog and Discovery

#### FR-CAT-001 — Latest movies

The system shall display a home-page feed of the latest movies available from the configured provider.

Acceptance criteria:

- Movie cards show at least poster, title, release date, and provider rating when those values exist.
- Results are ordered by release date descending, with a deterministic secondary order.
- The page displays a skeleton or progress state while data is loading.
- Missing posters or metadata use an accessible fallback instead of a broken layout.
- If the provider cannot be reached and no usable cache exists, the user sees a recoverable error state.

#### FR-CAT-002 — Progressive browsing

The system shall let users load additional movies while preserving release-date order.

Acceptance criteria:

- Reaching the loading boundary or activating a “Load more” control requests the next page once.
- Already displayed movies are not duplicated.
- The UI indicates when no more results are available.
- Returning from a movie page restores the prior result set and scroll position during the same browser session.

#### FR-CAT-003 — Movie search

The system shall let users search for movies by title.

Acceptance criteria:

- Blank queries do not call the provider.
- Search input is debounced and an earlier request can be cancelled when a newer query is entered.
- Search results use the same movie-card information and navigation behavior as the latest-movie feed.
- A clear empty state is shown when no movie matches.

#### FR-CAT-004 — Movie details

The system shall provide a separate route and page for each selected movie.

Acceptance criteria:

- The page is addressable by a stable route containing the provider movie ID.
- It displays title, synopsis, release date, runtime, genres, poster or backdrop, provider rating, vote count, and main cast when available.
- Each cast entry displays the actor name, character name, and profile image when available.
- Unknown or unavailable values are clearly represented and do not break the page.
- An invalid or unknown movie ID returns a not-found response and page.

### 7.2 Identity and Access

#### FR-ID-001 — Account registration

The system shall allow a visitor to create a local account using a unique email address, display name, and password.

Acceptance criteria:

- Email addresses are normalized and unique.
- Password policy and validation errors are explained without exposing secrets.
- Passwords are stored only as adaptive salted hashes through the identity framework.
- Successful registration creates the account and starts an authenticated session according to the selected authentication policy.

#### FR-ID-002 — Authentication

The system shall allow a member to sign in and sign out securely.

Acceptance criteria:

- Invalid credentials produce a generic error that does not reveal whether an account exists.
- Protected endpoints reject unauthenticated requests with HTTP 401.
- Sign-out invalidates the application session.
- Authentication secrets are not stored in browser local storage.

#### FR-ID-003 — Authorization

The system shall limit watchlist and review mutations to the owning member and moderation actions to administrators.

Acceptance criteria:

- A member cannot read or mutate another member's private watchlist through modified requests.
- A member can edit or delete only their own review.
- Unauthorized authenticated requests receive HTTP 403 where appropriate.

### 7.3 Watchlist

#### FR-WAT-001 — View watchlist

The system shall provide each member with a private watchlist.

Acceptance criteria:

- The watchlist shows movie cards enriched with current catalog metadata.
- An empty watchlist has a clear call to action to browse movies.
- Only the owning member can access the watchlist.

#### FR-WAT-002 — Add a movie

The system shall allow a member to add a movie to their watchlist from discovery and detail views.

Acceptance criteria:

- Adding the same movie more than once is idempotent and never creates duplicates.
- The UI reflects the saved state after a successful operation.
- Unauthenticated users are prompted to sign in and can return to the originating movie afterward.

#### FR-WAT-003 — Remove a movie

The system shall allow a member to remove a movie from their watchlist.

Acceptance criteria:

- Removal requires the movie to belong to the current member's watchlist.
- The UI reflects removal without requiring a full page reload.

### 7.4 Reviews

#### FR-REV-001 — Read reviews

The system shall display published user reviews on the movie details page.

Acceptance criteria:

- Reviews show display name, rating, review text, and creation or edit date.
- Reviews are paginated and ordered newest first by default.
- Hidden or deleted reviews are not returned to visitors or members.

#### FR-REV-002 — Create a review

The system shall allow a member to submit one review per movie with an integer rating from 1 to 10 and review text.

Acceptance criteria:

- Review text is required and constrained to 50–2,000 characters after trimming.
- A duplicate review for the same member and movie is rejected with a conflict response.
- Content is rendered as plain text; submitted markup or script cannot execute.
- The new review is visible after successful submission unless moderation policy places it in a pending state.

#### FR-REV-003 — Edit or delete a review

The system shall allow a member to edit or delete their own review.

Acceptance criteria:

- Editing updates the rating, text, and modification timestamp.
- Deletion removes the review from public results while preserving the audit information required by policy.
- Concurrent updates are detected and return a conflict instead of silently overwriting newer data.

#### FR-REV-004 — Moderate reviews

The system shall allow administrators to hide or restore reviews and record a moderation reason.

Acceptance criteria:

- Every moderation action records actor, timestamp, action, and reason.
- Hidden reviews are excluded from public responses immediately.

## 8. External Integration Requirements

#### FR-EXT-001 — Provider abstraction

The backend shall access movie data through an application-level provider interface so the external vendor can be replaced without changing domain behavior.

#### FR-EXT-002 — Provider resilience

The backend shall apply timeouts, bounded retries for transient failures, request cancellation, caching, and rate-limit-aware handling to provider calls.

#### FR-EXT-003 — Provider attribution

The UI shall display the attribution and notices required by the configured provider's current terms of use.

#### FR-EXT-004 — Credential protection

Provider credentials shall exist only in backend secret configuration and shall never be committed to source control, logged, or sent to the browser.

## 9. Interface Requirements

- **UI-001:** The interface shall use Angular Material components and design tokens for navigation, cards, grids or columns, form fields, labels, buttons, dialogs, icons, feedback, and motion.
- **UI-002:** The layout shall be responsive from a 320-pixel-wide viewport through large desktop displays.
- **UI-003:** Keyboard focus shall be visible, interaction shall not require a pointer, and semantic headings and accessible names shall be present.
- **UI-004:** User preferences for reduced motion shall be respected.
- **UI-005:** Destructive actions such as deleting a review shall require clear confirmation.
- **UI-006:** Provider and user ratings shall be visually distinguishable.
- **UI-007:** All user-facing text shall be written in English.

## 10. Non-Functional Requirements

### 10.1 Performance

- **NFR-PERF-001:** For cached catalog reads, the backend p95 response time shall be at most 500 ms under the agreed baseline load, excluding network time outside the application boundary.
- **NFR-PERF-002:** For uncached provider-backed reads, the backend p95 response time target shall be at most 2.5 seconds under normal provider conditions.
- **NFR-PERF-003:** The initial home route shall meet agreed budgets for compressed JavaScript, images, and Core Web Vitals before production release.
- **NFR-PERF-004:** Posters and backdrops below the fold shall be lazy-loaded and appropriately sized.

### 10.2 Reliability and Availability

- **NFR-REL-001:** Production availability target shall be 99.5% per calendar month, excluding planned maintenance and upstream-provider outages.
- **NFR-REL-002:** Database changes shall use versioned, repeatable migrations with a documented rollback or forward-fix plan.
- **NFR-REL-003:** Health endpoints shall distinguish liveness from readiness without revealing sensitive details.
- **NFR-REL-004:** Cached movie data may be served stale for a bounded period when the provider is temporarily unavailable.

### 10.3 Security and Privacy

- **NFR-SEC-001:** All production traffic shall use HTTPS.
- **NFR-SEC-002:** Authentication, authorization, input validation, output encoding, secure headers, rate limiting, and secret management shall follow current OWASP guidance.
- **NFR-SEC-003:** State-changing cookie-authenticated requests shall be protected against cross-site request forgery.
- **NFR-SEC-004:** Logs and telemetry shall not contain passwords, tokens, session identifiers, or unnecessary personal data.
- **NFR-SEC-005:** Account and review data shall have documented retention and deletion behavior.

### 10.4 Accessibility and Usability

- **NFR-ACC-001:** The application shall target WCAG 2.2 AA for user journeys in scope.
- **NFR-ACC-002:** Automated accessibility checks and keyboard-only smoke tests shall run before release.
- **NFR-ACC-003:** Color shall not be the only means used to communicate status or rating.

### 10.5 Maintainability and Testability

- **NFR-MNT-001:** Domain logic shall not depend on HTTP, Entity Framework Core, PostgreSQL, Angular, or TMDB implementation types.
- **NFR-MNT-002:** Public backend endpoints shall be described by an OpenAPI document.
- **NFR-MNT-003:** Automated tests shall cover domain rules, application use cases, persistence, provider mapping, API contracts, and critical browser journeys.
- **NFR-MNT-004:** Code formatting, static analysis, tests, and production builds shall run in continuous integration.
- **NFR-MNT-005:** A documented Docker Compose workflow shall start the application and its required local dependencies with environment-specific configuration and no committed secrets.
- **NFR-MNT-006:** Integration tests that require PostgreSQL or other infrastructure shall run against disposable Docker containers to provide isolation and production-compatible behavior.

### 10.6 Portability and Deployment

- **NFR-DEP-001:** Backend and frontend production artifacts shall be packaged as versioned Docker images using multi-stage builds and minimal non-root runtime images.
- **NFR-DEP-002:** The same immutable Docker image digest shall be promoted between deployment environments; environment configuration and secrets shall be injected at runtime.
- **NFR-DEP-003:** Container images shall expose health checks, declare required ports, support graceful shutdown, and persist no application state in the container filesystem.
- **NFR-DEP-004:** Continuous integration shall scan Docker images for known critical vulnerabilities before a production release.

### 10.7 Observability

- **NFR-OBS-001:** The backend shall emit structured logs, request traces, dependency traces, and operational metrics with a shared correlation identifier.
- **NFR-OBS-002:** Dashboards or alerts shall cover elevated error rate, latency, provider failures, database health, and authentication anomalies.

## 11. Business Rules

- **BR-001:** A member can have at most one watchlist entry for a given provider movie ID.
- **BR-002:** A member can publish at most one active review for a given provider movie ID.
- **BR-003:** A user review rating is an integer from 1 through 10 inclusive.
- **BR-004:** Provider ratings are read-only external data and must not be combined with user ratings as if they were the same measurement.
- **BR-005:** Movie identity is the combination of provider and provider movie ID, even when only one provider is initially enabled.
- **BR-006:** Deactivated accounts cannot create or change watchlist entries or reviews.

## 12. Success Metrics

- At least 95% of successful movie-detail requests contain synopsis, release date, and either poster or fallback artwork.
- At least 99% of catalog requests complete without an unhandled application error.
- A new visitor can open a movie detail page from the home page without authentication.
- A registered member can add and later remove a movie from the watchlist in no more than two interactions per action.
- All critical user journeys pass automated end-to-end tests in the release pipeline.

## 13. Requirement Priorities

- **Must:** FR-CAT-001 through FR-CAT-004, FR-EXT-001 through FR-EXT-004, all interface requirements, and all applicable non-functional requirements.
- **Should:** FR-ID-001 through FR-ID-003 and FR-WAT-001 through FR-WAT-003.
- **Could:** FR-REV-001 through FR-REV-004 after identity and watchlist capabilities are stable.

## 14. Open Product Decisions

The following items must be decided before their corresponding implementation task is considered ready:

- Whether registration requires email verification at initial launch.
- Whether new reviews are published immediately or require pre-moderation.
- The final production hosting provider, region, and availability target.
- The precise cache freshness periods permitted by TMDB terms and product expectations.
- The privacy-policy retention period for accounts, reviews, audit records, and telemetry.

## 15. Source Material

- [TMDB API documentation](https://developer.themoviedb.org/docs/getting-started)
- [Original Movie Database App project brief](https://github.com/florinpop17/app-ideas/blob/master/Projects/3-Advanced/Movie-Database-App.md)
- [Movie Database App with React by Oliver Gomes](http://phobic-heat.surge.sh/)
- [Movie Browser App with React, Redux, and Bootstrap by Nataliia Pylypenko](https://api-cinema-10d15.firebaseapp.com/)
