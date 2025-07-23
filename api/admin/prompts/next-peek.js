const { peekNextPromptInSequence } = require('../../../lib/prompt-sequence');
const { requireAuth } = require('../../../lib/auth');

// GET /api/admin/prompts/next-peek - Peek at next prompt without advancing queue
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check authentication first
    return new Promise((resolve) => {
        requireAuth(req, res, async () => {
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
            resolve();
        });
    });
}