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

      const canPlayNative = video.canPlayType('application/vnd.apple.mpegurl') !== '';
      if (canPlayNative) {
        video.src = url;
        void video.play().catch((e) => {console.log(e)});
      } else if (Hls.isSupported()) {
        this.hls = new Hls({ enableWorker: true });
        this.hls.loadSource(url);
        this.hls.attachMedia(video);
        this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch((e) => {console.log(e)});
        });
      } else {
        // Fallback: try setting src directly
        video.src = url;
        void video.play().catch((e) => {console.log(e)});
      }

      onCleanup(() => {
        this.hls?.destroy();
        this.hls = null;
      });
    });
  }
}


