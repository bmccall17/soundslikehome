const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const { initializeDataFile } = require('./lib/data-storage');

const app = express();
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'sounds-like-home-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: IS_PRODUCTION,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Static file serving
app.use(express.static('.', {
    setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        }
    }
}));

// Main app routes
app.get('/', (req, res) => {
    try {
        const indexPath = path.join(__dirname, 'index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
        } else {
            // Fallback HTML if file doesn't exist
            res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sounds Like Home</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <header>
            <h1 class="title">Sounds Like Home</h1>
        </header>
        <main class="content">
            <div class="prompt-section">
                <p class="prompt-text" id="current-prompt">Loading your moment...</p>
            </div>
            <div class="recording-section">
                <button class="record-btn" id="record-btn">
                    <span class="record-icon"></span>
                    <span class="record-text">Record</span>
                </button>
                <div class="action-buttons hidden" id="action-buttons">
                    <button class="action-btn submit-btn" id="submit-btn">Submit to Home</button>
                    <button class="action-btn restart-btn" id="restart-btn">Restart Recording</button>
                </div>
                <div class="recording-indicator hidden" id="recording-indicator">
                    <div class="recording-info">
                        <div class="pulse-circle"></div>
                        <span class="recording-text">Recording...</span>
                    </div>
                    <div class="recording-progress-container">
                        <div class="recording-progress-bar">
                            <div class="recording-progress-fill" id="recording-progress-fill"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="listen-section">
                <button class="listen-btn" id="listen-btn">Listen</button>
                <div class="listening-prompt hidden" id="listening-prompt">
                    <p class="listening-prompt-text" id="listening-prompt-text"></p>
                    <div class="audio-progress-container" id="audio-progress-container">
                        <div class="audio-controls">
                            <button class="audio-play-pause-btn" id="audio-play-pause-btn">
                                <span class="play-icon">▶</span>
                                <span class="pause-icon hidden">⏸</span>
                            </button>
                            <div class="audio-progress-bar">
                                <div class="audio-progress-fill" id="audio-progress-fill"></div>
                            </div>
                        </div>
                        <div class="audio-time-display">
                            <span id="current-time">0:00</span> / <span id="total-time">0:00</span>
                        </div>
                    </div>
                </div>
                <div class="bubbles-container" id="bubbles-container">
                    <!-- Bubbles will be generated dynamically -->
                </div>
            </div>
        </main>
        <div class="audio-player hidden" id="audio-player">
            <audio controls id="playback-audio"></audio>
        </div>
    </div>
    <script src="app.js"></script>
</body>
</html>
            `);
        }
    } catch (error) {
        console.error('Error serving index page:', error);
        res.status(500).send('Error loading page');
    }
});

// Admin interface
app.get('/admin', (req, res) => {
    try {
        const adminPath = path.join(__dirname, 'admin.html');
        if (fs.existsSync(adminPath)) {
            res.sendFile(adminPath);
        } else {
            res.status(404).send('Admin page not found');
        }
    } catch (error) {
        console.error('Error serving admin page:', error);
        res.status(500).send('Error loading admin page');
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
        serverless: true,
        blobStorage: !!process.env.BLOB_READ_WRITE_TOKEN
    });
});

// Initialize app
async function initialize() {
    try {
        // Initialize data files
        await initializeDataFile();
        console.log('✅ Application initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing application:', error);
    }
}

// Initialize on startup
initialize();

// Export for Vercel
module.exports = app;