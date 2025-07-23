// Vercel serverless function entry point
const express = require('express');
const session = require('express-session');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'sounds-like-home-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// In-memory storage for Vercel (since file system is ephemeral)
let recordings = [];
let prompts = [
    { id: "1", text: "Describe the sound of your childhood bedroom at night.", active: true, order: 1, createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "2", text: "What does Sunday morning sound like in your home?", active: true, order: 2, createdAt: "2025-01-01T00:01:00.000Z" },
    { id: "3", text: "Share the soundtrack of someone you love cooking.", active: true, order: 3, createdAt: "2025-01-01T00:02:00.000Z" },
    { id: "4", text: "Tell us about a sound that makes you feel safe.", active: true, order: 4, createdAt: "2025-01-01T00:03:00.000Z" },
    { id: "5", text: "What does home sound like when it's raining?", active: true, order: 5, createdAt: "2025-01-01T00:04:00.000Z" },
    { id: "6", text: "Describe the first sound you remember from your childhood home.", active: true, order: 6, createdAt: "2025-01-01T00:05:00.000Z" },
    { id: "7", text: "What sound do you miss most from a place you used to live?", active: true, order: 7, createdAt: "2025-01-01T00:06:00.000Z" }
];
let promptState = { currentPromptIndex: 0, lastUpdated: new Date().toISOString() };

// Helper functions
function getNextPromptInSequence() {
    const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
    if (activePrompts.length === 0) return null;
    
    const currentPrompt = activePrompts[promptState.currentPromptIndex];
    promptState.currentPromptIndex = (promptState.currentPromptIndex + 1) % activePrompts.length;
    promptState.lastUpdated = new Date().toISOString();
    
    return currentPrompt;
}

function peekNextPromptInSequence() {
    const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
    if (activePrompts.length === 0) return null;
    return activePrompts[promptState.currentPromptIndex];
}

// Serve static HTML files
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sounds Like Home</title>
    <link rel="stylesheet" href="/styles">
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
    
    <script src="/app"></script>
</body>
</html>
    `);
});

// Serve CSS
app.get('/styles', (req, res) => {
    res.type('css').send(\`
/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Georgia', 'Times New Roman', serif;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #4a5568;
    line-height: 1.6;
}

.container {
    width: 100%;
    max-width: 480px;
    padding: 2rem 1.5rem;
    text-align: center;
}

.title {
    font-size: 1.8rem;
    font-weight: 300;
    color: #2d3748;
    margin-bottom: 3rem;
    letter-spacing: 0.5px;
    opacity: 0.8;
}

.content {
    display: flex;
    flex-direction: column;
    gap: 3rem;
    align-items: center;
}

.prompt-section {
    padding: 0 1rem;
    max-width: 400px;
}

.prompt-text {
    font-size: 1.1rem;
    color: #4a5568;
    font-style: italic;
    line-height: 1.7;
    margin-bottom: 2rem;
    opacity: 0.9;
}

.recording-section {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;
}

.record-btn {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    border: none;
    background: linear-gradient(145deg, #667eea 0%, #764ba2 100%);
    box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
    color: white;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    position: relative;
    overflow: hidden;
}

.record-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(102, 126, 234, 0.4);
}

.record-btn.recording {
    background: linear-gradient(145deg, #ff6b6b 0%, #ee5a24 100%);
    animation: pulse-record 1.5s infinite;
}

.record-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: currentColor;
    transition: all 0.3s ease;
}

.record-btn.recording .record-icon {
    border-radius: 4px;
    width: 20px;
    height: 20px;
}

.record-text {
    font-size: 0.9rem;
    font-weight: 400;
}

.listen-btn {
    padding: 0.75rem 2rem;
    border: 2px solid #b794f6;
    border-radius: 25px;
    background: rgba(183, 148, 246, 0.1);
    color: #553c9a;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
}

.listen-btn:hover {
    background: linear-gradient(145deg, #b794f6 0%, #9f7aea 100%);
    color: white;
    border-color: transparent;
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(183, 148, 246, 0.4);
}

.hidden {
    display: none !important;
}

@keyframes pulse-record {
    0%, 100% {
        box-shadow: 0 8px 32px rgba(255, 107, 107, 0.3);
    }
    50% {
        box-shadow: 0 8px 32px rgba(255, 107, 107, 0.6);
    }
}
    \`);
});

// Serve JavaScript
app.get('/app', (req, res) => {
    res.type('js').send(\`
console.log('Sounds Like Home - Demo Version');
alert('Welcome to Sounds Like Home! This is a demo version running on Vercel. Some features may be limited.');
    \`);
});

// Admin route (simplified)
app.get('/admin', (req, res) => {
    res.send(\`
<!DOCTYPE html>
<html>
<head>
    <title>Admin - Sounds Like Home</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 2rem; max-width: 400px; margin: 0 auto; }
        .form { background: #f5f5f5; padding: 2rem; border-radius: 8px; }
        input, button { width: 100%; padding: 1rem; margin: 0.5rem 0; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #667eea; color: white; cursor: pointer; }
    </style>
</head>
<body>
    <div class="form">
        <h2>Admin Login</h2>
        <p><strong>Demo Admin Panel</strong></p>
        <p>Password: welcomeadmin</p>
        <input type="password" placeholder="Enter password" id="password">
        <button onclick="login()">Login</button>
    </div>
    <script>
        function login() {
            const password = document.getElementById('password').value;
            if (password === 'welcomeadmin') {
                alert('Login successful! Admin features are limited in this demo.');
            } else {
                alert('Invalid password. Try: welcomeadmin');
            }
        }
    </script>
</body>
</html>
    \`);
});

// API Routes
app.get('/api/prompts/next', (req, res) => {
    try {
        const prompt = getNextPromptInSequence();
        if (prompt) {
            res.json({ text: prompt.text });
        } else {
            res.json({ text: "What does home sound like to you?" });
        }
    } catch (error) {
        console.error('Error getting next prompt:', error);
        res.status(500).json({ error: 'Failed to get prompt' });
    }
});

app.get('/api/recordings/count', (req, res) => {
    try {
        const approvedRecordings = recordings.filter(r => r.approved);
        res.json({ count: Math.max(approvedRecordings.length, 5) }); // Show at least 5 for demo
    } catch (error) {
        console.error('Error getting recordings count:', error);
        res.status(500).json({ error: 'Failed to get recordings count' });
    }
});

// Test endpoints
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Vercel serverless function is working!',
        timestamp: new Date().toISOString(),
        prompts: prompts.length
    });
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
        prompts: prompts.length,
        recordings: recordings.length
    });
});

// Catch-all handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

module.exports = app;