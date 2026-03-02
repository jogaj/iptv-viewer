import { Component, computed, inject, signal, ViewChild } from '@angular/core';
import { FormGroupDirective, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';

import { Profile, ProfileType } from '../../core/models/iptv.models';
import { ProfilePanelType, ProfilesStore } from '../../stores/profiles.store';
import { BreakpointService } from '../../services/breakpoint.service';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog.component';
import { take } from 'rxjs';
import { M3uForm, XtreamForm } from '../../core/types/profile.types';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatExpansionModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  styleUrls: ['./profile.component.scss'],
  templateUrl: './profile.component.html'
})
export class ProfilePageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly store = inject(ProfilesStore);
  readonly breakpointService = inject(BreakpointService);
  readonly dialog: MatDialog = inject(MatDialog);

  readonly profiles = this.store.profiles;
  readonly activeProfileId = this.store.activeProfileId;
  readonly availablePanel = this.store.availablePanel;
  readonly createUpdatePanel = this.store.createUpdatePanel;

  readonly editingProfileId = signal<string | null>(null);
  readonly selectedTabIndex = signal(0);

  readonly ProfilePanelType = ProfilePanelType;

  readonly m3uForm: M3uForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(2)]),
    playlistUrl:  this.fb.control('', [Validators.required, Validators.pattern(/^https?:\/\/[^\s$.?#].[^\s]*$/i)]),
  });

  readonly xtreamForm: XtreamForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(2)]),
    baseUrl: this.fb.control('', [Validators.required, Validators.pattern(/^https?:\/\/[^\s$.?#].[^\s]*$/i)]),
    username: this.fb.control('', [Validators.required]),
    password: this.fb.control('', [Validators.required])
  });

  @ViewChild('formM3uDirective') private formM3uDirective!: FormGroupDirective;
  @ViewChild('formXtreamDirective') private formXtreamDirective!: FormGroupDirective;

  readonly editingType = computed<ProfileType | null>(() => {
    const id = this.editingProfileId();
    if (!id) return null;
    return this.profiles().find((p) => p.id === id)?.type ?? null;
  });

  selectAndView(profile: Profile): void {
    this.store.selectProfile(profile.id);
    this.router.navigateByUrl('/view');
  }

  edit(profile: Profile): void {
    this.editingProfileId.set(profile.id);
    this.selectedTabIndex.set(profile.type === 'm3u' ? 0 : 1);

    if (profile.type === 'm3u') {
      this.m3uForm.setValue({ name: profile.name, playlistUrl: profile.playlistUrl });
      this.xtreamFormReset();
    } else {
      this.xtreamForm.setValue({
        name: profile.name,
        baseUrl: profile.baseUrl,
        username: profile.username,
        password: profile.password
      });
      this.m3uFormReset();
    }
  }

  remove(profile: Profile): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      maxWidth: '400px',
      data: {
        title: 'Confirm Delete',
        message: `Are you sure you want to delete the profile "${profile.name}"?`,
      },
    });

    dialogRef.afterClosed().pipe(take(1)).subscribe(result => {
      if (!result) return;

      this.store.deleteProfile(profile.id);
      if (this.editingProfileId() === profile.id) this.reset();
    });
  }

  reset(): void {
    this.editingProfileId.set(null);
    this.m3uFormReset();
    this.xtreamFormReset();
  }

  m3uFormReset(): void {
    this.m3uForm.reset();
    this.formM3uDirective?.resetForm();
  }

  xtreamFormReset(): void {
    this.xtreamForm.reset();
    this.formXtreamDirective?.resetForm();
  }

  save(type: ProfileType): void {
    const editingId = this.editingProfileId();

    if (type === 'm3u') {
      if (this.m3uForm.invalid) return;
      const { name, playlistUrl } = this.m3uForm.getRawValue();

      if (editingId && this.editingType() === 'm3u') {
        this.store.updateProfile(editingId, { name, playlistUrl });
      } else {
        this.store.addProfile({ type: 'm3u', name, playlistUrl });
      }
    } else {
      if (this.xtreamForm.invalid) return;
      const { name, baseUrl, username, password } = this.xtreamForm.getRawValue();

      if (editingId && this.editingType() === 'xtream') {
        this.store.updateProfile(editingId, { name, baseUrl, username, password });
      } else {
        this.store.addProfile({ type: 'xtream', name, baseUrl, username, password });
      }
    }

    this.reset();
  }

  onPanelToggle(type: ProfilePanelType): void {
    this.store.togglePanel(type);
  }
}
