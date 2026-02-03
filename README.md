# YouTube Captions MCP Server (stdio)

An **MCP server over stdio** that can fetch YouTube transcripts/subtitles via `yt-dlp`, with pagination for large responses. It works with **Cursor and other MCP hosts** that support stdio transport. This repo also includes an optional REST API (Fastify), but the primary focus is MCP.

## MCP quick start (recommended)

### Docker Hub image

- Image: `artsamsonov/yt-captions-mcp:latest`

Run locally (stdio mode):

```bash
docker run --rm -i artsamsonov/yt-captions-mcp:latest
```

### Cursor MCP configuration (Docker)

Add to Cursor MCP settings (or create `.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "yt-captions": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "artsamsonov/yt-captions-mcp:latest"]
    }
  }
}
```

### Available MCP tools

- `get_transcript` — cleaned plain text subtitles (paginated)
- `get_raw_subtitles` — raw SRT/VTT (paginated)
- `get_available_subtitles` — list official vs auto language codes
- `get_video_info` — basic metadata from `yt-dlp`

## Features

- 🎬 Extract video ID from YouTube URLs
- 📝 Download subtitles (official → auto-generated fallback)
- 🌍 Support for multiple languages
- 📄 SRT and VTT format support
- 🧹 Clean subtitles (remove timestamps and formatting)
- 📋 Return plain text or raw subtitle content
- 🐳 Dockerized for easy deployment
- 🚀 Built with Fastify for high performance
- 🛡️ Rate limiting and error handling

## Requirements

- **Docker** (recommended for production)
- **Node.js** >= 20.0.0 (for local development)
- **yt-dlp** (included in Docker image)

## REST API (optional)

The repository also ships an HTTP API (Fastify). If you want to run the REST API in Docker, build it locally from `Dockerfile`:

#### Build the image

```bash
docker build -t yt-captions-downloader .
```

#### Run the container

```bash
docker run -p 3000:3000 yt-captions-downloader
```

#### Run with custom port

```bash
docker run -p 8080:8080 -e PORT=8080 yt-captions-downloader
```

#### Environment Variables

- `PORT` - Server port (default: `3000`)
- `HOST` - Server host (default: `0.0.0.0`)
- `YT_DLP_TIMEOUT` - Timeout for yt-dlp command in milliseconds (default: `60000` - 60 seconds)
- `YT_DLP_JS_RUNTIMES` - JS runtime(s) for yt-dlp extraction (e.g., `node` or `node:/usr/bin/node`)
- `COOKIES_FILE_PATH` - Path to `cookies.txt` in Netscape format (optional, for age-restricted/sign-in)
- `RATE_LIMIT_MAX` - Maximum number of requests per time window (default: `100`)
- `RATE_LIMIT_TIME_WINDOW` - Time window for rate limiting (default: `1 minute`)
- `SHUTDOWN_TIMEOUT` - Graceful shutdown timeout in milliseconds (default: `10000` - 10 seconds)

**Example with custom yt-dlp timeout:**

```bash
docker run -p 3000:3000 -e YT_DLP_TIMEOUT=120000 yt-captions-downloader
```

### Troubleshooting: age-restricted / sign-in required

If yt-dlp is blocked by an age gate or sign-in requirement, requests can return `404 Subtitles not found`.
Provide authenticated cookies via `COOKIES_FILE_PATH` and mount the file into the container:

```bash
docker run -p 3000:3000 \
  -e COOKIES_FILE_PATH=/cookies/cookies.txt \
  -v /path/to/cookies.txt:/cookies/cookies.txt:ro \
  yt-captions-downloader
```

#### Run in background

```bash
docker run -d -p 3000:3000 --name yt-captions yt-captions-downloader
```

#### View logs

```bash
docker logs -f yt-captions
```

#### Stop the container

```bash
docker stop yt-captions
docker rm yt-captions
```

## API Documentation

### POST /subtitles

Retrieve cleaned subtitles (plain text without timestamps) from a YouTube video.

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "type": "auto",
  "lang": "en"
}
```

**Parameters:**
- `url` (required) - YouTube video URL
- `type` (optional, default: `"auto"`) - Subtitle type: `"official"` (official subtitles) or `"auto"` (auto-generated subtitles)
- `lang` (optional, default: `"en"`) - Subtitle language code (e.g., `"en"`, `"ru"`, `"es"`, `"fr"`)

**Response (Success):**
```json
{
  "videoId": "VIDEO_ID",
  "type": "auto",
  "lang": "en",
  "text": "Plain text subtitles without timestamps...",
  "length": 1234
}
```

**Response (Error):**
```json
{
  "error": "Error type",
  "message": "Error message"
}
```

**Example Requests:**

Auto-generated subtitles in English (default):
```bash
curl -X POST http://localhost:3000/subtitles \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Official subtitles in Russian:
```bash
curl -X POST http://localhost:3000/subtitles \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "type": "official", "lang": "ru"}'
```

Auto-generated subtitles in Spanish:
```bash
curl -X POST http://localhost:3000/subtitles \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "type": "auto", "lang": "es"}'
```

### POST /subtitles/raw

Retrieve raw subtitles from a YouTube video without cleaning (includes timestamps and formatting).

