const { loadRecordings } = require('../../lib/data-storage');

// GET /api/recordings/count - Get recordings count for bubble generation
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const recordings = await loadRecordings();
        const approvedRecordings = recordings.filter(r => r.approved);
        res.json({ count: approvedRecordings.length });
    } catch (error) {
        console.error('Error getting recordings count:', error);
        res.status(500).json({ error: 'Failed to get recordings count' });
    }
}