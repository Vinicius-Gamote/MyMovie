import {
  AfterViewChecked,
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  input,
  output,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MovieSummary } from '../core/models';
import { MovieCardComponent } from './movie-card.component';

@Component({
  selector: 'app-movie-carousel',
  imports: [MatButtonModule, MovieCardComponent],
  template: `
    <div class="carousel" role="region" aria-roledescription="carousel" [attr.aria-label]="label()">
      <div class="carousel-toolbar">
        <p class="carousel-position" aria-live="polite" aria-atomic="true">
          Movie {{ activeMovieIndex() + 1 }} of {{ movies().length }}
        </p>
        <div class="carousel-actions" aria-label="Carousel controls">
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'Show previous movies in ' + label()"
            [disabled]="!canGoPrevious()"
            (click)="scrollByPage(-1)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            mat-icon-button
            type="button"
            [attr.aria-label]="'Show next movies in ' + label()"
            [disabled]="!canGoNext()"
            (click)="scrollByPage(1)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>

      <div
        #track
        class="carousel-track"
        role="list"
        tabindex="0"
        [attr.aria-label]="label() + ' movies'"
        (scroll)="onScroll()"
        (keydown)="onKeydown($event)"
      >
        @for (movie of movies(); track movie.id) {
          <article class="carousel-slide" role="listitem">
            <app-movie-card [movie]="movie" (opened)="opened.emit(movie)" />
            @if (allowRemoval()) {
              <button
                class="remove-action"
                mat-stroked-button
                type="button"
                (click)="removeRequested.emit(movie)"
                [attr.aria-label]="'Remove ' + movie.title + ' from watchlist'"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M5 12h14" />
                </svg>
                Remove
              </button>
            }
          </article>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      max-width: 100%;
    }
    .carousel {
      min-width: 0;
      max-width: 100%;
      contain: inline-size;
    }
    .carousel-toolbar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 1rem;
      min-height: 3rem;
      margin-bottom: 0.5rem;
    }
    .carousel-position {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-medium);
      font-variant-numeric: tabular-nums;
    }
    .carousel-actions {
      display: flex;
      gap: 0.35rem;
    }
    .carousel-actions button {
      border: 1px solid color-mix(in srgb, var(--mat-sys-outline) 45%, transparent);
      background: color-mix(in srgb, var(--mat-sys-surface-container-high) 92%, transparent);
    }
    svg {
      display: block;
      width: 1.25rem;
      height: 1.25rem;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .carousel-track {
      display: flex;
      align-items: stretch;
      gap: clamp(0.875rem, 2vw, 1.5rem);
      width: 100%;
      min-width: 0;
      max-width: 100%;
      padding: 0.5rem 0.125rem 1rem;
      overflow-x: auto;
      overflow-y: hidden;
      overscroll-behavior-inline: contain;
      scroll-behavior: smooth;
      scroll-padding-inline: 0.125rem;
      scroll-snap-type: inline mandatory;
      scrollbar-width: none;
      touch-action: pan-x pan-y;
    }
    .carousel-track::-webkit-scrollbar {
      display: none;
    }
    .carousel-slide {
      display: flex;
      flex: 0 0 clamp(13rem, 20vw, 16rem);
      flex-direction: column;
      min-width: 0;
      max-width: 16rem;
      scroll-snap-align: start;
      scroll-snap-stop: normal;
    }
    app-movie-card {
      display: block;
      height: 100%;
    }
    .remove-action {
      width: 100%;
      margin-top: 0.75rem;
    }
    .remove-action svg {
      margin-right: 0.5rem;
    }
    @media (max-width: 600px) {
      .carousel-toolbar {
        justify-content: space-between;
      }
      .carousel-slide {
        flex-basis: min(76vw, 16rem);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .carousel-track {
        scroll-behavior: auto;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieCarouselComponent implements AfterViewInit, AfterViewChecked, OnDestroy {
  @ViewChild('track') private track?: ElementRef<HTMLDivElement>;

  readonly movies = input.required<readonly MovieSummary[]>();
  readonly label = input('Movie carousel');
  readonly allowRemoval = input(false);
  readonly opened = output<MovieSummary>();
  readonly removeRequested = output<MovieSummary>();
  readonly endReached = output<void>();

  protected readonly canGoPrevious = signal(false);
  protected readonly canGoNext = signal(false);
  protected readonly activeMovieIndex = signal(0);

  private resizeObserver?: ResizeObserver;
  private renderedMovieCount = -1;
  private lastEndReachedMovieCount = -1;
  private syncQueued = false;

  ngAfterViewInit(): void {
    const element = this.track?.nativeElement;
    if (!element) return;

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.queueNavigationSync());
      this.resizeObserver.observe(element);
    }
    this.queueNavigationSync();
  }

  ngAfterViewChecked(): void {
    const movieCount = this.movies().length;
    if (this.renderedMovieCount === movieCount) return;

    this.renderedMovieCount = movieCount;
    this.queueNavigationSync();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  protected onScroll(): void {
    this.syncNavigationState();
  }

  protected scrollByPage(direction: -1 | 1): void {
    const element = this.track?.nativeElement;
    if (!element) return;

    const firstSlide = element.querySelector<HTMLElement>('.carousel-slide');
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    const slideStep = (firstSlide?.offsetWidth ?? element.clientWidth) + gap;
    const visibleSlides = Math.max(1, Math.floor((element.clientWidth + gap) / slideStep));

    element.scrollBy({
      left: direction * slideStep * visibleSlides,
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }

  protected onKeydown(event: KeyboardEvent): void {
    const element = this.track?.nativeElement;
    if (!element) return;

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.scrollByPage(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.scrollByPage(1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      element.scrollTo({ left: 0, behavior: this.prefersReducedMotion() ? 'auto' : 'smooth' });
    } else if (event.key === 'End') {
      event.preventDefault();
      element.scrollTo({
        left: element.scrollWidth,
        behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
      });
    }
  }

  private queueNavigationSync(): void {
    if (this.syncQueued) return;
    this.syncQueued = true;
    queueMicrotask(() => {
      this.syncQueued = false;
      this.syncNavigationState();
    });
  }

  private syncNavigationState(): void {
    const element = this.track?.nativeElement;
    if (!element) return;

    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const currentScroll = Math.max(0, element.scrollLeft);
    const threshold = 3;

    this.canGoPrevious.set(currentScroll > threshold);
    this.canGoNext.set(currentScroll < maxScroll - threshold);

    const slides = Array.from(element.querySelectorAll<HTMLElement>('.carousel-slide'));
    if (slides.length > 0) {
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft - currentScroll);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      this.activeMovieIndex.set(nearestIndex);
    } else {
      this.activeMovieIndex.set(0);
    }

    const preloadDistance = Math.max(slides[0]?.offsetWidth ?? 0, element.clientWidth * 0.15);
    const remaining = maxScroll - currentScroll;
    if (
      maxScroll > threshold &&
      remaining <= preloadDistance &&
      this.lastEndReachedMovieCount !== this.movies().length
    ) {
      this.lastEndReachedMovieCount = this.movies().length;
      this.endReached.emit();
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
