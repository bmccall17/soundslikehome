const { loadRecordings, saveRecordings } = require('../../../lib/data-storage');
const { deleteFromBlob } = require('../../../lib/blob-storage');
const { requireAuth } = require('../../../lib/auth');

export default async function handler(req, res) {
    // Check authentication first
    return new Promise((resolve) => {
        requireAuth(req, res, async () => {
            try {
                const { id } = req.query;
                
                if (req.method === 'PUT') {
                    // PUT /api/admin/recordings/:id - Update recording
                    const { tags, approved } = req.body;
                    const recordings = await loadRecordings();
                    const recordingIndex = recordings.findIndex(r => r.id === id);
                    
                    if (recordingIndex === -1) {
                        return res.status(404).json({ error: 'Recording not found' });
                    }

                    // Update recording
                    if (tags !== undefined) recordings[recordingIndex].tags = tags;
                    if (approved !== undefined) recordings[recordingIndex].approved = approved;
                    
                    await saveRecordings(recordings);
                    res.json({ success: true, recording: recordings[recordingIndex] });
                    
                } else if (req.method === 'DELETE') {
                    // DELETE /api/admin/recordings/:id - Delete recording
                    const recordings = await loadRecordings();
                    const recordingIndex = recordings.findIndex(r => r.id === id);
                    
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
                    
                } else {
                    res.status(405).json({ error: 'Method not allowed' });
                }
            } catch (error) {
                console.error('Error in recording management:', error);
                res.status(500).json({ error: 'Failed to process recording request' });
            }
            resolve();
        });
    });
}