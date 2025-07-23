const fs = require('fs').promises;
const path = require('path');

// File paths
const DATA_FILE = path.join(process.cwd(), 'data', 'recordings.json');
const PROMPTS_FILE = path.join(process.cwd(), 'data', 'prompts.json');
const PROMPT_STATE_FILE = path.join(process.cwd(), 'data', 'prompt-state.json');

// Initialize data file if it doesn't exist
async function initializeDataFile() {
    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
        await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    }
}

// Recording management functions
async function loadRecordings() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading recordings:', error);
        return [];
    }
}

async function saveRecordings(recordings) {
    try {
        await fs.writeFile(DATA_FILE, JSON.stringify(recordings, null, 2));
    } catch (error) {
        console.error('Error saving recordings:', error);
        throw error;
    }
}

// Prompt management functions
async function loadPrompts() {
    try {
        const data = await fs.readFile(PROMPTS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading prompts:', error);
        return [];
    }
}

async function savePrompts(prompts) {
    try {
        await fs.writeFile(PROMPTS_FILE, JSON.stringify(prompts, null, 2));
        console.log('📝 Prompts saved to file');
    } catch (error) {
        console.error('Error saving prompts:', error);
        throw error;
    }
}

// Prompt queue state management functions
async function loadPromptState() {
    try {
        const data = await fs.readFile(PROMPT_STATE_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error loading prompt state:', error);
        return { currentPromptIndex: 0, lastUpdated: new Date().toISOString() };
    }
}

async function savePromptState(state) {
    try {
        await fs.writeFile(PROMPT_STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
        console.error('Error saving prompt state:', error);
        throw error;
    }
}

module.exports = {
    initializeDataFile,
    loadRecordings,
    saveRecordings,
    loadPrompts,
    savePrompts,
    loadPromptState,
    savePromptState
};