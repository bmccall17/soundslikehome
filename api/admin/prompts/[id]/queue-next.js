const { loadPrompts, savePromptState } = require('../../../../lib/data-storage');
const { requireAuth } = require('../../../../lib/auth');

// PUT /api/admin/prompts/:id/queue-next - Queue a specific prompt to be next
export default async function handler(req, res) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check authentication first
    return new Promise((resolve) => {
        requireAuth(req, res, async () => {
            try {
                const { id } = req.query;
                const prompts = await loadPrompts();
                const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
                
                if (activePrompts.length === 0) {
                    return res.status(404).json({ error: 'No active prompts available' });
                }

                // Find the index of the requested prompt
                const promptIndex = activePrompts.findIndex(p => p.id === id);
                if (promptIndex === -1) {
                    return res.status(404).json({ error: 'Prompt not found or not active' });
                }

                // Set this prompt as the next one in the queue
                await savePromptState({
                    currentPromptIndex: promptIndex,
                    lastUpdated: new Date().toISOString()
                });

                res.json({ 
                    success: true, 
                    message: `Prompt "${activePrompts[promptIndex].text}" is now next in queue`,
                    prompt: activePrompts[promptIndex]
                });
            } catch (error) {
                console.error('Error queuing prompt:', error);
                res.status(500).json({ error: 'Failed to queue prompt' });
            }
            resolve();
        });
    });
}