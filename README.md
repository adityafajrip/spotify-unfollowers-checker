# Spotify Unfollowers

Chrome/Edge extension to check who doesn't follow you back on Spotify.

![Chrome](https://img.shields.io/badge/Chrome-Extension-green?logo=googlechrome)
![Edge](https://img.shields.io/badge/Edge-Add--on-blue?logo=microsoftedge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)

## Preview

| Scanning | Not Following Back | Not Following |
|----------|-------------------|---------------|
| <img src="screenshot.png" width="300"> | <img src="screenshot1.png" width="300"> | <img src="screenshot2.png" width="300"> |

## Features

- Scan any public Spotify profile
- See who doesn't follow you back
- See who you haven't followed back
- Fast, private, and free

## Requirements

- Logged in to [open.spotify.com](https://open.spotify.com)
- Target profile must be **public**

## Usage

1. Open a Spotify profile page (`open.spotify.com/user/...`)
2. Click the extension icon
3. Hit **Start Scan**
4. See results

## Development

```bash
npm install
npm run dev       # watch mode
npm run build     # production build
```

Output goes to `dist/`. Load it as an unpacked extension via `chrome://extensions` or `edge://extensions`.

## Tech

Manifest V3, TypeScript, Vite.

## Notes

- No official Spotify API used — just scrapes public pages
- May break if Spotify changes their page layout
- All data stays local in your browser

## License

MIT