**Request Body:**
```json
{
  "url": "https://www.youtube.com/watch?v=VIDEO_ID",
  "type": "auto",
  "lang": "en"
}
```

**Parameters:**
- `url` (required) - YouTube video URL
- `type` (optional, default: `"auto"`) - Subtitle type: `"official"` or `"auto"`
- `lang` (optional, default: `"en"`) - Subtitle language code

**Response (Success):**
```json
{
  "videoId": "VIDEO_ID",
  "type": "auto",
  "lang": "en",
  "format": "srt",
  "content": "1\n00:00:00,000 --> 00:00:05,000\nHello world\n\n2\n00:00:05,000 --> 00:00:10,000\n...",
  "length": 1234
}
```

**Response Fields:**
- `videoId` - YouTube video ID
- `type` - Subtitle type (`"official"` or `"auto"`)
- `lang` - Subtitle language code
- `format` - Subtitle format (`"srt"` or `"vtt"`)
- `content` - Raw subtitle file content (SRT or VTT format) without processing
- `length` - Content length in characters

**Response (Error):**
```json
{
  "error": "Error type",
  "message": "Error message"
}
```

**Example Requests:**

Get raw auto-generated subtitles in English:
```bash
curl -X POST http://localhost:3000/subtitles/raw \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'
```

Get raw official subtitles in Russian:
```bash
curl -X POST http://localhost:3000/subtitles/raw \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "type": "official", "lang": "ru"}'
```

## MCP Server (stdio)

This project also ships an MCP server over stdio. It reuses the same `yt-dlp` based extraction and can return full transcript text or raw subtitles. Cursor configuration examples are provided below, but it should work with any MCP host that supports stdio.

### Available Tools

- `get_transcript` - cleaned plain text subtitles (supports pagination)
- `get_raw_subtitles` - raw SRT/VTT (supports pagination)
- `get_available_subtitles` - list official vs auto language codes
- `get_video_info` - basic metadata from `yt-dlp`

### Pagination

Tools that return large text accept:
- `response_limit` (default `50000`, min `1000`, max `200000`)
- `next_cursor` (string offset from a previous response)

If the response is truncated, the tool returns `next_cursor` so you can fetch the next chunk.

### Local setup

```bash
npm install
npm run build
npm run start:mcp
```

### Cursor MCP configuration (local)

Create `.cursor/mcp.json` (or add to your global Cursor MCP settings):

```json
{
  "mcpServers": {
    "yt-captions": {
      "command": "node",
      "args": ["dist/mcp.js"]
    }
  }
}
```

### Docker setup

Build and run the MCP server in a container (stdio mode):

```bash
docker build -f Dockerfile.mcp -t yt-captions-mcp .
docker run --rm -i yt-captions-mcp
```

Cursor MCP config for Docker:

```json
{
  "mcpServers": {
    "yt-captions": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "artsamsonov/yt-captions-mcp:latest"]
    }
  }
}
```

### Related MCP implementations

This MCP server borrows the best ideas from existing implementations:

- `jkawamoto/mcp-youtube-transcript`: Docker image + pagination
- `kimtaeyoon83/mcp-server-youtube-transcript`: timestamps + language fallback
- `anaisbetts/mcp-youtube` and `@bingyin/youtube-mcp`: `yt-dlp` based extraction

## How It Works

1. The API receives a YouTube URL and parameters (subtitle type and language) from the client
2. Extracts the video ID from the URL
3. Uses `yt-dlp` to download subtitles with the specified parameters:
   - Single `yt-dlp` command call with explicit type (`--write-subs` or `--write-auto-subs`) and language (`--sub-lang`)
4. Parses the subtitle file (SRT/VTT) and removes:
   - Timestamps
   - Subtitle numbers
   - HTML tags
   - Formatting
5. Returns clean plain text (for `/subtitles`) or raw content (for `/subtitles/raw`)

## Development

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn
- yt-dlp installed and available in PATH

### Scripts

- `npm run build` - Build the TypeScript project
- `npm start` - Run the compiled application
- `npm run dev` - Run with hot reload using ts-node-dev
- `npm run start:mcp` - Run the MCP server (stdio)
- `npm run dev:mcp` - Run the MCP server with hot reload
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run lint` - Lint the code
- `npm run lint:fix` - Fix linting errors
- `npm run type-check` - Type check without building
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Project Structure

```
├── src/
│   ├── index.ts          # Main application entry point
│   ├── mcp.ts            # MCP server entry point
│   ├── validation.ts     # Request validation logic
│   └── youtube.ts        # YouTube subtitle downloading and parsing
├── dist/                 # Compiled JavaScript (generated)
├── Dockerfile            # Docker image configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Technologies

- **TypeScript** - Type-safe JavaScript
- **Node.js** - Runtime environment
- **Fastify** - Fast and low overhead web framework
- **yt-dlp** - YouTube content downloader
- **Docker** - Containerization
- **Jest** - Testing framework
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure your code passes all tests and linting checks before submitting.

## License

MIT License

Copyright (c) 2025 samson-art

See [LICENSE](LICENSE) file for details.

## Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/samson-art/yt-captions-downloader/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/samson-art/yt-captions-downloader/issues)
- 📧 **Contact**: [GitHub Profile](https://github.com/samson-art)
