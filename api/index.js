// Vercel serverless function entry point
const express = require('express');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs').promises;
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

// Serve static files
app.use(express.static(path.join(__dirname, '..')));

// In-memory storage for Vercel (since file system is ephemeral)
let recordings = [];
let prompts = [
    { id: "1", text: "Describe the sound of your childhood bedroom at night.", active: true, order: 1, createdAt: "2025-01-01T00:00:00.000Z" },
    { id: "2", text: "What does Sunday morning sound like in your home?", active: true, order: 2, createdAt: "2025-01-01T00:01:00.000Z" },
    { id: "3", text: "Share the soundtrack of someone you love cooking.", active: true, order: 3, createdAt: "2025-01-01T00:02:00.000Z" },
    { id: "4", text: "Tell us about a sound that makes you feel safe.", active: true, order: 4, createdAt: "2025-01-01T00:03:00.000Z" },
    { id: "5", text: "What does home sound like when it's raining?", active: true, order: 5, createdAt: "2025-01-01T00:04:00.000Z" }
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

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'admin.html'));
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
        res.json({ count: approvedRecordings.length });
    } catch (error) {
        console.error('Error getting recordings count:', error);
        res.status(500).json({ error: 'Failed to get recordings count' });
    }
});

app.get('/api/recordings/random', (req, res) => {
    try {
        const approvedRecordings = recordings.filter(r => r.approved);
        
        if (approvedRecordings.length === 0) {
            return res.status(404).json({ error: 'No recordings available' });
        }
        
        const randomIndex = Math.floor(Math.random() * approvedRecordings.length);
        const selectedRecording = approvedRecordings[randomIndex];
        
        res.json(selectedRecording);
    } catch (error) {
        console.error('Error getting random recording:', error);
        res.status(500).json({ error: 'Failed to get recording' });
    }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === (process.env.ADMIN_PASSWORD || 'welcomeadmin')) {
        req.session.authenticated = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

// Admin logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Middleware to check admin authentication
const requireAuth = (req, res, next) => {
    if (req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
};

// Admin routes
app.get('/api/admin/recordings', requireAuth, (req, res) => {
    res.json(recordings);
});

app.get('/api/admin/prompts', requireAuth, (req, res) => {
    // Add recording counts to prompts
    const promptsWithCounts = prompts.map(prompt => ({
        ...prompt,
        recordingCount: recordings.filter(r => r.prompt === prompt.text).length,
        approvedCount: recordings.filter(r => r.prompt === prompt.text && r.approved).length
    }));
    res.json(promptsWithCounts);
});

app.get('/api/admin/prompts/next-peek', requireAuth, (req, res) => {
    try {
        const nextPrompt = peekNextPromptInSequence();
        if (nextPrompt) {
            res.json(nextPrompt);
        } else {
            res.status(404).json({ error: 'No active prompts available' });
        }
    } catch (error) {
        console.error('Error peeking next prompt:', error);
        res.status(500).json({ error: 'Failed to get next prompt' });
    }
});

// Basic recording submission (simplified for Vercel)
app.post('/api/recordings', (req, res) => {
    try {
        const { prompt, audioData, duration } = req.body;
        
        if (!prompt || !audioData) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const recording = {
            id: uuidv4(),
            filename: `recording-${uuidv4()}.webm`,
            prompt,
            timestamp: new Date().toISOString(),
            tags: [],
            approved: true, // Auto-approve for demo
            duration: duration || 60
        };

        recordings.push(recording);
        
        res.json({ 
            success: true, 
            message: 'Recording uploaded successfully',
            id: recording.id 
        });
    } catch (error) {
        console.error('Error uploading recording:', error);
        res.status(500).json({ error: 'Failed to upload recording' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development',
        prompts: prompts.length,
        recordings: recordings.length
    });
});

// Simple test endpoint
app.get('/test', (req, res) => {
    res.json({ 
        message: 'Vercel serverless function is working!',
        timestamp: new Date().toISOString()
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Catch-all handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

module.exports = app;