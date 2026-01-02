import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { M3uProfile, Profile, XtreamProfile } from '../models/iptv.models';

type CreateProfileInput = { name: string } & (M3uProfile | XtreamProfile);
type UpdateProfilePatch = Partial<{ name: string } & (M3uProfile | XtreamProfile)>;

type ProfilesState = {
  profiles: Profile[];
  activeProfileId: string | null;
};

const STORAGE_KEY = 'iptv-viewer.profiles.v1';

function newId(): string {
  // Good enough for local persistence; avoids external deps.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

@Injectable({ providedIn: 'root' })
export class ProfilesStore {
  private readonly storage = inject(StorageService);

  private readonly state = signal<ProfilesState>(
    this.storage.get<ProfilesState>(STORAGE_KEY) ?? { profiles: [], activeProfileId: null }
  );

  readonly profiles = computed(() => this.state().profiles);
  readonly activeProfileId = computed(() => this.state().activeProfileId);
  readonly activeProfile = computed(
    () => this.state().profiles.find((p) => p.id === this.state().activeProfileId) ?? null
  );

  constructor() {
    effect(() => {
      this.storage.set(STORAGE_KEY, this.state());
    });
  }

  selectProfile(profileId: string): void {
    this.state.update((s) => ({ ...s, activeProfileId: profileId }));
  }

  clearActiveProfile(): void {
    this.state.update((s) => ({ ...s, activeProfileId: null }));
  }

  addProfile(input: CreateProfileInput): Profile {
    const now = Date.now();
    const profile: Profile = { ...input, id: newId(), createdAt: now, updatedAt: now } as Profile;

    this.state.update((s) => ({
      ...s,
      profiles: [profile, ...s.profiles],
      activeProfileId: s.activeProfileId ?? profile.id
    }));

    return profile;
  }

  updateProfile(profileId: string, patch: UpdateProfilePatch): void {
    const now = Date.now();
    this.state.update((s) => ({
      ...s,
      profiles: s.profiles.map((p) =>
        p.id === profileId ? ({ ...p, ...patch, updatedAt: now } as Profile) : p
      )
    }));
  }

  deleteProfile(profileId: string): void {
    this.state.update((s) => {
      const nextProfiles = s.profiles.filter((p) => p.id !== profileId);
      const nextActive =
        s.activeProfileId === profileId ? (nextProfiles[0]?.id ?? null) : s.activeProfileId;
      return { ...s, profiles: nextProfiles, activeProfileId: nextActive };
    });
  }
}


