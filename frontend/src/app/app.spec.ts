import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './core/auth.service';
import { App } from './app';

describe('App', () => {
  const authStub = {
    user: signal(null),
    isAuthenticated: computed(() => false),
    isAdministrator: computed(() => false),
    initialize: () => Promise.resolve(null),
    signOut: () => undefined,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: AuthService, useValue: authStub }],
    }).compileComponents();
  });

  it('creates the accessible application shell', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.brand')?.textContent).toContain('MyMovie');
    expect(element.querySelector('main')?.id).toBe('main-content');
    expect(element.querySelector('.skip-link')?.textContent).toContain('Skip to main content');
  });
});
