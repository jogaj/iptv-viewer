import { Component, inject, Inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
}

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  imports: [
     MatButtonModule,
     MatDialogModule
  ],
  styleUrls: ['./confirmation-dialog.component.scss'],
  templateUrl: './confirmation-dialog.component.html',
})
export class ConfirmationDialogComponent {

  dialogRef = inject(MatDialogRef<ConfirmationDialogComponent>);
  data = inject<ConfirmDialogData>(MAT_DIALOG_DATA)

  onConfirm(): void {
    // Close the dialog and pass `true` as the result
    this.dialogRef.close(true);
  }

  onDismiss(): void {
    // Close the dialog and pass `false` as the result
    this.dialogRef.close(false);
  }
}