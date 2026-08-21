import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { WatchlistItem } from '../../core/models';
import { MovieCardComponent } from '../../shared/movie-card.component';

@Component({
  selector: 'app-watchlist',
  imports: [
    RouterLink,
    MovieCardComponent,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <header>
      <p class="eyebrow">SAVED FOR LATER</p>
      <h1 class="page-heading">My watchlist</h1>
      <p class="page-intro">A private collection of the movies you do not want to miss.</p>
    </header>
    @if (loading()) {
      <section class="centered-state" aria-live="polite">
        <mat-spinner diameter="44" />
        <p>Loading your watchlist…</p>
      </section>
    } @else if (error()) {
      <section class="centered-state" role="alert">
        <mat-icon aria-hidden="true">☁</mat-icon>
        <h2>Watchlist unavailable</h2>
        <p>Your saved movies could not be loaded.</p>
        <button mat-stroked-button (click)="load()">Try again</button>
      </section>
    } @else if (items().length === 0) {
      <section class="centered-state">
        <mat-icon aria-hidden="true">+</mat-icon>
        <h2>Your watchlist is empty</h2>
        <p>Explore current releases and save a movie for later.</p>
        <a mat-flat-button routerLink="/">Discover movies</a>
      </section>
    } @else {
      <div class="movie-grid">
        @for (item of items(); track item.movie.id) {
          <div class="saved-movie">
            <app-movie-card [movie]="item.movie" /><button
              mat-stroked-button
              (click)="remove(item)"
              [attr.aria-label]="'Remove ' + item.movie.title + ' from watchlist'"
            >
              <mat-icon aria-hidden="true">−</mat-icon>Remove
            </button>
          </div>
        }
      </div>
    }
  `,
  styles: `
    header {
      margin-bottom: 2.5rem;
    }
    .eyebrow {
      margin: 0;
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      letter-spacing: 0.15em;
    }
    .saved-movie {
      display: grid;
      gap: 0.75rem;
      align-content: start;
    }
    .saved-movie > button {
      justify-self: stretch;
    }
    .centered-state > mat-icon {
      width: 4rem;
      height: 4rem;
      font-size: 4rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WatchlistComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly snackBar = inject(MatSnackBar);
  protected readonly items = signal<WatchlistItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  ngOnInit(): void {
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.watchlist().subscribe({
      next: (result) => {
        this.items.set(result.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
  remove(item: WatchlistItem): void {
    this.api.removeFromWatchlist(item.movie.id).subscribe({
      next: () => {
        this.items.update((items) =>
          items.filter((candidate) => candidate.movie.id !== item.movie.id),
        );
        this.snackBar.open(`${item.movie.title} was removed.`, 'Close', { duration: 3500 });
      },
      error: () =>
        this.snackBar.open('The movie could not be removed.', 'Close', { duration: 3500 }),
    });
  }
}
