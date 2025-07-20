// Sounds Like Home - Main Application

class SoundsLikeHome {
    constructor() {
        this.prompts = [
            "Describe the sound of your childhood bedroom at night.",
            "What does Sunday morning sound like in your home?",
            "Share the soundtrack of someone you love cooking.",
            "Tell us about a sound that makes you feel safe.",
            "What does home sound like when it's raining?",
            "Describe the first sound you remember from your childhood home.",
            "What sound do you miss most from a place you used to live?",
            "Share a sound that instantly transports you somewhere special.",
            "What does your favorite room sound like when you're alone?",
            "Describe a sound that means 'family' to you.",
            "What does home sound like in the early morning?",
            "Share a sound that makes you smile every time you hear it.",
            "Describe the sound of welcome in your home.",
            "What does comfort sound like to you?",
            "Tell us about a sound that feels like a warm hug.",
            "What sound makes your house feel like home?",
            "Describe the sounds of a perfect evening at home.",
            "What does love sound like in your daily life?",
            "Share a sound that represents peace to you.",
            "What does home sound like through the seasons?"
        ];
        
        this.recordings = [];
        this.currentRecording = null;
        this.mediaRecorder = null;
        this.recordingBlob = null;
        this.currentPrompt = null;
        
        this.init();
    }
    
    init() {
        this.loadRandomPrompt();
        this.bindEvents();
    }
    
    // Prompt System
    loadRandomPrompt() {
        const randomIndex = Math.floor(Math.random() * this.prompts.length);
        this.currentPrompt = this.prompts[randomIndex];
        document.getElementById('current-prompt').textContent = this.currentPrompt;
    }
    
    // Event Binding
    bindEvents() {
        const recordBtn = document.getElementById('record-btn');
        const submitBtn = document.getElementById('submit-btn');
        const restartBtn = document.getElementById('restart-btn');
        const listenBtn = document.getElementById('listen-btn');
        
        recordBtn.addEventListener('click', () => this.handleRecordClick());
        submitBtn.addEventListener('click', () => this.handleSubmit());
        restartBtn.addEventListener('click', () => this.handleRestart());
        listenBtn.addEventListener('click', () => this.handleListen());
    }
    
