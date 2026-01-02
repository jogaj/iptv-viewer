import { Component, ElementRef, effect, input, viewChild } from '@angular/core';
import videojs from 'video.js';

@Component({
  selector: 'app-video-player',
  standalone: true,
  styles: [
    `
      .player {
        width: 100%;
        height: 100%;
        background: #000;
        border-radius: 12px;
        overflow: hidden;
        display: block;
      }
      video {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: contain;
        background: #000;
      }
    `
  ],
  template: `
    <div class="player">
      <video #video class="video-js vjs-big-play-centered" playsinline></video>
    </div>
  `
})
export class VideoPlayerComponent {
  readonly srcUrl = input<string | null>(null);

  private readonly videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  private player: any | null = null;

  constructor() {
    effect((onCleanup) => {
      const url = this.srcUrl();
      const videoEl = this.videoRef().nativeElement;

      if (!this.player) {
        this.player = videojs(videoEl, {
          controls: true,
          autoplay: false,
          preload: 'auto',
          fluid: true,
          responsive: true
        });

        this.player.on('error', () => {
          const err = this.player?.error();
          console.log('[VideoPlayer] video.js error', {
            url: this.srcUrl(),
            code: err?.code ?? null,
            message: (err as any)?.message ?? null
          });
        });
      }

      if (!url) {
        this.player.pause();
        this.player.src([]);
        return;
      }

      const isHls = /\.m3u8($|\?)/i.test(url);
      const type = isHls ? 'application/x-mpegURL' : undefined;

      console.log('[VideoPlayer] loading', { url, type: type ?? '(inferred)' });

      this.player.src([{ src: url, type }].filter(Boolean) as any);
      void this.player.play().catch((e: unknown) => console.log('[VideoPlayer] play() failed', e));

      onCleanup(() => {
        // no-op; keep player instance for subsequent URL changes.
      });
    });

    // Dispose when component is destroyed.
    effect((onCleanup) => {
      onCleanup(() => {
        this.player?.dispose();
        this.player = null;
      });
    });
  }
}


