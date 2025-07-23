const { loadRecordings } = require('../../lib/data-storage');

// GET /api/recordings/random - Get random recording for listening
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
}