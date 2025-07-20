const express = require('express');
const multer = require('multer');
const session = require('express-session');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('.'));

// Session configuration
app.use(session({
    secret: 'sounds-like-home-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// File storage paths
const RECORDINGS_DIR = path.join(__dirname, 'recordings');
const DATA_FILE = path.join(__dirname, 'data', 'recordings.json');

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
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
        const filename = `recording-${id}.webm`;
        const filepath = path.join(RECORDINGS_DIR, filename);
        
        console.log('📁 Saving to filepath:', filepath);
        console.log('📂 RECORDINGS_DIR:', RECORDINGS_DIR);

        try {
            // Check if recordings directory exists and create if needed
            await fs.mkdir(RECORDINGS_DIR, { recursive: true });
            console.log('✅ Recordings directory confirmed/created');
        } catch (dirError) {
            console.error('❌ Error with recordings directory:', dirError);
            throw dirError;
        }

        // Convert base64 to buffer and save file
        const base64Data = audioData.replace(/^data:audio\/[^;]+;base64,/, '');
        console.log('🔄 Base64 data length after processing:', base64Data.length);
        
        const audioBuffer = Buffer.from(base64Data, 'base64');
        console.log('💾 Audio buffer size:', audioBuffer.length, 'bytes');
        
        try {
            await fs.writeFile(filepath, audioBuffer);
            console.log('✅ Audio file saved successfully');
            
            // Verify file was written
            const stats = await fs.stat(filepath);
            console.log('📊 File stats - Size:', stats.size, 'bytes');
        } catch (fileError) {
            console.error('❌ Error writing audio file:', fileError);
            throw fileError;
        }

        // Create recording metadata
        const recording = {
            id,
            filename,
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
            console.log('✅ Recording metadata saved to JSON');
        } catch (metadataError) {
            console.error('❌ Error saving metadata:', metadataError);
            // Try to clean up the audio file if metadata save fails
            try {
                await fs.unlink(filepath);
                console.log('🧹 Cleaned up audio file after metadata error');
            } catch (cleanupError) {
                console.error('⚠️ Could not clean up audio file:', cleanupError);
            }
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

// Stream audio file
app.get('/api/recordings/:id/audio', async (req, res) => {
    try {
        const recordings = await loadRecordings();
        const recording = recordings.find(r => r.id === req.params.id);
        
        if (!recording) {
            return res.status(404).json({ error: 'Recording not found' });
        }

        const filepath = path.join(RECORDINGS_DIR, recording.filename);
        
        // Check if file exists
        try {
            await fs.access(filepath);
        } catch {
            return res.status(404).json({ error: 'Audio file not found' });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'audio/webm');
        res.setHeader('Accept-Ranges', 'bytes');
        
        // Stream the file
        const readStream = require('fs').createReadStream(filepath);
        readStream.pipe(res);
        
    } catch (error) {
        console.error('Error streaming audio:', error);
        res.status(500).json({ error: 'Failed to stream audio' });
    }
});

// Admin Routes

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (password === 'welcomeadmin') {
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
        const filepath = path.join(RECORDINGS_DIR, recording.filename);

        // Delete audio file
        try {
            await fs.unlink(filepath);
        } catch (error) {
            console.warn('Audio file not found for deletion:', error.message);
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
        // Create directories if they don't exist
        await fs.mkdir(RECORDINGS_DIR, { recursive: true });
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        
        // Initialize data file
        await initializeDataFile();
        
        app.listen(PORT, () => {
            console.log(`🎵 Sounds Like Home server running on http://localhost:${PORT}`);
            console.log(`🔧 Admin interface available at http://localhost:${PORT}/admin`);
            console.log(`📁 Recordings stored in: ${RECORDINGS_DIR}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();