    // Recording Functionality
    async handleRecordClick() {
        const recordBtn = document.getElementById('record-btn');
        
        if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            await this.startRecording();
        } else if (this.mediaRecorder.state === 'recording') {
            this.stopRecording();
        }
    }
    
    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    channelCount: 1,
                    sampleRate: 44100,
                    sampleSize: 16,
                    echoCancellation: true,
                    noiseSuppression: true
                }
            });
            
            // Try different mime types for better compatibility
            let mimeType = 'audio/webm;codecs=opus';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                    if (!MediaRecorder.isTypeSupported(mimeType)) {
                        mimeType = 'audio/ogg';
                    }
                }
            }
            
            this.mediaRecorder = new MediaRecorder(stream, { mimeType });
            
            const chunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                this.recordingBlob = new Blob(chunks, { type: mimeType });
                stream.getTracks().forEach(track => track.stop());
                this.showActionButtons();
            };
            
            this.mediaRecorder.start();
            this.updateRecordingUI(true);
            
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Unable to access microphone. Please check your permissions and try again.');
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
            this.updateRecordingUI(false);
        }
    }
    
    updateRecordingUI(isRecording) {
        const recordBtn = document.getElementById('record-btn');
        const recordText = recordBtn.querySelector('.record-text');
        const recordingIndicator = document.getElementById('recording-indicator');
        
        if (isRecording) {
            recordBtn.classList.add('recording');
            recordText.textContent = 'Stop';
            recordingIndicator.classList.remove('hidden');
        } else {
            recordBtn.classList.remove('recording');
            recordText.textContent = 'Record';
            recordingIndicator.classList.add('hidden');
        }
    }
    
    showActionButtons() {
        const actionButtons = document.getElementById('action-buttons');
        const recordBtn = document.getElementById('record-btn');
        
        actionButtons.classList.remove('hidden');
        recordBtn.style.opacity = '0.6';
        recordBtn.disabled = true;
    }
    
    hideActionButtons() {
        const actionButtons = document.getElementById('action-buttons');
        const recordBtn = document.getElementById('record-btn');
        
        actionButtons.classList.add('hidden');
        recordBtn.style.opacity = '1';
        recordBtn.disabled = false;
    }
    
    // Recording Management
    async handleSubmit() {
        if (this.recordingBlob) {
            try {
                // Convert blob to base64 for API submission
                const base64Audio = await this.blobToBase64(this.recordingBlob);
                
                const response = await fetch('/api/recordings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        audioData: base64Audio,
                        prompt: this.currentPrompt,
                        timestamp: new Date().toISOString()
                    })
                });

                if (response.ok) {
                    // Reset for next recording
                    this.hideActionButtons();
                    this.recordingBlob = null;
                    this.loadRandomPrompt();
                    
                    // Show success feedback
                    this.showFeedback('Your voice has been added to Home ✨', 'success');
                } else {
                    throw new Error('Failed to save recording');
                }
            } catch (error) {
                console.error('Error saving recording:', error);
                this.showFeedback('Error saving recording. Please try again.', 'error');
            }
        }
    }
    
    handleRestart() {
        this.recordingBlob = null;
        this.hideActionButtons();
        this.updateRecordingUI(false);
    }
    
    calculateDuration() {
        // Placeholder - in a real app you'd calculate actual duration
        return Math.floor(Math.random() * 60) + 10; // Random duration between 10-70 seconds
    }
    
    // Listen Functionality
    async handleListen() {
        try {
            // Get a random recording from the server
            const response = await fetch('/api/recordings/random');
            
            if (!response.ok) {
                if (response.status === 404) {
                    this.showFeedback('No recordings available yet. Record your first sound!', 'info');
                } else {
                    throw new Error('Failed to get recording');
                }
                return;
            }

            const recording = await response.json();
            await this.playRecording(recording);
            
        } catch (error) {
            console.error('Error getting random recording:', error);
            this.showFeedback('Unable to load recording. Please try again.', 'error');
        }
    }
    
    async playRecording(recording) {
        try {
            const audioPlayer = document.getElementById('audio-player');
            const audio = document.getElementById('playback-audio');
            const listeningPrompt = document.getElementById('listening-prompt');
            const listeningPromptText = document.getElementById('listening-prompt-text');
            
            // Show the prompt that was used for this recording
            listeningPromptText.textContent = recording.prompt;
            listeningPrompt.classList.remove('hidden');
            
            // Set audio source to the server endpoint
            audio.src = `/api/recordings/${recording.id}/audio`;
            audioPlayer.classList.remove('hidden');
            
            await audio.play();
            
            // Hide elements after playback
            audio.onended = () => {
                setTimeout(() => {
                    audioPlayer.classList.add('hidden');
                    listeningPrompt.classList.add('hidden');
                }, 2000);
            };
            
        } catch (error) {
            console.error('Error playing audio:', error);
            this.showFeedback('Unable to play recording', 'error');
            // Hide prompt on error
            document.getElementById('listening-prompt').classList.add('hidden');
        }
    }
    
    // Audio Utilities (for backward compatibility with any existing localStorage recordings)
    
    // Audio conversion utilities
    async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                resolve(reader.result);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
    
    
    // User Feedback
    showFeedback(message, type = 'info') {
        // Create a temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = `feedback feedback-${type}`;
        feedback.textContent = message;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 1rem 1.5rem;
            border-radius: 25px;
            border: 1px solid #e2e8f0;
            color: #4a5568;
            font-size: 0.9rem;
            z-index: 1000;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            animation: slideInDown 0.3s ease;
        `;
        
        if (type === 'success') {
            feedback.style.borderColor = '#48bb78';
            feedback.style.color = '#2f855a';
        } else if (type === 'error') {
            feedback.style.borderColor = '#e53e3e';
            feedback.style.color = '#c53030';
        }
        
        document.body.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideOutUp 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(feedback)) {
                    document.body.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }
}

// Add CSS animations for feedback
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInDown {
        from {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
        to {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutUp {
        from {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
        }
        to {
            transform: translateX(-50%) translateY(-100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SoundsLikeHome();
});