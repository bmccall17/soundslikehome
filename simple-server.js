// Simple HTTP server without external dependencies for testing
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const querystring = require('querystring');
const { put, del, list } = require('@vercel/blob');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'recordings.json');

// Vercel Blob storage configuration
const BLOB_STORE_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

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

// Simple session storage (in memory)
const sessions = new Map();

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

// Generate simple UUID
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate thematic tags based on prompt content
function generateThematicTags(prompt) {
    const tags = [];
    const promptLower = prompt.toLowerCase();
    
    // Theme categories with keywords
    const themes = {
        'childhood': ['childhood', 'child', 'young', 'growing up', 'bedroom', 'mother', 'father', 'parents'],
        'memory': ['remember', 'memory', 'recall', 'past', 'nostalgic', 'used to', 'miss'],
        'family': ['family', 'mother', 'father', 'parent', 'sibling', 'brother', 'sister', 'relative'],
        'comfort': ['comfort', 'safe', 'warm', 'cozy', 'peace', 'calm', 'relax', 'gentle'],
        'home': ['home', 'house', 'room', 'kitchen', 'bedroom', 'living'],
        'emotional': ['love', 'happy', 'sad', 'joy', 'fear', 'anxiety', 'excited', 'feel'],
        'sensory': ['sound', 'hear', 'listen', 'voice', 'music', 'noise', 'quiet', 'loud'],
        'time': ['morning', 'evening', 'night', 'afternoon', 'weekend', 'daily', 'routine'],
        'seasonal': ['spring', 'summer', 'fall', 'winter', 'rain', 'snow', 'weather', 'seasons'],
        'social': ['together', 'alone', 'friends', 'conversation', 'talking', 'gathering'],
        'cooking': ['cooking', 'kitchen', 'food', 'eating', 'meal', 'dinner', 'breakfast'],
        'nature': ['outside', 'garden', 'birds', 'wind', 'trees', 'natural', 'outdoor'],
        'technology': ['tv', 'television', 'radio', 'music', 'phone', 'computer'],
        'welcome': ['welcome', 'arrival', 'greeting', 'door', 'enter', 'coming'],
        'routine': ['daily', 'every', 'always', 'routine', 'habit', 'regular', 'usual']
    };
    
    // Check for theme matches
    Object.entries(themes).forEach(([theme, keywords]) => {
        if (keywords.some(keyword => promptLower.includes(keyword))) {
            tags.push(theme);
        }
    });
    
    // Add specific emotional tags
    if (promptLower.includes('perfect') || promptLower.includes('ideal')) {
        tags.push('ideal');
    }
    
    if (promptLower.includes('describe') || promptLower.includes('tell') || promptLower.includes('share')) {
        tags.push('descriptive');
    }
    
    // Ensure we have at least one general tag
    if (tags.length === 0) {
        tags.push('general');
    }
    
    // Remove duplicates and limit to 5 tags
    return [...new Set(tags)].slice(0, 5);
}

// Get content type based on file extension
function getContentType(filepath) {
    const ext = path.extname(filepath).toLowerCase();
    const contentTypes = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.webm': 'audio/webm',
        '.wav': 'audio/wav',
        '.mp3': 'audio/mpeg'
    };
    return contentTypes[ext] || 'text/plain';
}

// Parse JSON from request body
async function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(error);
            }
        });
    });
}

// Serve static files
async function serveStaticFile(filepath, res) {
    try {
        const content = await fs.readFile(filepath);
        const contentType = getContentType(filepath);
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    } catch (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
    }
}

