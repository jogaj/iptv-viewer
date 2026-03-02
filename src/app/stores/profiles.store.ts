import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { StorageService } from '../services/storage.service';
import { M3uProfile, Profile, ProfilePanel, XtreamProfile } from '../core/models/iptv.models';
import { BreakpointService } from '../services/breakpoint.service';

type CreateProfileInput = { name: string } & (M3uProfile | XtreamProfile);
type UpdateProfilePatch = Partial<{ name: string, acronym: string} & (M3uProfile | XtreamProfile)>;

export enum ProfilePanelType {
  available = 'available',
  createUpdate = 'createUpdate'
}

type ProfilesState = {
  profiles: Profile[];
  activeProfileId: string | null;
  panels: {
    [ProfilePanelType.available]: ProfilePanel,
    [ProfilePanelType.createUpdate]: ProfilePanel
  }
};


const STORAGE_KEY = 'iptv-viewer.profiles.v1';

function newId(): string {
  // Good enough for local persistence; avoids external deps.
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

@Injectable({ providedIn: 'root' })
export class ProfilesStore {
  private readonly storage = inject(StorageService);
  private readonly breakpointSvc = inject(BreakpointService);

  private readonly state = signal<ProfilesState>(
    this.storage.get<ProfilesState>(STORAGE_KEY) ?? { profiles: [], activeProfileId: null, panels: {
      available: { expanded: true, hideToggle: true },
      createUpdate: { expanded: true, hideToggle: true }
    } }
  );

  readonly profiles = computed(() => this.state().profiles);
  readonly activeProfileId = computed(() => this.state().activeProfileId);
  readonly activeProfile = computed(
    () => this.profiles().find((p) => p.id === this.activeProfileId()) ?? null
  );
  readonly panels = computed(() => this.state().panels);
  readonly availablePanel = computed(() => this.panels()[ProfilePanelType.available]);
  readonly createUpdatePanel = computed(() => this.panels()[ProfilePanelType.createUpdate]);

  constructor() {
    effect(() => {
      this.storage.set(STORAGE_KEY, this.state());
      this.setPanelHideToggle(this.breakpointSvc.isSmallViewport() ?? false);
    });
  }

  /**
   * Sets the given profile as the active profile.
   * @param profileId The ID of the profile to set as active.
   */
  selectProfile(profileId: string): void {
    this.state.update((s) => ({ ...s, activeProfileId: profileId }));
  }

  /**
   * Clears the currently active profile.
   */
  clearActiveProfile(): void {
    this.state.update((s) => ({ ...s, activeProfileId: null }));
  }

  /**
   * Toggles the expanded panel value
   * @param type of panel
   */
  togglePanel(type: ProfilePanelType): void {
    if (!this.breakpointSvc.isSmallViewport()) return;

    const newPanels = structuredClone(this.state().panels);
    newPanels[type].expanded = !newPanels[type].expanded;
    this.state.update((s) => ({
      ...s,
      panels: newPanels
    }));
  }

  /**
   * Sets the `hideToggle` property for all panels based on the viewport size.
   * @param isSmallViewport True if the current viewport is small, false otherwise.
   */
  setPanelHideToggle(isSmallViewport: boolean): void {
    let updated = false;
    const newPanels = structuredClone(this.state().panels);
    
    for (const panelType of Object.values(ProfilePanelType)) {
      if (newPanels[panelType].hideToggle !== !isSmallViewport) {
        updated = true;
        newPanels[panelType].hideToggle = !isSmallViewport;
      }
    }

    if (!updated) return;
    
    this.state.update((s) => ({
      ...s,
      panels: newPanels
    }));
  }

  /**
   * Generates an acronym
   * 
   * @param profileName The name of the profile
   * @returns An acronym of 2 characters
   */

  generateProfileAcronym(profileName: string): string {
    const splits = profileName.split(/\s+/);
    if (splits.length> 1) {
      return `${splits[0][0].toUpperCase()}${splits[1][0].toUpperCase()}`;
    }

    return splits[0].slice(0, 2).toUpperCase();
  }

  /**
   * Adds a new profile to the store.
   * @param input The data for the new profile.
   * @returns The newly created profile.
   */
  addProfile(input: CreateProfileInput): Profile {
    const now = Date.now();
    const acronym = this.generateProfileAcronym(input.name);
   
    const profile: Profile = {
      ...input,
      id: newId(),
      acronym,
      createdAt: now,
      updatedAt: now
    } as Profile;

    this.state.update((s) => ({
      ...s,
      profiles: [profile, ...s.profiles],
      activeProfileId: s.activeProfileId ?? profile.id
    }));

    return profile;
  }

  /**
   * Updates an existing profile with the given patch.
   * @param profileId The ID of the profile to update.
   * @param patch The partial data to apply to the profile.
   */
  updateProfile(profileId: string, patch: UpdateProfilePatch): void {
    const now = Date.now();
    patch.acronym = this.generateProfileAcronym(patch.name ?? '');

    this.state.update((s) => ({
      ...s,
      profiles: s.profiles.map((p) =>
        p.id === profileId ? ({ ...p, ...patch, updatedAt: now } as Profile) : p
      )
    }));
  }

  /**
   * Deletes a profile from the store.
   * @param profileId The ID of the profile to delete.
   */
  deleteProfile(profileId: string): void {
    this.state.update((s) => {
      const nextProfiles = s.profiles.filter((p) => p.id !== profileId);
      const nextActive =
        s.activeProfileId === profileId ? (nextProfiles[0]?.id ?? null) : s.activeProfileId;
      return { ...s, profiles: nextProfiles, activeProfileId: nextActive };
    });
  }
}
