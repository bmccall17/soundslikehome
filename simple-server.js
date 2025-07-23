// Simple HTTP server without external dependencies for testing
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const url = require('url');
const querystring = require('querystring');

const PORT = 3000;
// DISABLED FOR VERCEL TESTING
// const RECORDINGS_DIR = path.join(__dirname, 'recordings');
// const DATA_FILE = path.join(__dirname, 'data', 'recordings.json');

// Mock data for Vercel testing
let mockRecordings = [];

// Simple session storage (in memory)
const sessions = new Map();

// Initialize data file if it doesn't exist - DISABLED FOR VERCEL
async function initializeDataFile() {
    console.log('🚫 File operations disabled for Vercel testing - using mock data');
    return Promise.resolve();
}

// Data management functions - MOCK FOR VERCEL
async function loadRecordings() {
    console.log('📝 Using mock recordings for Vercel testing');
    return Promise.resolve(mockRecordings);
}

async function saveRecordings(recordings) {
    console.log('📝 Mock saving recordings for Vercel testing');
    mockRecordings = recordings;
    return Promise.resolve();
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

                    // Generate unique ID and filename - MOCK FOR VERCEL
                    const id = generateUUID();
                    const filename = `recording-${id}.webm`;
                    
                    console.log('🚫 File writing disabled for Vercel testing');
                    console.log('🎧 Mock: Would save audio file:', filename);
                    console.log('📊 Mock audio data received:', audioData ? audioData.length : 0, 'characters');

                    // Create recording metadata
                    const recording = {
                        id,
                        filename,
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

            // Stream audio file - MOCK FOR VERCEL
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

                    console.log('🚫 Audio streaming disabled for Vercel testing');
                    res.writeHead(503, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        error: 'Audio streaming disabled for Vercel testing',
                        message: 'File operations are not available in this environment'
                    }));
                    
                } catch (error) {
                    console.error('Error in mock audio endpoint:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to process audio request' }));
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
                    
                    // Mock delete audio file for Vercel
                    console.log('🚫 Mock: Would delete audio file:', recording.filename);

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
        // Mock directory creation for Vercel
        console.log('🚫 Directory creation disabled for Vercel testing');
        
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