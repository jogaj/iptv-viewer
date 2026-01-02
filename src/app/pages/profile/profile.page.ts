import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatTabsModule } from '@angular/material/tabs';

import { Profile, ProfileType } from '../../core/models/iptv.models';
import { ProfilesStore } from '../../core/stores/profiles.store';

type M3uForm = FormGroup<{
  name: FormControl<string>;
  playlistUrl: FormControl<string>;
}>;

type XtreamForm = FormGroup<{
  name: FormControl<string>;
  baseUrl: FormControl<string>;
  username: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatDividerModule
  ],
  styles: [
    `
      .grid {
        display: grid;
        grid-template-columns: 420px 1fr;
        gap: 16px;
      }

      @media (max-width: 960px) {
        .grid {
          grid-template-columns: 1fr;
        }
      }

      .profile-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .row {
        display: grid;
        gap: 12px;
      }

      .hint {
        opacity: 0.8;
        font-size: 13px;
      }

      .type-pill {
        font-size: 12px;
        opacity: 0.8;
      }
    `
  ],
  template: `
    <div class="container">
      <div class="grid">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Profiles</mat-card-title>
            <mat-card-subtitle class="hint"
              >Create multiple profiles and switch between them.</mat-card-subtitle
            >
          </mat-card-header>
          <mat-card-content>
            @if (profiles().length === 0) {
              <p class="hint">No profiles yet. Create one on the right.</p>
            } @else {
              <mat-nav-list>
                @for (p of profiles(); track p.id) {
                  <mat-list-item>
                    <div matListItemTitle>{{ p.name }}</div>
                    <div matListItemLine class="type-pill">
                      {{ p.type === 'm3u' ? 'M3U/M3U8' : 'Xtream Codes' }}
                      @if (p.id === activeProfileId()) { — Active }
                    </div>

                    <div class="profile-actions" matListItemMeta>
                      <button mat-stroked-button (click)="selectAndView(p)">
                        <mat-icon>play_arrow</mat-icon>
                        View
                      </button>
                      <button mat-icon-button (click)="edit(p)" aria-label="Edit">
                        <mat-icon>edit</mat-icon>
                      </button>
                      <button
                        mat-icon-button
                        color="warn"
                        (click)="remove(p)"
                        aria-label="Delete"
                      >
                        <mat-icon>delete</mat-icon>
                      </button>
                    </div>
                  </mat-list-item>
                }
              </mat-nav-list>
            }
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-card-title>
              @if (editingProfileId(); as id) {
                Edit profile
              } @else {
                Create profile
              }
            </mat-card-title>
            <mat-card-subtitle class="hint">
              Add either an M3U URL or Xtream Codes credentials (separated by tabs).
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <mat-tab-group
              [selectedIndex]="selectedTabIndex()"
              (selectedIndexChange)="selectedTabIndex.set($event)"
            >
              <mat-tab label="M3U / M3U8 URL">
                <form class="row" [formGroup]="m3uForm" (ngSubmit)="save('m3u')">
                  <mat-form-field appearance="outline">
                    <mat-label>Profile name</mat-label>
                    <input matInput formControlName="name" />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>M3U / M3U8 URL</mat-label>
                    <input matInput formControlName="playlistUrl" />
                    <mat-hint>Example: https://.../playlist.m3u8</mat-hint>
                  </mat-form-field>

                  <div class="profile-actions">
                    <button mat-flat-button color="primary" type="submit" [disabled]="m3uForm.invalid">
                      <mat-icon>save</mat-icon>
                      Save
                    </button>
                    <button mat-button type="button" (click)="reset()">
                      Clear
                    </button>
                  </div>
                </form>
              </mat-tab>

              <mat-tab label="Xtream Codes">
                <form class="row" [formGroup]="xtreamForm" (ngSubmit)="save('xtream')">
                  <mat-form-field appearance="outline">
                    <mat-label>Profile name</mat-label>
                    <input matInput formControlName="name" />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Base URL</mat-label>
                    <input matInput formControlName="baseUrl" />
                    <mat-hint>Example: http://example.com:8080</mat-hint>
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Username</mat-label>
                    <input matInput formControlName="username" />
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Password</mat-label>
                    <input matInput formControlName="password" type="password" />
                  </mat-form-field>

                  <div class="profile-actions">
                    <button
                      mat-flat-button
                      color="primary"
                      type="submit"
                      [disabled]="xtreamForm.invalid"
                    >
                      <mat-icon>save</mat-icon>
                      Save
                    </button>
                    <button mat-button type="button" (click)="reset()">
                      Clear
                    </button>
                  </div>
                </form>
              </mat-tab>
            </mat-tab-group>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `
})
export class ProfilePageComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly store = inject(ProfilesStore);

  readonly profiles = this.store.profiles;
  readonly activeProfileId = this.store.activeProfileId;

  readonly editingProfileId = signal<string | null>(null);
  readonly selectedTabIndex = signal(0);

  readonly m3uForm: M3uForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(2)]),
    playlistUrl: this.fb.control('', [Validators.required])
  });

  readonly xtreamForm: XtreamForm = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(2)]),
    baseUrl: this.fb.control('', [Validators.required]),
    username: this.fb.control('', [Validators.required]),
    password: this.fb.control('', [Validators.required])
  });

  readonly editingType = computed<ProfileType | null>(() => {
    const id = this.editingProfileId();
    if (!id) return null;
    return this.profiles().find((p) => p.id === id)?.type ?? null;
  });

  selectAndView(profile: Profile): void {
    this.store.selectProfile(profile.id);
    void this.router.navigateByUrl('/view');
  }

  edit(profile: Profile): void {
    this.editingProfileId.set(profile.id);
    this.selectedTabIndex.set(profile.type === 'm3u' ? 0 : 1);

    if (profile.type === 'm3u') {
      this.m3uForm.setValue({ name: profile.name, playlistUrl: profile.playlistUrl });
    } else {
      this.xtreamForm.setValue({
        name: profile.name,
        baseUrl: profile.baseUrl,
        username: profile.username,
        password: profile.password
      });
    }
  }

  remove(profile: Profile): void {
    const ok = confirm(`Delete profile "${profile.name}"?`);
    if (!ok) return;
    this.store.deleteProfile(profile.id);
    if (this.editingProfileId() === profile.id) this.reset();
  }

  reset(): void {
    this.editingProfileId.set(null);
    this.m3uForm.reset({ name: '', playlistUrl: '' });
    this.xtreamForm.reset({ name: '', baseUrl: '', username: '', password: '' });
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
}


