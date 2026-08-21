import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of, switchMap, tap } from 'rxjs';
import { UserProfile } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private initialization?: Promise<UserProfile | null>;

  readonly user = signal<UserProfile | null>(null);
  readonly initialized = signal(false);
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdministrator = computed(() => this.user()?.roles.includes('Administrator') ?? false);

  initialize(): Promise<UserProfile | null> {
    if (!this.initialization) {
      this.initialization = firstValueFrom(
        this.http.get<void>('/api/v1/auth/csrf').pipe(
          switchMap(() => this.http.get<UserProfile>('/api/v1/users/me')),
          catchError(() => of(null)),
          tap((profile) => {
            this.user.set(profile);
            this.initialized.set(true);
          }),
        ),
      );
    }
    return this.initialization;
  }

  register(email: string, displayName: string, password: string) {
    return this.ensureCsrf().pipe(
      switchMap(() =>
        this.http.post<UserProfile>('/api/v1/auth/register', { email, displayName, password }),
      ),
      tap((profile) => this.user.set(profile)),
    );
  }

  signIn(email: string, password: string, rememberMe: boolean) {
    return this.ensureCsrf().pipe(
      switchMap(() =>
        this.http.post<UserProfile>('/api/v1/auth/sign-in', { email, password, rememberMe }),
      ),
      tap((profile) => this.user.set(profile)),
    );
  }

  signOut(): void {
    this.ensureCsrf()
      .pipe(switchMap(() => this.http.post<void>('/api/v1/auth/sign-out', null)))
      .subscribe({
        next: () => {
          this.user.set(null);
          void this.router.navigateByUrl('/');
        },
      });
  }

  private ensureCsrf() {
    return this.http.get<void>('/api/v1/auth/csrf');
  }
}
