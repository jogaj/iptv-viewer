import { Component, computed, effect, inject, resource, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { VideoPlayerComponent } from '../../components/video-player/video-player.component';
import { Category, Channel } from '../../core/models/iptv.models';
import { IptvService } from '../../core/services/iptv.service';
import { ProfilesStore } from '../../core/stores/profiles.store';

@Component({
  selector: 'app-view-page',
  standalone: true,
  imports: [
    RouterLink,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    VideoPlayerComponent
  ],
  styles: [
    `
      .layout {
        display: grid;
        grid-template-columns: 280px 360px 1fr;
        gap: 16px;
        align-items: stretch;
      }

      .panel {
        height: calc(100dvh - 64px - 32px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .panel-body {
        overflow: auto;
      }

      .player-panel {
        height: calc(100dvh - 64px - 32px);
        display: grid;
        grid-template-rows: auto 1fr;
        gap: 12px;
      }

      .player-frame {
        min-height: 260px;
        height: 100%;
      }

      .hint {
        opacity: 0.8;
        font-size: 13px;
      }

      .selected {
        background: rgba(63, 81, 181, 0.12);
      }

      @media (max-width: 960px) {
        .layout {
          grid-template-columns: 1fr;
        }
        .panel,
        .player-panel {
          height: auto;
        }
        .player-frame {
          height: 42dvh;
        }
      }

      @media (max-width: 599px) {
        .player-frame {
          height: 38dvh;
        }
      }
    `
  ],
  template: `
    <div class="container">
      @if (activeProfile(); as profile) {
        <div class="layout">
          <!-- Categories -->
          <mat-card class="panel">
            <mat-card-header>
              <mat-card-title>Categories</mat-card-title>
              <mat-card-subtitle class="hint">{{ profile.name }}</mat-card-subtitle>
            </mat-card-header>
            <mat-divider></mat-divider>
            <mat-card-content class="panel-body">
              @if (categoriesRes.isLoading()) {
                <div style="display:flex;justify-content:center;padding:16px">
                  <mat-spinner diameter="36"></mat-spinner>
                </div>
              } @else {
                @if (categories().length === 0) {
                  <p class="hint">No categories found (or request blocked by CORS).</p>
                } @else {
                  <mat-nav-list>
                    @for (c of categories(); track c.id) {
                      <a
                        mat-list-item
                        (click)="selectCategory(c)"
                        [class.selected]="c.id === selectedCategoryId()"
                      >
                        <div matListItemTitle>{{ c.name }}</div>
                        <div matListItemLine class="hint">
                          @if (c.count != null) { {{ c.count }} channels }
                        </div>
                      </a>
                    }
                  </mat-nav-list>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Channels -->
          <mat-card class="panel">
            <mat-card-header>
              <mat-card-title>Channels</mat-card-title>
              <mat-card-subtitle class="hint">
                @if (selectedCategoryName(); as cn) { {{ cn }} } @else { Select a category }
              </mat-card-subtitle>
            </mat-card-header>
            <mat-divider></mat-divider>
            <mat-card-content class="panel-body">
              @if (!selectedCategoryId()) {
                <p class="hint">Select a category to load channels.</p>
              } @else if (channelsRes.isLoading()) {
                <div style="display:flex;justify-content:center;padding:16px">
                  <mat-spinner diameter="36"></mat-spinner>
                </div>
              } @else {
                @if (channels().length === 0) {
                  <p class="hint">No channels found in this category.</p>
                } @else {
                  <mat-nav-list>
                    @for (ch of channels(); track ch.id) {
                      <a
                        mat-list-item
                        (click)="selectChannel(ch)"
                        [class.selected]="ch.id === selectedChannelId()"
                      >
                        <div matListItemTitle>{{ ch.name }}</div>
                      </a>
                    }
                  </mat-nav-list>
                }
              }
            </mat-card-content>
          </mat-card>

          <!-- Player -->
          <div class="player-panel">
            <mat-card>
              <mat-card-header>
                <mat-card-title>Player</mat-card-title>
                <mat-card-subtitle class="hint">
                  @if (selectedChannel(); as ch) { {{ ch.name }} } @else { Select a channel }
                </mat-card-subtitle>
              </mat-card-header>
            </mat-card>

            <div class="player-frame">
              <app-video-player [srcUrl]="playerUrl()" />
            </div>
          </div>
        </div>
      } @else {
        <mat-card>
          <mat-card-header>
            <mat-card-title>No active profile</mat-card-title>
            <mat-card-subtitle class="hint"
              >Create/select a profile first, then come back to View.</mat-card-subtitle
            >
          </mat-card-header>
          <mat-card-actions>
            <a mat-flat-button color="primary" routerLink="/profile">
              <mat-icon>person</mat-icon>
              Go to Profile
            </a>
          </mat-card-actions>
        </mat-card>
      }
    </div>
  `
})
export class ViewPageComponent {
  private readonly router = inject(Router);
  private readonly profilesStore = inject(ProfilesStore);
  private readonly iptv = inject(IptvService);

  readonly activeProfile = this.profilesStore.activeProfile;

  private readonly lastProfileId = signal<string | null>(null);

  readonly selectedCategoryId = signal<string | null>(null);
  readonly selectedChannelId = signal<string | null>(null);

  readonly categoriesRes = resource({
    params: () => this.activeProfile() ?? undefined,
    defaultValue: [] as Category[],
    loader: async ({ params }) => {
      return await this.iptv.getCategories(params);
    }
  });

  readonly categories = computed(() => this.categoriesRes.value());

  readonly selectedCategoryName = computed(() => {
    const id = this.selectedCategoryId();
    if (!id) return null;
    return this.categories().find((c) => c.id === id)?.name ?? null;
  });

  readonly channelsRes = resource({
    params: () => {
      const p = this.activeProfile();
      const c = this.selectedCategoryId();
      return p && c ? { profile: p, categoryId: c } : undefined;
    },
    defaultValue: [] as Channel[],
    loader: async ({ params }) => {
      return await this.iptv.getChannels(params.profile, params.categoryId);
    }
  });

  readonly channels = computed(() => this.channelsRes.value());

  readonly selectedChannel = computed(() => {
    const id = this.selectedChannelId();
    if (!id) return null;
    return this.channels().find((c) => c.id === id) ?? null;
  });

  readonly playerUrl = computed(() => this.selectedChannel()?.streamUrl ?? null);

  constructor() {
    // Reset selections when the active profile changes.
    effect(() => {
      const nextId = this.activeProfile()?.id ?? null;
      if (this.lastProfileId() !== nextId) {
        this.lastProfileId.set(nextId);
        this.selectedCategoryId.set(null);
        this.selectedChannelId.set(null);
      }
    });

    // When categories load, auto-select first category.
    effect(() => {
      const cats = this.categories();
      if (!this.selectedCategoryId() && cats.length > 0) {
        this.selectedCategoryId.set(cats[0]!.id);
      }
    });

    // When channels load for a category, auto-select first channel.
    effect(() => {
      const list = this.channels();
      if (!this.selectedChannelId() && list.length > 0) {
        this.selectedChannelId.set(list[0]!.id);
      }
    });

    // If active profile becomes null, route user back to profile page.
    effect(() => {
      if (!this.activeProfile()) {
        this.selectedCategoryId.set(null);
        this.selectedChannelId.set(null);
        void this.router.navigateByUrl('/profile');
      }
    });
  }

  selectCategory(category: Category): void {
    this.selectedCategoryId.set(category.id);
    this.selectedChannelId.set(null);
  }

  selectChannel(channel: Channel): void {
    this.selectedChannelId.set(channel.id);
  }
}


