const { loadPrompts, loadPromptState, savePromptState } = require('./data-storage');

async function getNextPromptInSequence() {
    try {
        const prompts = await loadPrompts();
        const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
        
        if (activePrompts.length === 0) {
            throw new Error('No active prompts available');
        }

        const state = await loadPromptState();
        let currentIndex = state.currentPromptIndex;
        
        // Ensure the index is within bounds
        if (currentIndex >= activePrompts.length) {
            currentIndex = 0;
        }

        const currentPrompt = activePrompts[currentIndex];
        const nextIndex = (currentIndex + 1) % activePrompts.length;
        const nextPrompt = activePrompts[nextIndex];

        // Advance to the next prompt for subsequent calls
        await savePromptState({
            currentPromptIndex: nextIndex,
            lastUpdated: new Date().toISOString()
        });

        return {
            current: currentPrompt,
            next: nextPrompt
        };
    } catch (error) {
        console.error('Error getting next prompt in sequence:', error);
        throw error;
    }
}

async function peekNextPromptInSequence() {
    try {
        const prompts = await loadPrompts();
        const activePrompts = prompts.filter(p => p.active).sort((a, b) => a.order - b.order);
        
        if (activePrompts.length === 0) {
            return null;
        }

        const state = await loadPromptState();
        let currentIndex = state.currentPromptIndex;
        
        // Ensure the index is within bounds
        if (currentIndex >= activePrompts.length) {
            currentIndex = 0;
        }

        return activePrompts[currentIndex];
    } catch (error) {
        console.error('Error peeking next prompt:', error);
        return null;
    }
}

module.exports = {
    getNextPromptInSequence,
    peekNextPromptInSequence
};