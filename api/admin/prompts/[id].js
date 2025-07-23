const { loadPrompts, savePrompts } = require('../../../lib/data-storage');
const { requireAuth } = require('../../../lib/auth');

export default async function handler(req, res) {
    // Check authentication first
    return new Promise((resolve) => {
        requireAuth(req, res, async () => {
            try {
                const { id } = req.query;
                
                if (req.method === 'PUT') {
                    // PUT /api/admin/prompts/:id - Update prompt
                    const { text, active } = req.body;
                    const prompts = await loadPrompts();
                    const promptIndex = prompts.findIndex(p => p.id === id);
                    
                    if (promptIndex === -1) {
                        return res.status(404).json({ error: 'Prompt not found' });
                    }
                    
                    if (text !== undefined) prompts[promptIndex].text = text.trim();
                    if (active !== undefined) prompts[promptIndex].active = active;
                    
                    await savePrompts(prompts);
                    res.json({ success: true, prompt: prompts[promptIndex] });
                    
                } else if (req.method === 'DELETE') {
                    // DELETE /api/admin/prompts/:id - Delete prompt
                    const prompts = await loadPrompts();
                    const promptIndex = prompts.findIndex(p => p.id === id);
                    
                    if (promptIndex === -1) {
                        return res.status(404).json({ error: 'Prompt not found' });
                    }
                    
                    prompts.splice(promptIndex, 1);
                    await savePrompts(prompts);
                    
                    res.json({ success: true });
                    
                } else {
                    res.status(405).json({ error: 'Method not allowed' });
                }
            } catch (error) {
                console.error('Error in prompt management:', error);
                res.status(500).json({ error: 'Failed to process prompt request' });
            }
            resolve();
        });
    });
}