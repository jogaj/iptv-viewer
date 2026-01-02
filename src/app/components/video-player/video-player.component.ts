import { Component, ElementRef, effect, input, viewChild } from '@angular/core';
import Hls from 'hls.js';

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
      <video #video controls playsinline></video>
    </div>
  `
})
export class VideoPlayerComponent {
  readonly srcUrl = input<string | null>(null);

  private readonly videoRef = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  private hls: Hls | null = null;

  constructor() {
    effect((onCleanup) => {
      const url = this.srcUrl();
      const video = this.videoRef().nativeElement;

      // Cleanup previous HLS instance
      this.hls?.destroy();
      this.hls = null;

      if (!url) {
        video.pause();
        video.removeAttribute('src');
        video.load();
        return;
      }

      const isHls = /\.m3u8($|\?)/i.test(url);

      // Note: Safari can play HLS natively. Chrome/Firefox usually require hls.js for HLS.
      const canPlayNativeHls = video.canPlayType('application/vnd.apple.mpegurl') !== '';

      const logVideoError = (context: string) => {
        const err = video.error;
        // MediaError codes: 1=ABORTED, 2=NETWORK, 3=DECODE, 4=SRC_NOT_SUPPORTED
        console.log(`[VideoPlayer] ${context}`, {
          url,
          code: err?.code ?? null,
          message: (err as any)?.message ?? null
        });
      };

      const onError = () => logVideoError('video element error');
      video.addEventListener('error', onError);

      if (isHls) {
        if (canPlayNativeHls) {
          video.src = url;
          void video.play().catch((e) => console.log('[VideoPlayer] play() failed', e));
        } else if (Hls.isSupported()) {
          this.hls = new Hls({ enableWorker: true });
          this.hls.on(Hls.Events.ERROR, (_evt, data) => {
            console.log('[VideoPlayer] hls.js error', { url, ...data });
          });
          this.hls.loadSource(url);
          this.hls.attachMedia(video);
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            void video.play().catch((e) => console.log('[VideoPlayer] play() failed', e));
          });
        } else {
          // Last resort: try setting src directly.
          video.src = url;
          void video.play().catch((e) => console.log('[VideoPlayer] play() failed', e));
        }
      } else {
        // Non-HLS URLs (mp4/webm/etc). Setting hls.js here will usually fail.
        video.src = url;
        void video.play().catch((e) => console.log('[VideoPlayer] play() failed', e));
      }

      onCleanup(() => {
        video.removeEventListener('error', onError);
        this.hls?.destroy();
        this.hls = null;
      });
    });
  }
}


