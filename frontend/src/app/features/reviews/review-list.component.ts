import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ProblemDetails, ReviewView } from '../../core/models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'app-review-list',
  imports: [
    DatePipe,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  template: `
    <section class="reviews" aria-labelledby="reviews-title">
      <div class="reviews-heading">
        <div>
          <p class="eyebrow">COMMUNITY</p>
          <h2 id="reviews-title">Member reviews</h2>
        </div>
        <span>{{ totalResults() }} published</span>
      </div>

      @if (auth.isAuthenticated() && !ownReview()) {
        <mat-card appearance="outlined" class="editor">
          <mat-card-header><mat-card-title>Share your review</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="form" (ngSubmit)="submit()">
              <mat-form-field appearance="outline"
                ><mat-label>Rating</mat-label
                ><mat-select formControlName="rating">
                  @for (rating of ratings; track rating) {
                    <mat-option [value]="rating">{{ rating }} / 10</mat-option>
                  }
                </mat-select></mat-form-field
              >
              <mat-form-field appearance="outline" class="review-text"
                ><mat-label>Review</mat-label
                ><textarea matInput formControlName="text" rows="5" maxlength="2000"></textarea
                ><mat-hint align="end">{{ form.controls.text.value.length }} / 2,000</mat-hint>
                @if (form.controls.text.touched && form.controls.text.invalid) {
                  <mat-error>Use between 50 and 2,000 characters.</mat-error>
                }
              </mat-form-field>
              @if (formError(); as message) {
                <p class="form-error" role="alert">{{ message }}</p>
              }
              <button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
                {{ saving() ? 'Publishing…' : 'Publish review' }}
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      } @else if (!auth.isAuthenticated()) {
        <p class="sign-in-prompt">
          <a routerLink="/sign-in">Sign in</a> to publish a review or add this movie to your
          watchlist.
        </p>
      }

      @if (loading()) {
        <div class="centered-state">
          <mat-spinner diameter="40" />
          <p>Loading reviews…</p>
        </div>
      } @else if (error(); as message) {
        <div class="centered-state" role="alert">
          <p>{{ message }}</p>
          <button mat-stroked-button (click)="load()">Try again</button>
        </div>
      } @else if (reviews().length === 0) {
        <div class="empty-reviews">
          <mat-icon aria-hidden="true">✎</mat-icon>
          <h3>No reviews yet</h3>
          <p>Be the first member to share a thoughtful take.</p>
        </div>
      } @else {
        <div class="review-list">
          @for (review of reviews(); track review.id) {
            <article class="review-item">
              <header>
                <div>
                  <strong>{{ review.authorDisplayName }}</strong
                  ><span>{{ review.updatedAt | date: 'mediumDate' }}</span>
                </div>
                <p>
                  <mat-icon aria-hidden="true">★</mat-icon><strong>{{ review.rating }}</strong
                  ><span>/ 10 · Member rating</span>
                </p>
              </header>
              @if (editingId() === review.id) {
                <form [formGroup]="form" (ngSubmit)="submitEdit(review)">
                  <mat-form-field appearance="outline"
                    ><mat-label>Rating</mat-label
                    ><mat-select formControlName="rating">
                      @for (rating of ratings; track rating) {
                        <mat-option [value]="rating">{{ rating }} / 10</mat-option>
                      }
                    </mat-select></mat-form-field
                  >
                  <mat-form-field appearance="outline" class="review-text"
                    ><mat-label>Review</mat-label
                    ><textarea matInput formControlName="text" rows="5" maxlength="2000"></textarea>
                  </mat-form-field>
                  <div class="edit-actions">
                    <button mat-button type="button" (click)="cancelEdit()">Cancel</button
                    ><button mat-flat-button type="submit" [disabled]="form.invalid || saving()">
                      Save changes
                    </button>
                  </div>
                </form>
              } @else {
                <p class="review-copy">{{ review.text }}</p>
                @if (auth.user()?.id === review.authorUserId) {
                  <div class="owner-actions">
                    <button mat-button (click)="beginEdit(review)">
                      <mat-icon aria-hidden="true">✎</mat-icon>Edit</button
                    ><button mat-button (click)="confirmDelete(review)">
                      <mat-icon aria-hidden="true">×</mat-icon>Delete
                    </button>
                  </div>
                }
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    .reviews {
      margin-top: clamp(3rem, 7vw, 6rem);
    }
    .reviews-heading {
      display: flex;
      align-items: end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .reviews-heading h2,
    .eyebrow {
      margin: 0;
    }
    .reviews-heading h2 {
      font: var(--mat-sys-headline-medium);
    }
    .reviews-heading > span,
    .eyebrow,
    .sign-in-prompt {
      color: var(--mat-sys-on-surface-variant);
    }
    .eyebrow {
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-small);
      letter-spacing: 0.15em;
    }
    .editor {
      margin-bottom: 2rem;
    }
    form {
      display: flex;
      flex-wrap: wrap;
      align-items: start;
      gap: 1rem;
      min-width: 0;
      padding-top: 1rem;
    }
    .review-text {
      flex: 1 1 28rem;
      min-width: 0;
      max-width: 100%;
    }
    form button[type='submit'] {
      margin-top: 0.25rem;
    }
    .form-error {
      flex-basis: 100%;
      margin: 0;
      color: var(--mat-sys-error);
    }
    .review-list {
      display: grid;
      gap: 1rem;
    }
    .review-item {
      padding: 1.25rem;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 1rem;
      background: var(--mat-sys-surface-container-low);
    }
    .review-item header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
    }
    .review-item header div {
      display: grid;
      gap: 0.25rem;
    }
    .review-item header span {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .review-item header p {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin: 0;
    }
    .review-item header mat-icon {
      color: #facc15;
    }
    .review-copy {
      max-width: 75ch;
      white-space: pre-wrap;
      line-height: 1.65;
    }
    .owner-actions,
    .edit-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    .empty-reviews {
      display: grid;
      justify-items: center;
      padding: 3rem;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .empty-reviews mat-icon {
      width: 3rem;
      height: 3rem;
      font-size: 3rem;
    }
    @media (max-width: 600px) {
      .reviews-heading {
        align-items: start;
        flex-direction: column;
      }
      .review-item header {
        flex-direction: column;
      }
      form > mat-form-field,
      form > button[type='submit'] {
        width: 100%;
      }
      .owner-actions,
      .edit-actions {
        flex-wrap: wrap;
      }
      .empty-reviews {
        padding-inline: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly auth = inject(AuthService);
  readonly movieId = input.required<number>();
  protected readonly reviews = signal<ReviewView[]>([]);
  protected readonly totalResults = signal(0);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly ratings = Array.from({ length: 10 }, (_, index) => index + 1).reverse();
  protected readonly ownReview = () =>
    this.reviews().find((review) => review.authorUserId === this.auth.user()?.id);
  protected readonly form = this.formBuilder.nonNullable.group({
    rating: [8, [Validators.required, Validators.min(1), Validators.max(10)]],
    text: ['', [Validators.required, Validators.minLength(50), Validators.maxLength(2000)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.reviews(this.movieId()).subscribe({
      next: (result) => {
        this.reviews.set(result.items);
        this.totalResults.set(result.totalResults);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Reviews could not be loaded.');
        this.loading.set(false);
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();
    this.api.createReview(this.movieId(), value.rating, value.text).subscribe({
      next: (review) => {
        this.reviews.update((items) => [review, ...items]);
        this.totalResults.update((total) => total + 1);
        this.form.reset({ rating: 8, text: '' });
        this.saving.set(false);
        this.snackBar.open('Your review was published.', 'Close', { duration: 3500 });
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(this.message(error));
        this.saving.set(false);
      },
    });
  }

  beginEdit(review: ReviewView): void {
    this.editingId.set(review.id);
    this.form.setValue({ rating: review.rating, text: review.text });
  }
  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({ rating: 8, text: '' });
  }

  submitEdit(review: ReviewView): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const value = this.form.getRawValue();
    this.api.updateReview(review.id, value.rating, value.text, review.version).subscribe({
      next: (updated) => {
        this.reviews.update((items) =>
          items.map((item) => (item.id === updated.id ? updated : item)),
        );
        this.cancelEdit();
        this.saving.set(false);
        this.snackBar.open('Your review was updated.', 'Close', { duration: 3500 });
      },
      error: (error: HttpErrorResponse) => {
        this.formError.set(this.message(error));
        this.saving.set(false);
      },
    });
  }

  confirmDelete(review: ReviewView): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          title: 'Delete review?',
          message:
            'Your review will no longer be visible. This action cannot be undone from the app.',
          confirmLabel: 'Delete review',
        },
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.api.deleteReview(review.id, review.version).subscribe(() => {
          this.reviews.update((items) => items.filter((item) => item.id !== review.id));
          this.totalResults.update((total) => Math.max(0, total - 1));
          this.snackBar.open('Your review was deleted.', 'Close', { duration: 3500 });
        });
      });
  }

  private message(error: HttpErrorResponse): string {
    return (error.error as ProblemDetails | undefined)?.detail ?? 'The review could not be saved.';
  }
}
