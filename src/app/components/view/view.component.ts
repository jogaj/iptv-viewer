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
import { ProfilesStore } from '../../stores/profiles.store';
import { IptvService } from '../../services/iptv.service';
import { SearchBoxComponent } from '../shared/search-box/search-box.component';
import { MatExpansionModule } from '@angular/material/expansion';

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
        VideoPlayerComponent,
        SearchBoxComponent,
        MatExpansionModule
    ],
    styleUrls: ['./view.component.scss'],
    templateUrl: './view.component.html'
})
export class ViewComponent {
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

    readonly categoriesFilter = signal<string>('');

    readonly categories = computed(() => {
        if (this.categoriesFilter()) {
            return this.categoriesRes.value().filter((c) => c.name.toLowerCase().includes(this.categoriesFilter().toLowerCase()));
        } 
        return this.categoriesRes.value();
        
    } );

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

    readonly channelsFilter = signal<string>('');

    readonly channels = computed(() => {
        if (this.channelsFilter()) {
            return this.channelsRes.value().filter((c) => c.name.toLowerCase().includes(this.channelsFilter().toLowerCase()));
        }
        return this.channelsRes.value()
    });

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

    onCategoryFilterChanged(value: string): void {
        this.categoriesFilter.set(value);
    }

    onChannelFilterChanged(value: string): void {
        this.channelsFilter.set(value);
    }
}