// Main request handler
async function requestHandler(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`${method} ${pathname}`);

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        // API Routes
        if (pathname.startsWith('/api/')) {
            
            // Submit recording
            if (pathname === '/api/recordings' && method === 'POST') {
                console.log('📝 Received recording submission request');
                
                try {
                    const body = await parseJsonBody(req);
                    const { audioData, prompt, timestamp } = body;
                    
                    console.log('Request body keys:', Object.keys(body));
                    console.log('Audio data type:', typeof audioData);
                    console.log('Audio data length:', audioData ? audioData.length : 'undefined');
                    console.log('Prompt:', prompt);
                    
                    if (!audioData || !prompt) {
                        console.log('❌ Missing required fields - audioData:', !!audioData, 'prompt:', !!prompt);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Missing required fields' }));
                        return;
                    }

                    // Generate unique ID and filename
                    const id = generateUUID();
                    const filename = `recordings/recording-${id}.webm`;
                    
                    console.log('📁 Uploading to Vercel Blob:', filename);
                    console.log('📊 Audio data received:', audioData ? audioData.length : 0, 'characters');

                    // Convert base64 to buffer and save to Vercel Blob
                    console.log('🔍 Original audioData starts with:', audioData.substring(0, 50));
                    
                    // Better base64 extraction - handle different data URI formats
                    let base64Data;
                    if (audioData.startsWith('data:')) {
                        const base64Index = audioData.indexOf('base64,');
                        if (base64Index !== -1) {
                            base64Data = audioData.substring(base64Index + 7); // Skip 'base64,'
                        } else {
                            throw new Error('Not a base64 data URI');
                        }
                    } else {
                        base64Data = audioData;
                    }
                    
                    console.log('🔄 Base64 data length after processing:', base64Data.length);
                    console.log('🔍 First 50 chars of base64:', base64Data.substring(0, 50));
                    
                    // Validate base64 before conversion
                    if (!base64Data.match(/^[A-Za-z0-9+/]*={0,2}$/)) {
                        throw new Error('Invalid base64 format');
                    }
                    
                    let audioBuffer;
                    try {
                        audioBuffer = Buffer.from(base64Data, 'base64');
                        console.log('💾 Audio buffer size:', audioBuffer.length, 'bytes');
                    } catch (error) {
                        console.error('❌ Base64 decoding failed:', error);
                        throw new Error('Failed to decode base64 audio data');
                    }
                    
                    // Check if buffer looks like valid WebM data
                    if (audioBuffer.length > 4) {
                        const header = audioBuffer.toString('hex', 0, Math.min(16, audioBuffer.length));
                        console.log('🔍 Audio buffer hex header:', header);
                        
                        // WebM files should start with specific headers
                        if (audioBuffer[0] === 0x1A && audioBuffer[1] === 0x45 && audioBuffer[2] === 0xDF && audioBuffer[3] === 0xA3) {
                            console.log('✅ Valid WebM header detected');
                        } else {
                            console.log('⚠️ Warning: Does not look like WebM format');
                        }
                    } else {
                        console.log('⚠️ Warning: Audio buffer is very small:', audioBuffer.length, 'bytes');
                    }
                    
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
                        duration: Math.floor(Math.random() * 60) + 10
                    };

                    console.log('📋 Recording metadata:', recording);

                    // Load existing recordings and add new one
                    const recordings = await loadRecordings();
                    console.log('📚 Loaded existing recordings count:', recordings.length);
                    
                    recordings.push(recording);
                    await saveRecordings(recordings);
                    console.log('✅ Recording metadata saved to JSON');

                    console.log('🎉 Recording saved successfully with ID:', id);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, id: recording.id }));
                    
                } catch (error) {
                    console.error('💥 Error in /api/recordings endpoint:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Failed to save recording', 
                        details: error.message 
                    }));
                }
                return;
            }

            // Get random recording
            if (pathname === '/api/recordings/random' && method === 'GET') {
                try {
                    const recordings = await loadRecordings();
                    const approvedRecordings = recordings.filter(r => r.approved);
                    
                    if (approvedRecordings.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'No recordings available' }));
                        return;
                    }

                    const randomIndex = Math.floor(Math.random() * approvedRecordings.length);
                    const recording = approvedRecordings[randomIndex];
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        id: recording.id,
                        prompt: recording.prompt,
                        timestamp: recording.timestamp,
                        tags: recording.tags,
                        duration: recording.duration
                    }));
                } catch (error) {
                    console.error('Error getting random recording:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to get recording' }));
                }
                return;
            }

            // Stream audio file from Vercel Blob
            const audioMatch = pathname.match(/^\/api\/recordings\/([^\/]+)\/audio$/);
            if (audioMatch && method === 'GET') {
                try {
                    const recordingId = audioMatch[1];
                    const recordings = await loadRecordings();
                    const recording = recordings.find(r => r.id === recordingId);
                    
                    if (!recording) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Recording not found' }));
                        return;
                    }

                    if (!recording.blobUrl) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Audio file URL not found' }));
                        return;
                    }

                    // Redirect to the Vercel Blob URL for direct streaming
                    res.writeHead(302, { 'Location': recording.blobUrl });
                    res.end();
                    
                } catch (error) {
                    console.error('Error streaming audio from blob:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to stream audio' }));
                }
                return;
            }

            // Admin login
            if (pathname === '/api/admin/login' && method === 'POST') {
                try {
                    const body = await parseJsonBody(req);
                    const { password } = body;
                    
                    if (password === 'welcomeadmin') {
                        // Simple session storage (in memory)
                        const sessionId = generateUUID();
                        sessions.set(sessionId, { authenticated: true });
                        
                        res.writeHead(200, { 
                            'Content-Type': 'application/json',
                            'Set-Cookie': `sessionId=${sessionId}; Path=/; HttpOnly`
                        });
                        res.end(JSON.stringify({ success: true }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid password' }));
                    }
                } catch (error) {
                    console.error('Admin login error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Login failed' }));
                }
                return;
            }

            // Admin logout
            if (pathname === '/api/admin/logout' && method === 'POST') {
                // Clear session (simple implementation)
                res.writeHead(200, { 
                    'Content-Type': 'application/json',
                    'Set-Cookie': 'sessionId=; Path=/; HttpOnly; Expires=Thu, 01 Jan 1970 00:00:00 GMT'
                });
                res.end(JSON.stringify({ success: true }));
                return;
            }

            // Get all recordings (admin only)
            if (pathname === '/api/admin/recordings' && method === 'GET') {
                try {
                    const recordings = await loadRecordings();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(recordings));
                } catch (error) {
                    console.error('Error getting admin recordings:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to get recordings' }));
                }
                return;
            }

            // Get prompt analytics (admin only)
            if (pathname === '/api/admin/prompts' && method === 'GET') {
                try {
                    const recordings = await loadRecordings();
                    const promptAnalytics = {};
                    
                    recordings.forEach(recording => {
                        const prompt = recording.prompt;
                        if (!promptAnalytics[prompt]) {
                            promptAnalytics[prompt] = {
                                prompt: prompt,
                                count: 0,
                                approvedCount: 0,
                                recordings: []
                            };
                        }
                        promptAnalytics[prompt].count++;
                        if (recording.approved) {
                            promptAnalytics[prompt].approvedCount++;
                        }
                        promptAnalytics[prompt].recordings.push({
                            id: recording.id,
                            timestamp: recording.timestamp,
                            approved: recording.approved,
                            tags: recording.tags,
                            duration: recording.duration
                        });
                    });
                    
                    // Convert to array and sort by count
                    const analyticsArray = Object.values(promptAnalytics)
                        .sort((a, b) => b.count - a.count);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(analyticsArray));
                } catch (error) {
                    console.error('Error getting prompt analytics:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to get prompt analytics' }));
                }
                return;
            }

            // Get recordings by prompt (admin only)
            if (pathname === '/api/admin/recordings/by-prompt' && method === 'POST') {
                try {
                    const body = await parseJsonBody(req);
                    const { prompt } = body;
                    
                    if (!prompt) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Prompt required' }));
                        return;
                    }
                    
                    const recordings = await loadRecordings();
                    const filteredRecordings = recordings.filter(r => r.prompt === prompt);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(filteredRecordings));
                } catch (error) {
                    console.error('Error getting recordings by prompt:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to get recordings by prompt' }));
                }
                return;
            }

            // Auto-generate tags for recording (admin only)
            if (pathname === '/api/admin/auto-tag' && method === 'POST') {
                try {
                    const body = await parseJsonBody(req);
                    const { recordingId } = body;
                    
                    const recordings = await loadRecordings();
                    const recording = recordings.find(r => r.id === recordingId);
                    
                    if (!recording) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Recording not found' }));
                        return;
                    }
                    
                    // Generate thematic tags based on prompt analysis
                    const suggestedTags = generateThematicTags(recording.prompt);
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        recordingId: recordingId,
                        suggestedTags: suggestedTags,
                        prompt: recording.prompt
                    }));
                } catch (error) {
                    console.error('Error generating tags:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to generate tags' }));
                }
                return;
            }

            // Update recording (admin only)
            const updateMatch = pathname.match(/^\/api\/admin\/recordings\/([^\/]+)$/);
            if (updateMatch && method === 'PUT') {
                try {
                    const recordingId = updateMatch[1];
                    const body = await parseJsonBody(req);
                    const { tags, approved } = body;
                    
                    const recordings = await loadRecordings();
                    const recordingIndex = recordings.findIndex(r => r.id === recordingId);
                    
                    if (recordingIndex === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Recording not found' }));
                        return;
                    }

                    // Update recording
                    if (tags !== undefined) recordings[recordingIndex].tags = tags;
                    if (approved !== undefined) recordings[recordingIndex].approved = approved;
                    
                    await saveRecordings(recordings);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, recording: recordings[recordingIndex] }));
                } catch (error) {
                    console.error('Error updating recording:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to update recording' }));
                }
                return;
            }

            // Delete recording (admin only)
            const deleteMatch = pathname.match(/^\/api\/admin\/recordings\/([^\/]+)$/);
            if (deleteMatch && method === 'DELETE') {
                try {
                    const recordingId = deleteMatch[1];
                    const recordings = await loadRecordings();
                    const recordingIndex = recordings.findIndex(r => r.id === recordingId);
                    
                    if (recordingIndex === -1) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Recording not found' }));
                        return;
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

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                } catch (error) {
                    console.error('Error deleting recording:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to delete recording' }));
                }
                return;
            }

            // Unknown API endpoint
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'API endpoint not found' }));
            return;
        }

        // Static file serving
        let filepath;
        if (pathname === '/') {
            filepath = path.join(__dirname, 'index.html');
        } else if (pathname === '/admin') {
            filepath = path.join(__dirname, 'admin.html');
        } else {
            filepath = path.join(__dirname, pathname);
        }

        await serveStaticFile(filepath, res);

    } catch (error) {
        console.error('Request handler error:', error);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
    }
}

// Start server
async function startServer() {
    try {
        // Create data directory if it doesn't exist
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        
        // Initialize data file
        await initializeDataFile();
        
        const server = http.createServer(requestHandler);
        
        server.listen(PORT, () => {
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