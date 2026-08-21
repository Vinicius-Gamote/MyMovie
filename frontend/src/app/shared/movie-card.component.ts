import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { MovieSummary } from '../core/models';

@Component({
  selector: 'app-movie-card',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatCardModule, MatIconModule, RouterLink],
  template: `
    <mat-card class="movie-card" appearance="outlined">
      <a
        class="poster-link"
        [routerLink]="['/movies', movie().id]"
        (click)="opened.emit()"
        [attr.aria-label]="'View details for ' + movie().title"
      >
        @if (movie().posterUrl; as posterUrl) {
          <img
            [src]="posterUrl"
            [alt]="movie().title + ' poster'"
            loading="lazy"
            width="500"
            height="750"
          />
        } @else {
          <div
            class="poster-fallback"
            role="img"
            [attr.aria-label]="'Poster unavailable for ' + movie().title"
          >
            <mat-icon aria-hidden="true">◆</mat-icon><span>Poster unavailable</span>
          </div>
        }
      </a>
      <mat-card-header>
        <mat-card-title>{{ movie().title }}</mat-card-title>
        <mat-card-subtitle>{{
          movie().releaseDate ? (movie().releaseDate | date: 'yyyy') : 'Release date unavailable'
        }}</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <p class="overview">{{ movie().overview || 'No synopsis is currently available.' }}</p>
        <p
          class="rating"
          [attr.aria-label]="
            movie().providerRating === null
              ? 'TMDB rating unavailable'
              : 'TMDB rating ' + movie().providerRating + ' out of 10'
          "
        >
          <mat-icon aria-hidden="true">★</mat-icon>
          <strong>{{
            movie().providerRating === null ? '—' : (movie().providerRating | number: '1.1-1')
          }}</strong>
          <span>TMDB</span>
        </p>
      </mat-card-content>
      <mat-card-actions
        ><a mat-button [routerLink]="['/movies', movie().id]" (click)="opened.emit()"
          >View details</a
        ></mat-card-actions
      >
    </mat-card>
  `,
  styles: `
    .movie-card {
      width: 100%;
      max-width: 16rem;
      height: 100%;
      overflow: hidden;
      background: color-mix(in srgb, var(--mat-sys-surface-container) 94%, transparent);
    }
    .poster-link {
      display: block;
      width: 100%;
      aspect-ratio: 2 / 3;
      overflow: hidden;
      background: var(--mat-sys-surface-container-highest);
    }
    img,
    .poster-fallback {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
    }
    img {
      transition: transform 220ms ease;
    }
    .poster-link:hover img {
      transform: scale(1.025);
    }
    .poster-fallback {
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 0.75rem;
      color: var(--mat-sys-on-surface-variant);
    }
    .poster-fallback mat-icon {
      width: 3rem;
      height: 3rem;
      font-size: 3rem;
    }
    mat-card-header {
      min-height: 5.5rem;
    }
    mat-card-title {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .overview {
      display: -webkit-box;
      min-height: 3.9rem;
      margin: 0.75rem 0;
      overflow: hidden;
      color: var(--mat-sys-on-surface-variant);
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
    .rating {
      display: flex;
      align-items: center;
      gap: 0.35rem;
      margin: 0;
    }
    .rating mat-icon {
      color: #facc15;
    }
    .rating span {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-small);
    }
    mat-card-actions {
      margin-top: auto;
    }
    @media (prefers-reduced-motion: reduce) {
      img {
        transition: none;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MovieCardComponent {
  readonly movie = input.required<MovieSummary>();
  readonly opened = output<void>();
}
