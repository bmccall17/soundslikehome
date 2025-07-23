const { loadRecordings } = require('../../../lib/data-storage');

// GET /api/recordings/:id/audio - Stream audio file from Vercel Blob
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        const recordings = await loadRecordings();
        const recording = recordings.find(r => r.id === id);
        
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
}