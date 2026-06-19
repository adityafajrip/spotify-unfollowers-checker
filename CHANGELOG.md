# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-06-20

### Added
- Migrated project to Vite + TypeScript build system
- Minified production build output for store submission
- Extension badge shows unfollower count
- Cancel scan button during active scan
- Real-time progress label with discovered user count
- Skeleton loading for avatars
- Tooltips on result tabs and Rescan button
- Keyboard shortcut `Ctrl+Shift+U` (Windows) / `Cmd+Shift+U` (Mac) to start scan
- README.md, PRIVACY.md, and STORE_LISTING.md for project documentation
- ESLint + Prettier configuration

### Changed
- Profile comparison now uses user URL instead of display name for accuracy
- Interceptor listener validates user ID match more reliably
- Improved Content Security Policy (CSP) in manifest
- Updated manifest to include all icon sizes (16, 32, 48, 64, 128)

### Fixed
- Fixed profile name showing wrong text (e.g. "Your Library") when scanning other users
- Fixed profile avatar not appearing on scan results
- Fixed CSP blocking inline styles and Spotify avatar images
- Fixed extension badge API error in service worker

## [1.0.0] - 2026-06-18

### Added
- Initial release
- Spotify profile scanning for following/followers lists
- Unfollowers and Not Following Back result lists
- Cyber-themed popup UI with Spotify green accents
- Manifest V3 Chrome extension setup
