const { v4: uuidv4 } = require('uuid');
const { loadPrompts, savePrompts, loadRecordings } = require('../../lib/data-storage');
const { requireAuth } = require('../../lib/auth');

export default async function handler(req, res) {
    // Check authentication first
    return new Promise((resolve) => {
        requireAuth(req, res, async () => {
            try {
                if (req.method === 'GET') {
                    // GET /api/admin/prompts - Get all prompts with analytics
                    const prompts = await loadPrompts();
                    const recordings = await loadRecordings();
                    
                    // Create analytics for each prompt
                    const promptsWithAnalytics = prompts.map(prompt => {
                        const promptRecordings = recordings.filter(r => r.prompt === prompt.text);
                        return {
                            ...prompt,
                            recordingCount: promptRecordings.length,
                            approvedCount: promptRecordings.filter(r => r.approved).length,
                            recordings: promptRecordings
                        };
                    });
                    
                    res.json(promptsWithAnalytics);
                    
                } else if (req.method === 'POST') {
                    // POST /api/admin/prompts - Add new prompt
                    const { text } = req.body;
                    if (!text || text.trim().length === 0) {
                        return res.status(400).json({ error: 'Prompt text is required' });
                    }
                    
                    const prompts = await loadPrompts();
                    const maxOrder = Math.max(...prompts.map(p => p.order), 0);
                    
                    const newPrompt = {
                        id: uuidv4(),
                        text: text.trim(),
                        active: true,
                        order: maxOrder + 1,
                        createdAt: new Date().toISOString()
                    };
                    
                    prompts.push(newPrompt);
                    await savePrompts(prompts);
                    
                    res.json({ success: true, prompt: newPrompt });
                    
                } else {
                    res.status(405).json({ error: 'Method not allowed' });
                }
            } catch (error) {
                console.error('Error in prompts endpoint:', error);
                res.status(500).json({ error: 'Failed to process prompts request' });
            }
            resolve();
        });
    });
}