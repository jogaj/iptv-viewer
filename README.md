# IPTV Viewer (Angular 20.0.5)

Responsive IPTV viewer built with **Angular 20.0.5**, **Angular Material**, **standalone components**, **signals**, and the new **control flow** syntax.

## Requirements

- **Node.js 20.19+** (Angular 20 requires Node 20+). This repo includes `.nvmrc` set to `20.19.0`.

## Run

```bash
npm install
npm start
```

Then open the URL printed by `ng serve`.

## How it works

- **/profile**: create/edit/delete IPTV profiles
  - **M3U/M3U8 URL** tab: paste playlist URL
  - **Xtream Codes** tab: base URL + username + password
- **/view**: select **Categories** → **Channels** → the player auto-starts playback.

## Notes

- **CORS**: Some providers block browser requests to M3U/Xtream endpoints. If that happens you’ll need a small proxy (backend) or provider-side CORS enabled.


