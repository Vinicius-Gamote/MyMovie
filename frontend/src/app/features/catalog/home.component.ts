import { AfterViewInit, ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { InfiniteScrollDirective } from '../../shared/infinite-scroll.directive';
import { MovieCardComponent } from '../../shared/movie-card.component';
import { CatalogStore } from './catalog-store.service';

@Component({
  selector: 'app-home',
  imports: [
    MovieCardComponent,
    InfiniteScrollDirective,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterLink,
  ],
  template: `
    <section class="hero" aria-labelledby="discover-title">
      <p class="eyebrow">CURATED BY RELEASE DATE</p>
      <h1 id="discover-title" class="page-heading">Find the movie for your next great night.</h1>
      <p class="page-intro">
        Explore current releases, reliable ratings, cast details, and everything you need before
        pressing play.
      </p>
      <a mat-flat-button routerLink="/search"
        ><mat-icon aria-hidden="true">⌕</mat-icon> Search the catalog</a
      >
    </section>

    @if (store.movies().length > 0) {
      <section aria-labelledby="latest-title">
        <div class="section-heading">
          <h2 id="latest-title">Latest movies</h2>
          <span>{{ store.movies().length }} loaded</span>
        </div>
        <div class="movie-grid">
          @for (movie of store.movies(); track movie.id) {
            <app-movie-card [movie]="movie" (opened)="store.rememberScroll()" />
          }
        </div>
      </section>
    }

    @if (store.error(); as error) {
      <section class="centered-state" role="alert">
        <mat-icon aria-hidden="true">☁</mat-icon>
        <h2>Movies are temporarily unavailable</h2>
        <p>{{ error }}</p>
        <button mat-stroked-button (click)="store.retry()">Try again</button>
      </section>
    } @else if (store.loading() && store.movies().length === 0) {
      <section class="centered-state" aria-live="polite">
        <mat-spinner diameter="44" />
        <p>Loading the latest movies…</p>
      </section>
    }

    @if (store.movies().length > 0 && store.hasNextPage()) {
      <div class="load-boundary" appInfiniteScroll (reached)="store.loadMore()">
        <button mat-stroked-button (click)="store.loadMore()" [disabled]="store.loading()">
          @if (store.loading()) {
            <mat-spinner diameter="20" />
          } @else {
            <mat-icon aria-hidden="true">↓</mat-icon>
          }
          Load more movies
        </button>
      </div>
    } @else if (store.movies().length > 0 && !store.hasNextPage()) {
      <p class="end-message">You have reached the end of the current catalog.</p>
    }
  `,
  styles: `
    .hero {
      display: grid;
      justify-items: start;
      gap: 1rem;
      padding: clamp(1rem, 5vw, 4rem) 0 clamp(3rem, 7vw, 6rem);
    }
    .hero .page-heading {
      max-width: 18ch;
      font-size: clamp(2.4rem, 7vw, 5.2rem);
      line-height: 0.98;
    }
    .eyebrow {
      margin: 0;
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      letter-spacing: 0.16em;
    }
    .section-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .section-heading h2 {
      margin: 0;
      font: var(--mat-sys-headline-medium);
    }
    .section-heading span,
    .end-message {
      color: var(--mat-sys-on-surface-variant);
    }
    .load-boundary {
      display: grid;
      place-items: center;
      min-height: 10rem;
    }
    .load-boundary button {
      min-width: 13rem;
    }
    .load-boundary mat-spinner {
      display: inline-block;
      margin-right: 0.5rem;
    }
    .end-message {
      margin: 3rem 0 1rem;
      text-align: center;
    }
    .centered-state mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent implements OnInit, AfterViewInit {
  protected readonly store = inject(CatalogStore);

  ngOnInit(): void {
    this.store.loadInitial();
  }
  ngAfterViewInit(): void {
    if (this.store.scrollPosition() > 0)
      queueMicrotask(() => window.scrollTo({ top: this.store.scrollPosition() }));
  }
}
