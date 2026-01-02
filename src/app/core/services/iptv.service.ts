import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Category, Channel, Profile, XtreamProfile } from '../models/iptv.models';

type ParsedM3u = {
  categories: Category[];
  channelsByCategoryId: Map<string, Channel[]>;
};

type XtreamCache = {
  categories?: Category[];
  channelsByCategoryId: Map<string, Channel[]>;
};

function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function pickContainerExtension(stream: any): string {
  const ext = String(stream?.container_extension ?? '').trim().toLowerCase();
  if (!ext) return 'm3u8';
  // Xtream live streams often report `ts`, which is a raw MPEG-TS stream URL. Most browsers
  // (and hls.js) can't play a `.ts` URL directly as a media source/manifest.
  // Prefer HLS playlists when possible.
  if (ext === 'ts' || ext === 'mpegts' || ext === 'mts') return 'm3u8';
  return ext;
}

@Injectable({ providedIn: 'root' })
export class IptvService {
  private readonly http = inject(HttpClient);

  private readonly m3uCache = new Map<string, ParsedM3u>();
  private readonly xtreamCache = new Map<string, XtreamCache>();

  private getOrCreateXtreamCache(profileId: string): XtreamCache {
    const existing = this.xtreamCache.get(profileId);
    if (existing) return existing;
    const created: XtreamCache = { categories: undefined, channelsByCategoryId: new Map() };
    this.xtreamCache.set(profileId, created);
    return created;
  }

  async getCategories(profile: Profile): Promise<Category[]> {
    if (profile.type === 'm3u') {
      const parsed = await this.getParsedM3u(profile.id, profile.playlistUrl);
      return parsed.categories;
    }

    return await this.getXtreamCategories(profile);
  }

  async getChannels(profile: Profile, categoryId: string): Promise<Channel[]> {
    if (profile.type === 'm3u') {
      const parsed = await this.getParsedM3u(profile.id, profile.playlistUrl);
      return parsed.channelsByCategoryId.get(categoryId) ?? [];
    }

    return await this.getXtreamChannels(profile, categoryId);
  }

  clearCache(profileId?: string): void {
    if (!profileId) {
      this.m3uCache.clear();
      this.xtreamCache.clear();
      return;
    }
    this.m3uCache.delete(profileId);
    this.xtreamCache.delete(profileId);
  }

  // -----------------------
  // M3U / M3U8
  // -----------------------

  private async getParsedM3u(profileId: string, playlistUrl: string): Promise<ParsedM3u> {
    const cached = this.m3uCache.get(profileId);
    if (cached) return cached;

    const text = await firstValueFrom(this.http.get(playlistUrl, { responseType: 'text' }));
    const parsed = this.parseM3u(text);
    this.m3uCache.set(profileId, parsed);
    return parsed;
  }

  private parseM3u(text: string): ParsedM3u {
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const channelsByGroup = new Map<string, Channel[]>();

    let pendingName: string | null = null;
    let pendingGroup: string | null = null;
    let pendingLogo: string | undefined;

    for (const line of lines) {
      if (!line) continue;
      if (line.startsWith('#EXTINF')) {
        // Example:
        // #EXTINF:-1 tvg-id="" tvg-name="" tvg-logo="..." group-title="News",Channel Name
        const commaIdx = line.indexOf(',');
        const info = commaIdx >= 0 ? line.slice(0, commaIdx) : line;
        const name = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : 'Channel';

        const groupMatch = info.match(/group-title="([^"]*)"/i);
        const logoMatch = info.match(/tvg-logo="([^"]*)"/i);

        pendingName = name || 'Channel';
        pendingGroup = (groupMatch?.[1] ?? '').trim() || 'Other';
        pendingLogo = (logoMatch?.[1] ?? '').trim() || undefined;
        continue;
      }

      if (line.startsWith('#')) continue;

      // URL line
      if (pendingName) {
        const group = pendingGroup ?? 'Other';
        const list = channelsByGroup.get(group) ?? [];
        const channel: Channel = {
          id: `${group}:${pendingName}:${line}`,
          name: pendingName,
          logoUrl: pendingLogo,
          streamUrl: line
        };
        list.push(channel);
        channelsByGroup.set(group, list);
      }

      pendingName = null;
      pendingGroup = null;
      pendingLogo = undefined;
    }

    const categories: Category[] = Array.from(channelsByGroup.entries())
      .map(([name, channels]) => ({ id: name, name, count: channels.length }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const channelsByCategoryId = new Map<string, Channel[]>();
    for (const [name, channels] of channelsByGroup.entries()) {
      channelsByCategoryId.set(
        name,
        channels.slice().sort((a, b) => a.name.localeCompare(b.name))
      );
    }

    return { categories, channelsByCategoryId };
  }

  // -----------------------
  // Xtream Codes
  // -----------------------

  private async getXtreamCategories(profile: XtreamProfile & { id: string }): Promise<Category[]> {
    const cache = this.getOrCreateXtreamCache(profile.id);
    if (cache.categories) return cache.categories;

    const baseUrl = normalizeBaseUrl(profile.baseUrl);
    const url = `${baseUrl}/player_api.php?username=${encodeURIComponent(
      profile.username
    )}&password=${encodeURIComponent(profile.password)}&action=get_live_categories`;

    const raw = await firstValueFrom(this.http.get<any[]>(url));
    const categories: Category[] = (raw ?? [])
      .map((c) => ({
        id: String(c.category_id),
        name: String(c.category_name ?? 'Category')
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    cache.categories = categories;
    this.xtreamCache.set(profile.id, cache);
    return categories;
  }

  private async getXtreamChannels(
    profile: XtreamProfile & { id: string },
    categoryId: string
  ): Promise<Channel[]> {
    const cache = this.getOrCreateXtreamCache(profile.id);
    const cached = cache.channelsByCategoryId.get(categoryId);
    if (cached) return cached;

    const baseUrl = normalizeBaseUrl(profile.baseUrl);
    const url = `${baseUrl}/player_api.php?username=${encodeURIComponent(
      profile.username
    )}&password=${encodeURIComponent(profile.password)}&action=get_live_streams&category_id=${encodeURIComponent(
      categoryId
    )}`;

    const raw = await firstValueFrom(this.http.get<any[]>(url));

    const channels: Channel[] = (raw ?? []).map((s) => {
      const streamId = String(s.stream_id);
      const ext = pickContainerExtension(s);
      const directSource = String(s?.direct_source ?? '').trim();
      const streamUrl =
        directSource ||
        `${baseUrl}/live/${encodeURIComponent(profile.username)}/${encodeURIComponent(
          profile.password
        )}/${encodeURIComponent(streamId)}.${ext}`;

      return {
        id: streamId,
        name: String(s.name ?? 'Channel'),
        logoUrl: s.stream_icon ? String(s.stream_icon) : undefined,
        streamUrl
      };
    });

    channels.sort((a, b) => a.name.localeCompare(b.name));
    cache.channelsByCategoryId.set(categoryId, channels);
    this.xtreamCache.set(profile.id, cache);
    return channels;
  }
}


