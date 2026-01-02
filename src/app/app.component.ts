import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { ProfilesStore } from './core/stores/profiles.store';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule
  ],
  styles: [
    `
      .spacer {
        flex: 1;
      }
      .toolbar {
        position: sticky;
        top: 0;
        z-index: 10;
      }
      .active-profile {
        opacity: 0.9;
        font-size: 12px;
      }
      .content {
        min-height: calc(100dvh - 64px);
      }
      @media (max-width: 599px) {
        .content {
          min-height: calc(100dvh - 56px);
        }
      }
    `
  ],
  template: `
    <mat-toolbar class="toolbar" color="primary">
      <span>IPTV Viewer</span>
      <span class="spacer"></span>

      @if (activeProfileName(); as name) {
        <span class="active-profile">Active: {{ name }}</span>
        <span style="width: 12px"></span>
      }

      <a mat-button routerLink="/profile" routerLinkActive="mat-mdc-button-disabled"
        ><mat-icon>person</mat-icon> Profile</a
      >
      <a mat-button routerLink="/view" routerLinkActive="mat-mdc-button-disabled"
        ><mat-icon>live_tv</mat-icon> View</a
      >
    </mat-toolbar>

    <div class="content">
      <router-outlet />
    </div>
  `
})
export class AppComponent {
  private readonly profilesStore = inject(ProfilesStore);

  readonly activeProfileName = computed(() => this.profilesStore.activeProfile()?.name ?? null);
}


