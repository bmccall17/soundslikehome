// Sounds Like Home - Main Application

class SoundsLikeHome {
    constructor() {
        this.recordings = [];
        this.currentRecording = null;
        this.mediaRecorder = null;
        this.recordingBlob = null;
        this.currentPrompt = null;
        this.recordingTimer = null;
        
        this.init();
    }
    
    init() {
        this.loadPrompt();
        this.bindEvents();
        this.loadBubbles();
    }
    
    // Prompt System
    async loadPrompt() {
        try {
            const response = await fetch('/api/prompts/next');
            if (response.ok) {
                const promptData = await response.json();
                this.currentPrompt = promptData.text;
                document.getElementById('current-prompt').textContent = this.currentPrompt;
            } else {
                // Fallback to a default prompt if API fails
                this.currentPrompt = "What does home sound like to you?";
                document.getElementById('current-prompt').textContent = this.currentPrompt;
            }
        } catch (error) {
            console.error('Error loading prompt:', error);
            // Fallback to a default prompt if API fails
            this.currentPrompt = "What does home sound like to you?";
            document.getElementById('current-prompt').textContent = this.currentPrompt;
        }
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
            
            // Start 90-second countdown timer and progress animation
            this.startRecordingProgress();
            this.recordingTimer = setTimeout(() => {
                if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
                    this.stopRecording();
                    this.showFeedback('Recording automatically stopped after 90 seconds', 'info');
                }
            }, 90000); // 90 seconds
            
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
        
        // Clear the timer if it exists
        if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = null;
        }
        
        // Stop recording progress animation
        this.stopRecordingProgress();
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
            
            // Setup progress tracking
            this.setupAudioProgress(audio);
            
            await audio.play();
            
            // Hide elements after playback
            audio.onended = () => {
                setTimeout(() => {
                    audioPlayer.classList.add('hidden');
                    listeningPrompt.classList.add('hidden');
                    this.resetAudioProgress();
                }, 2000);
            };
            
        } catch (error) {
            console.error('Error playing audio:', error);
            this.showFeedback('Unable to play recording', 'error');
            // Hide prompt on error
            document.getElementById('listening-prompt').classList.add('hidden');
        }
    }
    
    setupAudioProgress(audio) {
        const progressFill = document.getElementById('audio-progress-fill');
        const currentTimeDisplay = document.getElementById('current-time');
        const totalTimeDisplay = document.getElementById('total-time');
        const playPauseBtn = document.getElementById('audio-play-pause-btn');
        const playIcon = playPauseBtn.querySelector('.play-icon');
        const pauseIcon = playPauseBtn.querySelector('.pause-icon');
        
        // Setup play/pause button
        playPauseBtn.onclick = () => {
            if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }
        };
        
        // Update play/pause button state
        audio.onplay = () => {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        };
        
        audio.onpause = () => {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        };
        
        // Update total duration when metadata loads
        audio.onloadedmetadata = () => {
            totalTimeDisplay.textContent = this.formatTime(audio.duration);
        };
        
        // Update progress during playback
        audio.ontimeupdate = () => {
            if (audio.duration) {
                const progress = (audio.currentTime / audio.duration) * 100;
                progressFill.style.width = `${progress}%`;
                currentTimeDisplay.textContent = this.formatTime(audio.currentTime);
            }
        };
        
        // Reset button state when audio ends
        audio.onended = () => {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        };
    }
    
    resetAudioProgress() {
        const progressFill = document.getElementById('audio-progress-fill');
        const currentTimeDisplay = document.getElementById('current-time');
        const totalTimeDisplay = document.getElementById('total-time');
        
        progressFill.style.width = '0%';
        currentTimeDisplay.textContent = '0:00';
        totalTimeDisplay.textContent = '0:00';
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    startRecordingProgress() {
        const progressFill = document.getElementById('recording-progress-fill');
        if (!progressFill) return;
        
        // Reset progress
        progressFill.style.width = '0%';
        
        // Start progress animation
        this.recordingStartTime = Date.now();
        this.recordingProgressInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const progress = Math.min((elapsed / 90000) * 100, 100); // 90 seconds = 100%
            progressFill.style.width = `${progress}%`;
            
            if (progress >= 100) {
                this.stopRecordingProgress();
            }
        }, 100); // Update every 100ms
    }
    
    stopRecordingProgress() {
        if (this.recordingProgressInterval) {
            clearInterval(this.recordingProgressInterval);
            this.recordingProgressInterval = null;
        }
        
        // Reset progress
        const progressFill = document.getElementById('recording-progress-fill');
        if (progressFill) {
            progressFill.style.width = '0%';
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
    
    // Bubble System
    async loadBubbles() {
        try {
            const response = await fetch('/api/recordings/count');
            if (response.ok) {
                const data = await response.json();
                this.generateBubbles(data.count);
            } else {
                // Generate a few default bubbles if API fails
                this.generateBubbles(3);
            }
        } catch (error) {
            console.error('Error loading bubble count:', error);
            this.generateBubbles(3);
        }
    }
    
    generateBubbles(count) {
        const container = document.getElementById('bubbles-container');
        if (!container) return;
        
        container.innerHTML = ''; // Clear existing bubbles
        
        // Generate bubbles based on recording count (max 22 for visual appeal)
        const bubbleCount = Math.min(count, 22);
        const containerWidth = container.offsetWidth || 400;
        const containerHeight = container.offsetHeight || 200;
        
        for (let i = 0; i < bubbleCount; i++) {
            const bubble = this.createBubble(containerWidth, containerHeight);
            container.appendChild(bubble);
        }
    }
    
    createBubble(containerWidth, containerHeight) {
        const bubble = document.createElement('div');
        bubble.className = 'bubble';
        
        // Random size
        const sizes = ['bubble-small', 'bubble-medium', 'bubble-large'];
        const sizeClass = sizes[Math.floor(Math.random() * sizes.length)];
        bubble.classList.add(sizeClass);
        
        // Random position
        const margin = 30;
        const left = Math.random() * (containerWidth - margin * 2) + margin;
        const top = Math.random() * (containerHeight - margin * 2) + margin;
        
        bubble.style.left = `${left}px`;
        bubble.style.top = `${top}px`;
        
        // Random animation delay and duration
        const delay = Math.random() * 5;
        const duration = 8 + Math.random() * 4; // 8-12 seconds
        
        bubble.style.animationDelay = `${delay}s`;
        bubble.style.animationDuration = `${duration}s`;
        
        return bubble;
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