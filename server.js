const express = require('express');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const { put, del, list } = require('@vercel/blob');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'sounds-like-home-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: IS_PRODUCTION, // Use secure cookies in production
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Vercel Blob storage configuration
const BLOB_STORE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DATA_FILE = path.join(__dirname, 'data', 'recordings.json');
const PROMPTS_FILE = path.join(__dirname, 'data', 'prompts.json');
const PROMPT_STATE_FILE = path.join(__dirname, 'data', 'prompt-state.json');

// Blob storage helper functions
async function uploadToBlob(filename, buffer, contentType = 'audio/webm') {
    try {
        const blob = await put(filename, buffer, {
            access: 'public',
            contentType: contentType,
            token: BLOB_STORE_TOKEN
        });
        return blob;
    } catch (error) {
        console.error('Error uploading to blob:', error);
        throw error;
    }
}

async function deleteFromBlob(url) {
    try {
        await del(url, { token: BLOB_STORE_TOKEN });
    } catch (error) {
        console.error('Error deleting from blob:', error);
        throw error;
    }
}

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
}

// Data management functions
async function loadRecordings() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading recordings:', error);
        return [];
    }
}

async function saveRecordings(recordings) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(recordings, null, 2));
    } catch (error) {
        console.error('Error saving recordings:', error);
        throw error;
    }
}

