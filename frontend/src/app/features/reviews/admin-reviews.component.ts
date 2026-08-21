import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ApiService } from '../../core/api.service';
import { ReviewStatus, ReviewView } from '../../core/models';
import { ModerationDialogComponent } from './moderation-dialog.component';

@Component({
  selector: 'app-admin-reviews',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  template: `
    <header>
      <p class="eyebrow">ADMINISTRATION</p>
      <h1 class="page-heading">Review moderation</h1>
      <p class="page-intro">Hide or restore member reviews with a required, auditable reason.</p>
    </header>
    <mat-form-field appearance="outline"
      ><mat-label>Review status</mat-label
      ><mat-select [formControl]="status"
        ><mat-option value="Published">Published</mat-option
        ><mat-option value="Hidden">Hidden</mat-option></mat-select
      ></mat-form-field
    >
    @if (loading()) {
      <section class="centered-state">
        <mat-spinner diameter="44" />
        <p>Loading reviews…</p>
      </section>
    } @else if (error()) {
      <section class="centered-state" role="alert">
        <p>The moderation queue could not be loaded.</p>
        <button mat-stroked-button (click)="load()">Try again</button>
      </section>
    } @else if (reviews().length === 0) {
      <section class="centered-state">
        <mat-icon aria-hidden="true">✓</mat-icon>
        <h2>No {{ status.value.toLowerCase() }} reviews</h2>
      </section>
    } @else {
      <div class="queue">
        @for (review of reviews(); track review.id) {
          <article>
            <header>
              <div>
                <strong>{{ review.authorDisplayName }}</strong
                ><span
                  >Movie ID {{ review.movieId }} · {{ review.updatedAt | date: 'medium' }}</span
                >
              </div>
              <span class="rating"
                ><mat-icon aria-hidden="true">★</mat-icon>{{ review.rating }} / 10</span
              >
            </header>
            <p>{{ review.text }}</p>
            <div class="actions">
              @if (review.status === 'Published') {
                <button mat-flat-button (click)="moderate(review, 'Hide')">
                  <mat-icon aria-hidden="true">○</mat-icon>Hide review
                </button>
              } @else {
                <button mat-flat-button (click)="moderate(review, 'Restore')">
                  <mat-icon aria-hidden="true">●</mat-icon>Restore review
                </button>
              }
            </div>
          </article>
        }
      </div>
    }
  `,
  styles: `
    header {
      margin-bottom: 2rem;
    }
    .eyebrow {
      margin: 0;
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      letter-spacing: 0.15em;
    }
    .queue {
      display: grid;
      gap: 1rem;
    }
    .queue article {
      padding: 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 1rem;
      background: var(--mat-sys-surface-container-low);
    }
    .queue article > header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      margin: 0;
    }
    .queue article > header div {
      display: grid;
      gap: 0.25rem;
    }
    .queue article > header span,
    .queue article > header div span {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .queue article > p {
      max-width: 80ch;
      white-space: pre-wrap;
      line-height: 1.6;
    }
    .rating {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }
    .rating mat-icon {
      color: #facc15;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    .centered-state > mat-icon {
      width: 3rem;
      height: 3rem;
      font-size: 3rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminReviewsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  readonly status = new FormControl<ReviewStatus>('Published', { nonNullable: true });
  protected readonly reviews = signal<ReviewView[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  ngOnInit(): void {
    this.status.valueChanges.subscribe(() => this.load());
    this.load();
  }
  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.api.moderationQueue(this.status.value).subscribe({
      next: (result) => {
        this.reviews.set(result.items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
  moderate(review: ReviewView, action: 'Hide' | 'Restore'): void {
    this.dialog
      .open(ModerationDialogComponent, { data: { action } })
      .afterClosed()
      .subscribe((reason: string | undefined) => {
        if (!reason) return;
        const request =
          action === 'Hide'
            ? this.api.hideReview(review.id, reason)
            : this.api.restoreReview(review.id, reason);
        request.subscribe({
          next: () => {
            this.reviews.update((items) => items.filter((item) => item.id !== review.id));
            this.snackBar.open(`Review ${action.toLowerCase()}d.`, 'Close', { duration: 3500 });
          },
          error: () =>
            this.snackBar.open('The moderation action failed.', 'Close', { duration: 4000 }),
        });
      });
  }
}
