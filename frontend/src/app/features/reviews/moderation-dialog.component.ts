import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-moderation-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.action }} review?</h2>
    <mat-dialog-content
      ><p>Provide a clear reason for the immutable moderation audit.</p>
      <mat-form-field appearance="outline"
        ><mat-label>Moderation reason</mat-label
        ><textarea matInput [formControl]="reason" rows="4" maxlength="500"></textarea
        ><mat-hint align="end">{{ reason.value.length }} / 500</mat-hint></mat-form-field
      ></mat-dialog-content
    >
    <mat-dialog-actions align="end"
      ><button mat-button mat-dialog-close>Cancel</button
      ><button mat-flat-button [disabled]="reason.invalid" (click)="confirm()">
        {{ data.action }} review
      </button></mat-dialog-actions
    >
  `,
  styles: `
    mat-form-field {
      width: 100%;
    }
    mat-dialog-content {
      min-width: min(32rem, 70vw);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModerationDialogComponent {
  readonly data = inject<{ action: 'Hide' | 'Restore' }>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ModerationDialogComponent>);
  readonly reason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(5), Validators.maxLength(500)],
  });
  confirm(): void {
    if (this.reason.valid) this.dialogRef.close(this.reason.value.trim());
  }
}
