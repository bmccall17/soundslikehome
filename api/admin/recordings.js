const { loadRecordings } = require('../../lib/data-storage');
const { requireAuth } = require('../../lib/auth');

// GET /api/admin/recordings - Get all recordings (admin only)
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check authentication
    return new Promise((resolve) => {
        requireAuth(req, res, async () => {
            try {
                const recordings = await loadRecordings();
                res.json(recordings);
            } catch (error) {
                console.error('Error getting recordings:', error);
                res.status(500).json({ error: 'Failed to get recordings' });
            }
            resolve();
        });
    });
}