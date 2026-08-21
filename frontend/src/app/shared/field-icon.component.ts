import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type FieldIconName = 'check' | 'close' | 'email' | 'lock' | 'search' | 'user';

@Component({
  selector: 'app-field-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (icon()) {
        @case ('search') {
          <circle cx="11" cy="11" r="7" />
          <path d="m16.2 16.2 4.3 4.3" />
        }
        @case ('email') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        }
        @case ('lock') {
          <rect x="5" y="10" width="14" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <path d="M12 14v3" />
        }
        @case ('user') {
          <circle cx="12" cy="8" r="4" />
          <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
        }
        @case ('check') {
          <circle cx="12" cy="12" r="9" />
          <path d="m8 12 2.6 2.6L16.5 9" />
        }
        @case ('close') {
          <path d="m6 6 12 12M18 6 6 18" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      color: var(--mat-sys-on-surface-variant);
      line-height: 1;
      vertical-align: middle;
    }

    :host([matPrefix]) {
      margin-inline: 0.75rem 0.625rem;
    }

    svg {
      display: block;
      width: 100%;
      height: 100%;
      overflow: visible;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldIconComponent {
  readonly icon = input.required<FieldIconName>();
}
