# Serverless API Structure

This document outlines the new serverless API structure for the Sounds Like Home application.

## Directory Structure

```
├── api/                           # Vercel serverless functions
│   ├── recordings.js              # POST /api/recordings
│   ├── recordings/
│   │   ├── count.js               # GET /api/recordings/count
│   │   ├── random.js              # GET /api/recordings/random
│   │   └── [id]/
│   │       └── audio.js           # GET /api/recordings/:id/audio
│   ├── prompts/
│   │   └── next.js                # GET /api/prompts/next
│   └── admin/
│       ├── login.js               # POST /api/admin/login
│       ├── logout.js              # POST /api/admin/logout
│       ├── recordings.js          # GET /api/admin/recordings
│       ├── prompts.js             # GET/POST /api/admin/prompts
│       ├── prompts/
│       │   ├── [id].js            # PUT/DELETE /api/admin/prompts/:id
│       │   ├── [id]/
│       │   │   └── queue-next.js  # PUT /api/admin/prompts/:id/queue-next
│       │   └── next-peek.js       # GET /api/admin/prompts/next-peek
│       └── recordings/
│           └── [id].js            # PUT/DELETE /api/admin/recordings/:id
├── lib/                           # Shared utilities
│   ├── auth.js                    # Authentication helpers
│   ├── blob-storage.js            # Vercel Blob storage functions
│   ├── data-storage.js            # File system data operations
│   └── prompt-sequence.js         # Prompt sequencing logic
├── index.js                       # Main app entry point
└── vercel.json                    # Vercel configuration
```

## API Endpoints

### Public Endpoints

- **GET /api/prompts/next** - Get next prompt in sequence
- **POST /api/recordings** - Submit new recording
- **GET /api/recordings/random** - Get random recording for listening
- **GET /api/recordings/count** - Get count of approved recordings
- **GET /api/recordings/:id/audio** - Stream audio file from Blob storage

### Admin Endpoints (Authentication Required)

- **POST /api/admin/login** - Admin authentication
- **POST /api/admin/logout** - Admin logout
- **GET /api/admin/recordings** - Get all recordings
- **PUT /api/admin/recordings/:id** - Update recording
- **DELETE /api/admin/recordings/:id** - Delete recording
- **GET /api/admin/prompts** - Get all prompts with analytics
- **POST /api/admin/prompts** - Add new prompt
- **PUT /api/admin/prompts/:id** - Update prompt
- **DELETE /api/admin/prompts/:id** - Delete prompt
- **GET /api/admin/prompts/next-peek** - Peek at next prompt
- **PUT /api/admin/prompts/:id/queue-next** - Queue specific prompt next

## Shared Libraries

### lib/blob-storage.js
- `uploadToBlob(filename, buffer, contentType)` - Upload file to Vercel Blob
- `deleteFromBlob(url)` - Delete file from Vercel Blob

### lib/data-storage.js
- `loadRecordings()` - Load recordings from JSON
- `saveRecordings(recordings)` - Save recordings to JSON
- `loadPrompts()` - Load prompts from JSON
- `savePrompts(prompts)` - Save prompts to JSON
- `loadPromptState()` - Load prompt queue state
- `savePromptState(state)` - Save prompt queue state
- `initializeDataFile()` - Initialize data directories and files

### lib/auth.js
- `requireAuth(req, res, next)` - Authentication middleware
- `checkAdminPassword(password)` - Validate admin password

### lib/prompt-sequence.js
- `getNextPromptInSequence()` - Get and advance to next prompt
- `peekNextPromptInSequence()` - View next prompt without advancing

## Environment Variables

Required environment variables:

- `BLOB_READ_WRITE_TOKEN` - Vercel Blob storage token
- `SESSION_SECRET` - Session encryption secret
- `ADMIN_PASSWORD` - Admin panel password
- `NODE_ENV` - Environment (production/development)

## Features

✅ **Serverless Architecture** - Each API endpoint is a separate function
✅ **Vercel Blob Integration** - Audio files stored in cloud storage
✅ **Shared Utilities** - Common functions extracted to lib/ directory
✅ **Authentication** - Admin endpoints protected with session auth
✅ **File Management** - JSON data storage with automatic initialization
✅ **Error Handling** - Comprehensive error handling in all endpoints
✅ **CORS Support** - Cross-origin requests supported
✅ **Session Management** - Secure session handling for admin features

## Deployment

The application is now fully compatible with Vercel's serverless architecture:

1. Each API route is an independent serverless function
2. Shared code is in the `lib/` directory
3. Static files served through the main `index.js` handler
4. Vercel Blob storage for audio file persistence
5. JSON files for metadata (stored in `/tmp` on serverless)

This structure provides better scalability, faster cold starts, and improved maintainability.