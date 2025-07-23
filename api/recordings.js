const { v4: uuidv4 } = require('uuid');
const { uploadToBlob } = require('../lib/blob-storage');
const { loadRecordings, saveRecordings, initializeDataFile } = require('../lib/data-storage');

// POST /api/recordings - Submit recording
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
        const base64Data = audioData.replace(/^data:audio\\/[^;]+;base64,/, '');
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
            // Initialize data file if needed
            await initializeDataFile();
            
            // Load existing recordings and add new one
            const recordings = await loadRecordings();
            console.log('📚 Loaded existing recordings count:', recordings.length);
            
            recordings.push(recording);
            await saveRecordings(recordings);
            console.log('✅ Recording metadata saved to JSON');
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
}