import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [MatButtonModule, MatIconModule, RouterLink],
  template: `
    <section class="centered-state" aria-labelledby="not-found-title">
      <mat-icon aria-hidden="true">?</mat-icon>
      <h1 id="not-found-title">Page not found</h1>
      <p>The page may have moved, or the address may be incorrect.</p>
      <a mat-flat-button routerLink="/">Return to Discover</a>
    </section>
  `,
  styles: `
    mat-icon {
      width: 4rem;
      height: 4rem;
      font-size: 4rem;
    }
    h1 {
      font: var(--mat-sys-headline-large);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {}
