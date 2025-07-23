const { getNextPromptInSequence } = require('../../lib/prompt-sequence');

// GET /api/prompts/next - Get next prompt for recording (sequential)
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const promptData = await getNextPromptInSequence();
        
        res.json({
            id: promptData.current.id,
            text: promptData.current.text,
            next: promptData.next.text
        });
    } catch (error) {
        console.error('Error getting next prompt:', error);
        res.status(500).json({ error: 'Failed to get prompt' });
    }
}