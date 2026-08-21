import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { MovieSummary, ProblemDetails } from '../../core/models';

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly api = inject(ApiService);
  readonly movies = signal<MovieSummary[]>([]);
  readonly page = signal(0);
  readonly hasNextPage = signal(true);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly scrollPosition = signal(0);

  loadInitial(): void {
    if (this.movies().length > 0 || this.loading()) return;
    this.loadPage(1, true);
  }

  loadMore(): void {
    if (this.loading() || !this.hasNextPage()) return;
    this.loadPage(this.page() + 1, false);
  }

  retry(): void {
    this.error.set(null);
    this.loadPage(Math.max(this.page() + 1, 1), this.movies().length === 0);
  }

  rememberScroll(): void {
    this.scrollPosition.set(window.scrollY);
  }

  private loadPage(page: number, replace: boolean): void {
    this.loading.set(true);
    this.error.set(null);
    this.api
      .latestMovies(page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (result) => {
          const existing = replace ? [] : this.movies();
          const byId = new Map(existing.map((movie) => [movie.id, movie]));
          result.items.forEach((movie) => byId.set(movie.id, movie));
          this.movies.set([...byId.values()]);
          this.page.set(result.page);
          this.hasNextPage.set(result.hasNextPage);
        },
        error: (error: HttpErrorResponse) => this.error.set(this.message(error)),
      });
  }

  private message(error: HttpErrorResponse): string {
    const problem = error.error as ProblemDetails | undefined;
    return problem?.detail ?? 'Movies could not be loaded. Please try again.';
  }
}
