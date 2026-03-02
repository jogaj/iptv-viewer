export type ProfileType = 'm3u' | 'xtream';

export type M3uProfile = {
  type: 'm3u';
  playlistUrl: string;
};

export type XtreamProfile = {
  type: 'xtream';
  baseUrl: string; // e.g. http://host:8080
  username: string;
  password: string;
};

export type BaseProfile = {
  id: string;
  name: string;
  acronym: string;
  createdAt: number;
  updatedAt: number;
};

// Important: model as a union of full shapes (not an intersection with a union),
// so TS utility types like `Omit`/`Partial` behave as expected.
export type Profile = (BaseProfile & M3uProfile) | (BaseProfile & XtreamProfile);

export type ProfilePanel = {
  expanded: boolean;
  hideToggle: boolean;
};

export type Category = {
  id: string;
  name: string;
  count?: number;
};

export type Channel = {
  id: string;
  name: string;
  logoUrl?: string;
  streamUrl: string;
};
