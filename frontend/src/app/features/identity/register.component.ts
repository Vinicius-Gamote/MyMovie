import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProblemDetails } from '../../core/models';
import { FieldIconComponent } from '../../shared/field-icon.component';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  return control.get('password')?.value === control.get('confirmPassword')?.value
    ? null
    : { passwordMismatch: true };
}

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    FieldIconComponent,
  ],
  template: `
    <section class="auth-layout">
      <div>
        <p class="eyebrow">YOUR MOVIE SPACE</p>
        <h1 class="page-heading">Create a watchlist that feels like yours.</h1>
        <p class="page-intro">Save movies for later and publish one thoughtful review per title.</p>
      </div>
      <mat-card appearance="outlined">
        <mat-card-header><mat-card-title>Create account</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field appearance="outline" subscriptSizing="dynamic"
              ><mat-label>Display name</mat-label><app-field-icon matPrefix icon="user" /> ><input
                matInput
                formControlName="displayName"
                autocomplete="name"
                maxlength="100"
              /><mat-hint>Shown with your reviews</mat-hint></mat-form-field
            >
            <mat-form-field appearance="outline" subscriptSizing="dynamic"
              ><mat-label>Email</mat-label><app-field-icon matPrefix icon="email" /> ><input
                matInput
                type="email"
                formControlName="email"
                autocomplete="email"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <mat-error>Enter a valid email address.</mat-error>
              }
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic"
              ><mat-label>Password</mat-label><app-field-icon matPrefix icon="lock" /> ><input
                matInput
                type="password"
                formControlName="password"
                autocomplete="new-password"
              /><mat-hint
                >12+ characters with upper, lower, number, and symbol</mat-hint
              ></mat-form-field
            >
            <mat-form-field appearance="outline" subscriptSizing="dynamic"
              ><mat-label>Confirm password</mat-label
              ><app-field-icon matPrefix icon="check" /> ><input
                matInput
                type="password"
                formControlName="confirmPassword"
                autocomplete="new-password"
              />
              @if (form.hasError('passwordMismatch') && form.controls.confirmPassword.touched) {
                <mat-error>Passwords must match.</mat-error>
              }
            </mat-form-field>
            @if (error(); as message) {
              <p class="form-error" role="alert">{{ message }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Creating account…' : 'Create account' }}
            </button>
          </form>
          <p class="switch">Already registered? <a routerLink="/sign-in">Sign in</a>.</p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .auth-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 32rem);
      gap: clamp(2rem, 7vw, 7rem);
      align-items: center;
      min-width: 0;
    }
    .auth-layout > *,
    mat-card-content,
    form {
      min-width: 0;
    }
    .eyebrow {
      color: var(--mat-sys-primary);
      font: var(--mat-sys-label-large);
      letter-spacing: 0.15em;
    }
    mat-card {
      width: 100%;
      min-width: 0;
      max-width: 32rem;
      justify-self: end;
      padding: 1rem;
      background: var(--mat-sys-surface-container-low);
    }
    mat-card-title {
      font: var(--mat-sys-headline-medium);
    }
    form {
      display: grid;
      gap: 0.75rem;
      padding-top: 1.5rem;
    }
    mat-form-field {
      width: 100%;
      min-width: 0;
    }
    form > button {
      margin-top: 0.75rem;
    }
    .form-error {
      margin: 0;
      color: var(--mat-sys-error);
    }
    .switch {
      margin: 1.5rem 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
    @media (max-width: 760px) {
      .auth-layout {
        grid-template-columns: 1fr;
      }
      mat-card {
        justify-self: stretch;
        padding: 0.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group(
    {
      displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(12)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    this.auth.register(value.email, value.displayName, value.password).subscribe({
      next: () => void this.router.navigateByUrl('/watchlist'),
      error: (error: HttpErrorResponse) => {
        const problem = error.error as ProblemDetails | undefined;
        this.error.set(
          problem?.detail ??
            Object.values(problem?.errors ?? {}).flat()[0] ??
            'Your account could not be created.',
        );
        this.submitting.set(false);
      },
    });
  }
}
