import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ProblemDetails } from '../../core/models';
import { FieldIconComponent } from '../../shared/field-icon.component';

@Component({
  selector: 'app-sign-in',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    FieldIconComponent,
  ],
  template: `
    <section class="auth-layout">
      <div>
        <p class="eyebrow">WELCOME BACK</p>
        <h1 class="page-heading">Sign in to save your next movie.</h1>
        <p class="page-intro">Your watchlist and reviews stay available across devices.</p>
      </div>
      <mat-card appearance="outlined">
        <mat-card-header><mat-card-title>Sign in</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()">
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
                autocomplete="current-password"
              />
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <mat-error>Password is required.</mat-error>
              }
            </mat-form-field>
            <mat-checkbox formControlName="rememberMe"
              >Keep me signed in on this device</mat-checkbox
            >
            @if (error(); as message) {
              <p class="form-error" role="alert">{{ message }}</p>
            }
            <button mat-flat-button type="submit" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>
          <p class="switch">New to MyMovie? <a routerLink="/register">Create an account</a>.</p>
        </mat-card-content>
      </mat-card>
    </section>
  `,
  styles: `
    .auth-layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 30rem);
      gap: clamp(2rem, 7vw, 7rem);
      align-items: center;
      min-height: 65vh;
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
      max-width: 30rem;
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
        min-height: auto;
      }
      mat-card {
        justify-self: stretch;
        padding: 0.5rem;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  protected readonly submitting = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    rememberMe: [false],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const value = this.form.getRawValue();
    this.auth.signIn(value.email, value.password, value.rememberMe).subscribe({
      next: () => {
        const requested = this.route.snapshot.queryParamMap.get('returnUrl');
        const target = requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/';
        void this.router.navigateByUrl(target);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(
          (error.error as ProblemDetails | undefined)?.detail ??
            'Sign-in failed. Check your details and try again.',
        );
        this.submitting.set(false);
      },
    });
  }
}
