import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { ApiService } from '../../core/api.service';
import { MovieSummary, ProblemDetails } from '../../core/models';
import { FieldIconComponent } from '../../shared/field-icon.component';
import { MovieCardComponent } from '../../shared/movie-card.component';

@Component({
  selector: 'app-search',
  imports: [
    ReactiveFormsModule,
    FieldIconComponent,
    MovieCardComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <header>
      <h1 class="page-heading">Search movies</h1>
      <p class="page-intro">Search the TMDB catalog by movie title.</p>
    </header>
    <mat-form-field appearance="outline" subscriptSizing="dynamic" class="search-field">
      <mat-label>Movie title</mat-label><app-field-icon matPrefix icon="search" />
      <input matInput type="search" [formControl]="query" autocomplete="off" maxlength="120" />
      @if (query.value) {
        <button
          mat-icon-button
          matSuffix
          type="button"
          aria-label="Clear search"
          (click)="query.setValue('')"
        >
          <app-field-icon icon="close" />
        </button>
      }
      <mat-hint>Enter at least one character</mat-hint>
    </mat-form-field>

    @if (loading()) {
      <section class="centered-state" aria-live="polite">
        <mat-spinner diameter="44" />
        <p>Searching movies…</p>
      </section>
    } @else if (error(); as message) {
      <section class="centered-state" role="alert">
        <mat-icon aria-hidden="true">☁</mat-icon>
        <h2>Search is unavailable</h2>
        <p>{{ message }}</p>
      </section>
    } @else if (searched() && movies().length === 0) {
      <section class="centered-state">
        <mat-icon aria-hidden="true">∅</mat-icon>
        <h2>No movies found</h2>
        <p>Try a different or shorter title.</p>
      </section>
    } @else if (movies().length > 0) {
      <p class="result-count" aria-live="polite">
        {{ totalResults() }} results for “{{ activeQuery() }}”
      </p>
      <div class="movie-grid">
        @for (movie of movies(); track movie.id) {
          <app-movie-card [movie]="movie" />
        }
      </div>
      @if (hasNextPage()) {
        <div class="load-more">
          <button mat-stroked-button (click)="loadMore()">Load more results</button>
        </div>
      }
    } @else {
      <section class="search-prompt">
        <mat-icon aria-hidden="true">◆</mat-icon>
        <p>Start typing to discover a movie.</p>
      </section>
    }
  `,
  styles: `
    header {
      margin-bottom: 2rem;
    }
    .search-field {
      width: min(100%, 42rem);
      max-width: 100%;
    }
    .result-count {
      margin: 1.5rem 0;
      color: var(--mat-sys-on-surface-variant);
    }
    .search-prompt {
      display: grid;
      place-items: center;
      min-height: 20rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .search-prompt mat-icon,
    .centered-state > mat-icon {
      width: 4rem;
      height: 4rem;
      font-size: 4rem;
    }
    .load-more {
      display: grid;
      place-items: center;
      padding: 3rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly query = new FormControl(this.route.snapshot.queryParamMap.get('q') ?? '', {
    nonNullable: true,
  });
  protected readonly movies = signal<MovieSummary[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly searched = signal(false);
  protected readonly activeQuery = signal('');
  protected readonly page = signal(1);
  protected readonly hasNextPage = signal(false);
  protected readonly totalResults = signal(0);

  ngOnInit(): void {
    this.query.valueChanges
      .pipe(
        startWith(this.query.value),
        debounceTime(350),
        distinctUntilChanged(),
        tap((value) => {
          const query = value.trim();
          this.activeQuery.set(query);
          this.page.set(1);
          this.movies.set([]);
          this.error.set(null);
          this.searched.set(query.length > 0);
          void this.router.navigate([], {
            queryParams: query ? { q: query } : {},
            replaceUrl: true,
          });
        }),
        switchMap((value) => {
          const query = value.trim();
          if (!query) return of(null);
          this.loading.set(true);
          return this.api.searchMovies(query, 1).pipe(
            catchError((error: HttpErrorResponse) => {
              this.error.set(
                (error.error as ProblemDetails | undefined)?.detail ??
                  'Search could not be completed.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => {
        this.loading.set(false);
        if (!result) return;
        this.movies.set(result.items);
        this.hasNextPage.set(result.hasNextPage);
        this.totalResults.set(result.totalResults);
      });
  }

  loadMore(): void {
    if (this.loading() || !this.hasNextPage()) return;
    const nextPage = this.page() + 1;
    this.loading.set(true);
    this.api.searchMovies(this.activeQuery(), nextPage).subscribe({
      next: (result) => {
        const byId = new Map(this.movies().map((movie) => [movie.id, movie]));
        result.items.forEach((movie) => byId.set(movie.id, movie));
        this.movies.set([...byId.values()]);
        this.page.set(result.page);
        this.hasNextPage.set(result.hasNextPage);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Additional results could not be loaded.');
        this.loading.set(false);
      },
    });
  }
}