// Prompt management functions
async function loadPrompts() {
    try {
        const data = await fs.readFile(PROMPTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading prompts:', error);
        return [];
    }
}

async function savePrompts(prompts) {
    try {
        await fs.writeFile(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
        console.log('📝 Prompts saved to file');
    } catch (error) {
        console.error('Error saving prompts:', error);
        throw error;
    }
}

// Prompt queue state management functions
async function loadPromptState() {
    try {
        const data = await fs.readFile(PROMPT_STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading prompt state:', error);
        return { currentPromptIndex: 0, lastUpdated: new Date().toISOString() };
    }
}

async function savePromptState(state) {
    try {
        await fs.writeFile(PROMPT_STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('Error saving prompt state:', error);
        throw error;
    }
}

async function getNextPromptInSequence() {
    try {
        const prompts = await loadPrompts();
        const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
        
        if (activePrompts.length === 0) {
            throw new Error('No active prompts available');
        }

        const state = await loadPromptState();
        let currentIndex = state.currentPromptIndex;
        
        // Ensure the index is within bounds
        if (currentIndex >= activePrompts.length) {
            currentIndex = 0;
        }

        const currentPrompt = activePrompts[currentIndex];
        const nextIndex = (currentIndex + 1) % activePrompts.length;
        const nextPrompt = activePrompts[nextIndex];

        // Advance to the next prompt for subsequent calls
        await savePromptState({
            currentPromptIndex: nextIndex,
            lastUpdated: new Date().toISOString()
        });

        return {
            current: currentPrompt,
            next: nextPrompt
        };
    } catch (error) {
        console.error('Error getting next prompt in sequence:', error);
        throw error;
    }
}

async function peekNextPromptInSequence() {
    try {
        const prompts = await loadPrompts();
        const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
        
        if (activePrompts.length === 0) {
            return null;
        }

        const state = await loadPromptState();
        let currentIndex = state.currentPromptIndex;
        
        // Ensure the index is within bounds
        if (currentIndex >= activePrompts.length) {
            currentIndex = 0;
        }

        return activePrompts[currentIndex];
    } catch (error) {
        console.error('Error peeking next prompt:', error);
        return null;
    }
}

// Admin authentication middleware
function requireAuth(req, res, next) {
    if (req.session.authenticated) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

// Routes

// Main app routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// API Routes

// Submit recording
app.post('/api/recordings', async (req, res) => {
    try {
        console.log('📝 Received recording submission request');
        const { audioData, prompt, timestamp } = req.body;
        
        // Detailed logging for debugging
        console.log('Request body keys:', Object.keys(req.body));
        console.log('Audio data type:', typeof audioData);
        console.log('Audio data length:', audioData ? audioData.length : 'undefined');
        console.log('Prompt:', prompt);
        console.log('Timestamp:', timestamp);
        
        if (!audioData || !prompt) {
            console.log('❌ Missing required fields - audioData:', !!audioData, 'prompt:', !!prompt);
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Generate unique ID and filename
        const id = uuidv4();
        const filename = `recordings/recording-${id}.webm`;
        
        console.log('📁 Uploading to Vercel Blob:', filename);
        console.log('📊 Audio data received:', audioData ? audioData.length : 0, 'characters');

        // Convert base64 to buffer
        const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
        console.log('🔄 Base64 data length after processing:', base64Data.length);
        
        const audioBuffer = Buffer.from(base64Data, 'base64');
        console.log('💾 Audio buffer size:', audioBuffer.length, 'bytes');
        
        // Upload to Vercel Blob storage
        let blobUrl;
        try {
            const blob = await uploadToBlob(filename, audioBuffer, 'audio/webm');
            blobUrl = blob.url;
            console.log('✅ Audio file uploaded to Blob:', blobUrl);
        } catch (blobError) {
            console.error('❌ Error uploading to Blob:', blobError);
            throw blobError;
        }

        // Create recording metadata
        const recording = {
            id,
            filename,
            blobUrl, // Store the Vercel Blob URL
            prompt,
            timestamp: timestamp || new Date().toISOString(),
            tags: [],
            approved: true,
            duration: Math.floor(Math.random() * 60) + 10 // Placeholder duration
        };

        console.log('📋 Recording metadata:', recording);

        try {
            // Load existing recordings and add new one
            const recordings = await loadRecordings();
            console.log('📚 Loaded existing recordings count:', recordings.length);
            
            recordings.push(recording);
            await saveRecordings(recordings);
            console.log('✅ Recording metadata saved to mock storage');
        } catch (metadataError) {
            console.error('❌ Error saving metadata:', metadataError);
            throw metadataError;
        }

        console.log('🎉 Recording saved successfully with ID:', id);
        res.json({ success: true, id: recording.id });
        
    } catch (error) {
        console.error('💥 Error in /api/recordings endpoint:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ 
            error: 'Failed to save recording', 
            details: error.message,
            type: error.constructor.name 
        });
    }
});

// Get next prompt for recording (sequential)
app.get('/api/prompts/next', async (req, res) => {
    try {
        const promptData = await getNextPromptInSequence();
        
        res.json({
            id: promptData.current.id,
            text: promptData.current.text,
            next: promptData.next.text
        });
    } catch (error) {
        console.error('Error getting next prompt:', error);
        res.status(500).json({ error: 'Failed to get prompt' });
    }
});

// Peek at next prompt without advancing queue (admin only)
app.get('/api/admin/prompts/next-peek', requireAuth, async (req, res) => {
    try {
        const nextPrompt = await peekNextPromptInSequence();
        
        if (!nextPrompt) {
            return res.status(404).json({ error: 'No active prompts available' });
        }
        
        res.json({
            id: nextPrompt.id,
            text: nextPrompt.text
        });
    } catch (error) {
        console.error('Error peeking next prompt:', error);
        res.status(500).json({ error: 'Failed to peek next prompt' });
    }
});

// Queue a specific prompt to be next (admin only)
app.put('/api/admin/prompts/:id/queue-next', requireAuth, async (req, res) => {
    try {
        const prompts = await loadPrompts();
        const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
        
        if (activePrompts.length === 0) {
            return res.status(404).json({ error: 'No active prompts available' });
        }

        // Find the index of the requested prompt
        const promptIndex = activePrompts.findIndex(p => p.id === req.params.id);
        if (promptIndex === -1) {
            return res.status(404).json({ error: 'Prompt not found or not active' });
        }

        // Set this prompt as the next one in the queue
        await savePromptState({
            currentPromptIndex: promptIndex,
            lastUpdated: new Date().toISOString()
        });

        res.json({ 
            success: true, 
            message: `Prompt "${activePrompts[promptIndex].text}" is now next in queue`,
            prompt: activePrompts[promptIndex]
        });
    } catch (error) {
        console.error('Error queuing prompt:', error);
        res.status(500).json({ error: 'Failed to queue prompt' });
    }
});

// Get recordings count for bubble generation
app.get('/api/recordings/count', async (req, res) => {
    try {
        const recordings = await loadRecordings();
        const approvedRecordings = recordings.filter(r => r.approved);
        res.json({ count: approvedRecordings.length });
    } catch (error) {
        console.error('Error getting recordings count:', error);
        res.status(500).json({ error: 'Failed to get recordings count' });
    }
});

// Get random recording for listening
app.get('/api/recordings/random', async (req, res) => {
    try {
        const recordings = await loadRecordings();
        const approvedRecordings = recordings.filter(r => r.approved);
        
        if (approvedRecordings.length === 0) {
            return res.status(404).json({ error: 'No recordings available' });
        }

        const randomIndex = Math.floor(Math.random() * approvedRecordings.length);
        const recording = approvedRecordings[randomIndex];
        
        res.json({
            id: recording.id,
            prompt: recording.prompt,
            timestamp: recording.timestamp,
            tags: recording.tags,
            duration: recording.duration
        });
    } catch (error) {
        console.error('Error getting random recording:', error);
        res.status(500).json({ error: 'Failed to get recording' });
    }
});

// Stream audio file from Vercel Blob
app.get('/api/recordings/:id/audio', async (req, res) => {
    try {
        const recordings = await loadRecordings();
        const recording = recordings.find(r => r.id === req.params.id);
        
        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        if (!recording.blobUrl) {
            return res.status(404).json({ error: 'Audio file URL not found' });
        }

        // Redirect to the Vercel Blob URL for direct streaming
        // This is the most efficient way as Vercel Blob handles the streaming
        res.redirect(recording.blobUrl);
        
    } catch (error) {
        console.error('Error streaming audio from blob:', error);
        res.status(500).json({ error: 'Failed to stream audio' });
    }
});

// Admin Routes

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

// Get all recordings (admin only)
app.get('/api/admin/recordings', requireAuth, async (req, res) => {
    try {
        const recordings = await loadRecordings();
        res.json(recordings);
    } catch (error) {
        console.error('Error getting recordings:', error);
        res.status(500).json({ error: 'Failed to get recordings' });
    }
});

// Get all prompts with analytics (admin only)
app.get('/api/admin/prompts', requireAuth, async (req, res) => {
    try {
        const prompts = await loadPrompts();
        const recordings = await loadRecordings();
        
        // Create analytics for each prompt
        const promptsWithAnalytics = prompts.map(prompt => {
            const promptRecordings = recordings.filter(r => r.prompt === prompt.text);
            return {
                ...prompt,
                recordingCount: promptRecordings.length,
                approvedCount: promptRecordings.filter(r => r.approved).length,
                recordings: promptRecordings
            };
        });
        
        res.json(promptsWithAnalytics);
    } catch (error) {
        console.error('Error getting prompts:', error);
        res.status(500).json({ error: 'Failed to get prompts' });
    }
});

// Add new prompt (admin only)
app.post('/api/admin/prompts', requireAuth, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt text is required' });
        }
        
        const prompts = await loadPrompts();
        const maxOrder = Math.max(...prompts.map(p => p.order), 0);
        
        const newPrompt = {
            id: uuidv4(),
            text: text.trim(),
            active: true,
            order: maxOrder + 1,
            createdAt: new Date().toISOString()
        };
        
        prompts.push(newPrompt);
        await savePrompts(prompts);
        
        res.json({ success: true, prompt: newPrompt });
    } catch (error) {
        console.error('Error adding prompt:', error);
        res.status(500).json({ error: 'Failed to add prompt' });
    }
});

// Update prompt (admin only)
app.put('/api/admin/prompts/:id', requireAuth, async (req, res) => {
    try {
        const { text, active } = req.body;
        const prompts = await loadPrompts();
        const promptIndex = prompts.findIndex(p => p.id === req.params.id);
        
        if (promptIndex === -1) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        
        if (text !== undefined) prompts[promptIndex].text = text.trim();
        if (active !== undefined) prompts[promptIndex].active = active;
        
        await savePrompts(prompts);
        res.json({ success: true, prompt: prompts[promptIndex] });
    } catch (error) {
        console.error('Error updating prompt:', error);
        res.status(500).json({ error: 'Failed to update prompt' });
    }
});

// Delete prompt (admin only)
app.delete('/api/admin/prompts/:id', requireAuth, async (req, res) => {
    try {
        const prompts = await loadPrompts();
        const promptIndex = prompts.findIndex(p => p.id === req.params.id);
        
        if (promptIndex === -1) {
            return res.status(404).json({ error: 'Prompt not found' });
        }
        
        prompts.splice(promptIndex, 1);
        await savePrompts(prompts);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting prompt:', error);
        res.status(500).json({ error: 'Failed to delete prompt' });
    }
});

// Update recording (admin only)
app.put('/api/admin/recordings/:id', requireAuth, async (req, res) => {
    try {
        const { tags, approved } = req.body;
        const recordings = await loadRecordings();
        const recordingIndex = recordings.findIndex(r => r.id === req.params.id);
        
        if (recordingIndex === -1) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        // Update recording
        if (tags !== undefined) recordings[recordingIndex].tags = tags;
        if (approved !== undefined) recordings[recordingIndex].approved = approved;
        
        await saveRecordings(recordings);
        res.json({ success: true, recording: recordings[recordingIndex] });
    } catch (error) {
        console.error('Error updating recording:', error);
        res.status(500).json({ error: 'Failed to update recording' });
    }
});

// Delete recording (admin only)
app.delete('/api/admin/recordings/:id', requireAuth, async (req, res) => {
    try {
        const recordings = await loadRecordings();
        const recordingIndex = recordings.findIndex(r => r.id === req.params.id);
        
        if (recordingIndex === -1) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        const recording = recordings[recordingIndex];

        // Delete audio file from Vercel Blob
        if (recording.blobUrl) {
            try {
                await deleteFromBlob(recording.blobUrl);
                console.log('✅ Audio file deleted from Blob:', recording.blobUrl);
            } catch (error) {
                console.warn('Audio file not found for deletion in Blob:', error.message);
            }
        }

        // Remove from recordings array
        recordings.splice(recordingIndex, 1);
        await saveRecordings(recordings);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting recording:', error);
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});

// Admin interface
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Initialize and start server
async function startServer() {
    try {
        // Create data directory if it doesn't exist
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        
        // Initialize data file
        await initializeDataFile();
        
        if (IS_PRODUCTION) {
            // Production: Run on HTTP only (Vercel handles HTTPS)
            app.listen(PORT, () => {
                console.log(`🎵 Sounds Like Home server running on port ${PORT}`);
                console.log(`🔧 Admin interface available at /admin`);
                console.log(`📁 Recordings stored in: ${RECORDINGS_DIR}`);
            });
        } else {
            // Development: Use HTTPS with SSL certificates
            try {
                const sslOptions = {
                    key: await fs.readFile(path.join(__dirname, 'key.pem')),
                    cert: await fs.readFile(path.join(__dirname, 'cert.pem'))
                };

                // HTTP redirect middleware for development
                app.use((req, res, next) => {
                    if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
                        return next();
                    }
                    res.redirect(`https://${req.headers.host.replace(':' + PORT, ':' + HTTPS_PORT)}${req.url}`);
                });

                // Start HTTP server (redirect to HTTPS)
                app.listen(PORT, 'localhost', () => {
                    console.log(`🔄 HTTP server running on http://localhost:${PORT} (redirects to HTTPS)`);
                });

                // Start HTTPS server
                https.createServer(sslOptions, app).listen(HTTPS_PORT, 'localhost', () => {
                    console.log(`🎵 Sounds Like Home HTTPS server running on https://localhost:${HTTPS_PORT}`);
                    console.log(`🔧 Admin interface available at https://localhost:${HTTPS_PORT}/admin`);
                    console.log(`📁 Recordings stored in: ${RECORDINGS_DIR}`);
                });
            } catch (sslError) {
                console.log('SSL certificates not found, running HTTP only');
                app.listen(PORT, 'localhost', () => {
                    console.log(`🎵 Sounds Like Home server running on http://localhost:${PORT}`);
                    console.log(`🔧 Admin interface available at http://localhost:${PORT}/admin`);
                });
            }
        }
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();