import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { MovieDetails, ProblemDetails } from '../../core/models';
import { ReviewListComponent } from '../reviews/review-list.component';

@Component({
  selector: 'app-movie-details',
  imports: [
    DatePipe,
    DecimalPipe,
    RouterLink,
    ReviewListComponent,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    @if (loading()) {
      <section class="centered-state" aria-live="polite">
        <mat-spinner diameter="48" />
        <p>Loading movie details…</p>
      </section>
    } @else if (error(); as message) {
      <section class="centered-state" role="alert">
        <mat-icon aria-hidden="true">×</mat-icon>
        <h1>Movie unavailable</h1>
        <p>{{ message }}</p>
        <a mat-stroked-button routerLink="/">Back to Discover</a>
      </section>
    } @else if (movie(); as item) {
      <article>
        <div
          class="backdrop"
          [style.background-image]="
            item.backdropUrl
              ? 'linear-gradient(90deg, rgba(9,13,24,.96), rgba(9,13,24,.5)), url(' +
                item.backdropUrl +
                ')'
              : ''
          "
        >
          <div class="details-grid">
            @if (item.posterUrl) {
              <img
                class="poster"
                [src]="item.posterUrl"
                [alt]="item.title + ' poster'"
                width="500"
                height="750"
              />
            }
            <div class="summary">
              <a class="back-link" routerLink="/"
                ><mat-icon aria-hidden="true">←</mat-icon>Back to Discover</a
              >
              <h1>{{ item.title }}</h1>
              @if (item.tagline) {
                <p class="tagline">{{ item.tagline }}</p>
              }
              <div class="facts">
                <span>{{
                  item.releaseDate
                    ? (item.releaseDate | date: 'longDate')
                    : 'Release date unavailable'
                }}</span
                ><span>{{
                  item.runtimeMinutes ? item.runtimeMinutes + ' min' : 'Runtime unavailable'
                }}</span>
              </div>
              <mat-chip-set aria-label="Movie genres">
                @for (genre of item.genres; track genre) {
                  <mat-chip>{{ genre }}</mat-chip>
                }
              </mat-chip-set>
              <p class="rating">
                <mat-icon aria-hidden="true">★</mat-icon
                ><strong>{{
                  item.providerRating === null ? '—' : (item.providerRating | number: '1.1-1')
                }}</strong
                ><span>/ 10 TMDB · {{ item.voteCount | number }} votes</span>
              </p>
              <p class="overview">{{ item.overview || 'No synopsis is currently available.' }}</p>
              <button mat-flat-button (click)="toggleWatchlist()" [disabled]="watchlistBusy()">
                <mat-icon aria-hidden="true">{{ inWatchlist() ? '−' : '+' }}</mat-icon
                >{{ inWatchlist() ? 'Remove from watchlist' : 'Add to watchlist' }}
              </button>
            </div>
          </div>
        </div>

        <section class="cast" aria-labelledby="cast-title">
          <div>
            <p>ON SCREEN</p>
            <h2 id="cast-title">Main cast</h2>
          </div>
          @if (item.cast.length > 0) {
            <div class="cast-grid">
              @for (member of item.cast; track member.id) {
                <article>
                  <div class="profile">
                    @if (member.profileUrl) {
                      <img
                        [src]="member.profileUrl"
                        [alt]="member.name"
                        loading="lazy"
                        width="185"
                        height="278"
                      />
                    } @else {
                      <mat-icon aria-hidden="true">●</mat-icon>
                    }
                  </div>
                  <strong>{{ member.name }}</strong
                  ><span>{{ member.character }}</span>
                </article>
              }
            </div>
          } @else {
            <p>Cast information is not currently available.</p>
          }
        </section>
        <app-review-list [movieId]="item.id" />
      </article>
    }
  `,
  styles: `
    .backdrop {
      width: 100%;
      min-width: 0;
      max-width: 100%;
      margin: -3rem 0 0;
      padding: clamp(1.5rem, 5vw, 4rem);
      overflow: clip;
      border-radius: 0 0 1.25rem 1.25rem;
      background-size: cover;
      background-position: center;
    }
    .details-grid {
      display: grid;
      grid-template-columns: minmax(10rem, 18rem) minmax(0, 1fr);
      gap: clamp(1.5rem, 5vw, 4rem);
      align-items: center;
      min-width: 0;
    }
    .poster {
      width: 100%;
      max-width: 18rem;
      height: auto;
      aspect-ratio: 2 / 3;
      object-fit: cover;
      object-position: center;
      border-radius: 1rem;
      box-shadow: var(--mat-sys-level5);
    }
    .summary {
      display: grid;
      justify-items: start;
      gap: 1rem;
      max-width: 55rem;
      min-width: 0;
    }
    .summary h1 {
      margin: 0;
      font: var(--mat-sys-display-large);
      line-height: 1;
      letter-spacing: -0.04em;
      overflow-wrap: anywhere;
    }
    .tagline,
    .facts,
    .overview {
      color: var(--mat-sys-on-surface-variant);
    }
    .tagline {
      margin: 0;
      font: var(--mat-sys-title-large);
      font-style: italic;
    }
    .facts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem 1.5rem;
    }
    .overview {
      max-width: 70ch;
      font: var(--mat-sys-body-large);
      line-height: 1.7;
    }
    .rating,
    .back-link {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }
    .rating {
      margin: 0.5rem 0 0;
    }
    .rating mat-icon {
      color: #facc15;
    }
    .rating span {
      color: var(--mat-sys-on-surface-variant);
    }
    .back-link {
      color: var(--mat-sys-on-surface);
      text-decoration: none;
    }
    .cast {
      margin-top: clamp(3rem, 7vw, 6rem);
    }
    .cast > div:first-child p,
    .cast h2 {
      margin: 0;
    }
    .cast > div:first-child p {
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-small);
      letter-spacing: 0.15em;
    }
    .cast h2 {
      font: var(--mat-sys-headline-medium);
    }
    .cast-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(7.5rem, 9rem));
      justify-content: start;
      gap: 1rem;
      margin-top: 1.5rem;
      padding-bottom: 1rem;
    }
    .cast-grid article {
      display: grid;
      align-content: start;
      gap: 0.35rem;
    }
    .cast-grid span {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .profile {
      display: grid;
      place-items: center;
      aspect-ratio: 2 / 3;
      overflow: hidden;
      border-radius: 0.75rem;
      background: var(--mat-sys-surface-container-high);
    }
    .profile img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile mat-icon {
      width: 3rem;
      height: 3rem;
      font-size: 3rem;
    }
    @media (max-width: 700px) {
      .backdrop {
        margin-top: -1.5rem;
      }
      .details-grid {
        grid-template-columns: 1fr;
      }
      .poster {
        width: min(62vw, 14rem);
        justify-self: center;
      }
      .summary h1 {
        font-size: clamp(2.25rem, 12vw, 3.25rem);
        line-height: 1.02;
      }
      .summary > button {
        width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly auth = inject(AuthService);
  protected readonly movie = signal<MovieDetails | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly inWatchlist = signal(false);
  protected readonly watchlistBusy = signal(false);
  private movieId = 0;

  ngOnInit(): void {
    this.movieId = Number(this.route.snapshot.paramMap.get('movieId'));
    this.api.movieDetails(this.movieId).subscribe({
      next: (movie) => {
        this.movie.set(movie);
        this.loading.set(false);
        document.title = `${movie.title} | MyMovie`;
        if (this.auth.isAuthenticated()) this.loadWatchlistState();
      },
      error: (error: HttpErrorResponse) => {
        const problem = error.error as ProblemDetails | undefined;
        this.error.set(
          error.status === 404
            ? 'This movie could not be found.'
            : (problem?.detail ?? 'Movie details could not be loaded.'),
        );
        this.loading.set(false);
      },
    });
  }

  toggleWatchlist(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/sign-in'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    this.watchlistBusy.set(true);
    const request = this.inWatchlist()
      ? this.api.removeFromWatchlist(this.movieId)
      : this.api.addToWatchlist(this.movieId);
    request.subscribe({
      next: () => {
        this.inWatchlist.update((value) => !value);
        this.watchlistBusy.set(false);
        this.snackBar.open(
          this.inWatchlist() ? 'Added to your watchlist.' : 'Removed from your watchlist.',
          'Close',
          { duration: 3500 },
        );
      },
      error: () => {
        this.watchlistBusy.set(false);
        this.snackBar.open('Your watchlist could not be updated.', 'Close', { duration: 4000 });
      },
    });
  }

  private loadWatchlistState(): void {
    this.api.watchlist().subscribe({
      next: (result) =>
        this.inWatchlist.set(result.items.some((item) => item.movie.id === this.movieId)),
    });
  }
}
