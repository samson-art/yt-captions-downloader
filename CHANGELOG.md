# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-02-03

### Added

- MCP server (Cursor) over stdio (`src/mcp.ts`) with tools:
  - `get_transcript` (plain text transcript, paginated)
  - `get_raw_subtitles` (raw SRT/VTT, paginated)
  - `get_available_subtitles` (official vs auto language codes)
  - `get_video_info` (basic metadata via yt-dlp)
- Docker image for MCP server (`Dockerfile.mcp`)
- `docker-compose.example.yml` with an additional MCP service example
- `REPOSITORY_OVERVIEW.md` project overview document

### Changed

- Switched project to ESM:
  - `package.json` now uses `"type": "module"`
  - TypeScript config updated to `module/moduleResolution: nodenext`
  - Local imports updated to use `.js` extensions for NodeNext compatibility
- Added MCP-related scripts:
  - `start:mcp`, `dev:mcp`
- yt-dlp integration extended with:
  - `fetchVideoInfo`
  - `fetchAvailableSubtitles`
  - shared handling for yt-dlp env flags (`--cookies`, `--js-runtimes`, `--remote-components`)
- Jest config renamed to `jest.config.cjs`

### Security

- Added `cookies.txt` to `.gitignore` to avoid accidental commits of sensitive cookies

## [0.2.0] - 2026-01-29

### Added

- Docker Compose configuration for easier container orchestration and deployment
- Cookie support for accessing age-restricted or region-locked YouTube videos
- `COOKIES_FILE_PATH` environment variable for persistent cookie file management
- `@fastify/multipart` dependency for handling file uploads in cookie requests
- Comprehensive cookie handling with proper sanitization and temporary file management

### Changed

- Refactored API routes in `src/index.ts` for improved code organization
- Updated README with detailed cookie usage examples and new environment variables
- Simplified validation logic by removing redundant cookie validation code
- Enhanced subtitle download function to support optional cookie parameters

### Removed

- Health check endpoint from Dockerfile (moved to application-level routing)

## [0.1.0] - 2025-12-27

### Added

- API for downloading subtitles from YouTube videos
- Support for official and auto-generated subtitles
- Support for multiple subtitle languages
- `/api/subtitles` endpoint for retrieving cleaned subtitles (plain text)
- `/api/subtitles/raw` endpoint for retrieving raw subtitles with timestamps
- Support for SRT and VTT formats
- `/health` endpoint for server health checks
- Input data validation using TypeBox schema validation
- Error handling with clear error messages
- Docker image for application deployment
- CORS support for cross-origin requests
- Request and error logging
- TypeScript for type safety
- Rate limiting with configurable limits and time windows
- Graceful shutdown handling (SIGTERM, SIGINT)
- Unhandled promise rejection and uncaught exception handlers
- Configurable yt-dlp command timeout via environment variables
- Configurable shutdown timeout via environment variables
- Jest testing framework with test coverage
- Unit tests for YouTube subtitle functionality
- Unit tests for request validation
