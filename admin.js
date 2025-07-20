// Enhanced Admin Interface JavaScript

class EnhancedAdminInterface {
    constructor() {
        this.recordings = [];
        this.prompts = [];
        this.currentTab = 'overview';
        this.themes = new Set();
        this.init();
    }

    init() {
        this.bindEvents();
        this.checkAuthStatus();
    }

    bindEvents() {
        // Login form
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Logout button
        document.getElementById('logout-btn').addEventListener('click', () => {
            this.handleLogout();
        });

        // Navigation tabs
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Bulk actions
        document.getElementById('bulk-auto-tag')?.addEventListener('click', () => {
            this.bulkAutoTag();
        });

        document.getElementById('export-data')?.addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('analyze-themes')?.addEventListener('click', () => {
            this.analyzeAllThemes();
        });

        // Modal close
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });

        // Close modal on background click
        document.getElementById('prompt-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'prompt-modal') {
                this.closeModal();
            }
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/admin/recordings');
            if (response.ok) {
                this.showDashboard();
                await this.loadAllData();
            } else {
                this.showLogin();
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            this.showLogin();
        }
    }

    async handleLogin() {
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password })
            });

            const result = await response.json();

            if (response.ok) {
                this.showDashboard();
                await this.loadAllData();
                this.showFeedback('Login successful!', 'success');
            } else {
                this.showFeedback(result.error || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showFeedback('Login failed. Please try again.', 'error');
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/admin/logout', { method: 'POST' });
            this.showLogin();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    showLogin() {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('admin-dashboard').classList.remove('active');
        document.getElementById('password').value = '';
    }

    showDashboard() {
        document.getElementById('login-section').style.display = 'none';
        document.getElementById('admin-dashboard').classList.add('active');
    }

    switchTab(tabName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadAllData() {
        await Promise.all([
            this.loadRecordings(),
            this.loadPromptAnalytics()
        ]);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'overview':
                this.renderOverview();
                break;
            case 'recordings':
                this.renderRecordings();
                break;
            case 'prompts':
                this.renderPromptAnalytics();
                break;
            case 'themes':
                this.renderThemeExplorer();
                break;
        }
    }

    async loadRecordings() {
        try {
            const response = await fetch('/api/admin/recordings');
            
            if (response.ok) {
                this.recordings = await response.json();
                this.updateStats();
                if (this.currentTab === 'recordings') {
                    this.renderRecordings();
                }
            } else {
                this.showFeedback('Failed to load recordings', 'error', 'recordings-feedback');
            }
        } catch (error) {
            console.error('Error loading recordings:', error);
            this.showFeedback('Failed to load recordings', 'error', 'recordings-feedback');
        }
    }

    async loadPromptAnalytics() {
        try {
            const response = await fetch('/api/admin/prompts');
            
            if (response.ok) {
                this.prompts = await response.json();
                this.extractThemes();
                if (this.currentTab === 'prompts') {
                    this.renderPromptAnalytics();
                }
            } else {
                this.showFeedback('Failed to load prompt analytics', 'error', 'prompts-feedback');
            }
        } catch (error) {
            console.error('Error loading prompt analytics:', error);
            this.showFeedback('Failed to load prompt analytics', 'error', 'prompts-feedback');
        }
    }

    extractThemes() {
        this.themes.clear();
        this.recordings.forEach(recording => {
            if (recording.tags && Array.isArray(recording.tags)) {
                recording.tags.forEach(tag => this.themes.add(tag));
            }
        });
    }

    updateStats() {
        const total = this.recordings.length;
        const approved = this.recordings.filter(r => r.approved).length;
        const pending = total - approved;
        const totalPrompts = this.prompts.length;

        document.getElementById('total-recordings').textContent = total;
        document.getElementById('approved-recordings').textContent = approved;
        document.getElementById('pending-recordings').textContent = pending;
        document.getElementById('total-prompts').textContent = totalPrompts;
    }

    renderOverview() {
        this.renderRecentActivity();
    }

    renderRecentActivity() {
        const activityFeed = document.getElementById('recent-activity');
        
        // Sort recordings by timestamp (newest first)
        const recentRecordings = [...this.recordings]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);

        if (recentRecordings.length === 0) {
            activityFeed.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">No activity yet. Recordings will appear here as they come in.</p>';
            return;
        }

        activityFeed.innerHTML = recentRecordings.map(recording => {
            const date = new Date(recording.timestamp);
            const timeAgo = this.getTimeAgo(date);
            
            return `
                <div class="activity-item">
                    <div class="activity-time">${timeAgo}</div>
                    <strong>New Recording:</strong> "${recording.prompt}"
                    <br>
                    <span class="status-badge ${recording.approved ? 'status-approved' : 'status-pending'}">
                        ${recording.approved ? 'Approved' : 'Pending'}
                    </span>
                </div>
            `;
        }).join('');
    }

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${diffDays} days ago`;
    }

    renderRecordings() {
        const tbody = document.getElementById('recordings-tbody');
        
        if (!tbody) return;

        if (this.recordings.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 2rem; color: #718096;">
                        No recordings found. Submit some recordings from the main app first.
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by timestamp (newest first)
        const sortedRecordings = [...this.recordings].sort((a, b) => 
            new Date(b.timestamp) - new Date(a.timestamp)
        );

        tbody.innerHTML = '';
        sortedRecordings.forEach(recording => {
            const row = this.createRecordingRow(recording);
            tbody.appendChild(row);
        });
    }

    createRecordingRow(recording) {
        const row = document.createElement('tr');
        
        const date = new Date(recording.timestamp).toLocaleDateString();
        const tags = Array.isArray(recording.tags) ? recording.tags.join(', ') : '';
        const statusClass = recording.approved ? 'status-approved' : 'status-pending';
        const statusText = recording.approved ? 'Approved' : 'Pending';

        row.innerHTML = `
            <td>${date}</td>
            <td class="prompt-cell" title="${recording.prompt}">${recording.prompt}</td>
            <td>
                <input type="text" class="tags-input" value="${tags}" 
                       onblur="adminInterface.updateTags('${recording.id}', this.value)">
                <button class="btn btn-small" onclick="adminInterface.autoTagSingle('${recording.id}')" 
                        style="margin-top: 0.5rem;">Auto-Tag</button>
            </td>
            <td>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-small btn-secondary" 
                            onclick="adminInterface.playRecording('${recording.id}')">
                        Play
                    </button>
                    <button class="btn btn-small ${recording.approved ? 'btn-secondary' : 'btn-primary'}" 
                            onclick="adminInterface.toggleApproval('${recording.id}', ${!recording.approved})">
                        ${recording.approved ? 'Unapprove' : 'Approve'}
                    </button>
                    <button class="btn btn-small btn-danger" 
                            onclick="adminInterface.deleteRecording('${recording.id}')">
                        Delete
                    </button>
                </div>
            </td>
        `;

        return row;
    }

    renderPromptAnalytics() {
        const promptsGrid = document.getElementById('prompts-grid');
        
        if (!promptsGrid) return;

        if (this.prompts.length === 0) {
            promptsGrid.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">No prompts have responses yet.</p>';
            return;
        }

        promptsGrid.innerHTML = this.prompts.map(promptData => {
            // Get themes for this prompt by analyzing its recordings
            const themes = this.getPromptThemes(promptData.recordings);
            
            return `
                <div class="prompt-card" onclick="adminInterface.showPromptDetails('${promptData.prompt.replace(/'/g, '\\\'').replace(/"/g, '\\"')}')">
                    <div class="prompt-title">${promptData.prompt}</div>
                    <div class="prompt-stats">
                        <div class="prompt-count">${promptData.count}</div>
                        <div class="prompt-approved">${promptData.approvedCount} approved</div>
                    </div>
                    <div class="prompt-tags">
                        ${themes.map(theme => `<span class="tag-pill">${theme}</span>`).join('')}
                    </div>
                </div>
            `;
        }).join('');
    }

    getPromptThemes(recordings) {
        const themeCount = {};
        recordings.forEach(recording => {
            if (recording.tags && Array.isArray(recording.tags)) {
                recording.tags.forEach(tag => {
                    themeCount[tag] = (themeCount[tag] || 0) + 1;
                });
            }
        });

        // Return top 3 themes
        return Object.entries(themeCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([theme]) => theme);
    }

    async showPromptDetails(prompt) {
        try {
            const response = await fetch('/api/admin/recordings/by-prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt })
            });

            if (response.ok) {
                const recordings = await response.json();
                this.openPromptModal(prompt, recordings);
            } else {
                this.showFeedback('Failed to load prompt details', 'error');
            }
        } catch (error) {
            console.error('Error loading prompt details:', error);
            this.showFeedback('Failed to load prompt details', 'error');
        }
    }

    openPromptModal(prompt, recordings) {
        const modal = document.getElementById('prompt-modal');
        const title = document.getElementById('modal-prompt-title');
        const totalCount = document.getElementById('modal-total-count');
        const approvedCount = document.getElementById('modal-approved-count');
        const modalRecordings = document.getElementById('modal-recordings');

        title.textContent = prompt;
        totalCount.textContent = recordings.length;
        approvedCount.textContent = recordings.filter(r => r.approved).length;

        modalRecordings.innerHTML = recordings.map(recording => {
            const date = new Date(recording.timestamp).toLocaleDateString();
            const tags = Array.isArray(recording.tags) ? recording.tags : [];
            
            return `
                <div class="modal-recording">
                    <div class="modal-recording-info">
                        <div class="modal-recording-date">${date} • ${recording.duration}s</div>
                        <div class="modal-recording-tags">
                            ${tags.map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <div class="action-buttons">
                        <button class="btn btn-small btn-secondary" 
                                onclick="adminInterface.playRecording('${recording.id}')">
                            Play
                        </button>
                        <span class="status-badge ${recording.approved ? 'status-approved' : 'status-pending'}">
                            ${recording.approved ? 'Approved' : 'Pending'}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        modal.classList.remove('hidden');
    }

    closeModal() {
        document.getElementById('prompt-modal').classList.add('hidden');
    }

    renderThemeExplorer() {
        this.renderThemeSelect();
        this.renderThemeGrid();
    }

    renderThemeSelect() {
        const themeSelect = document.getElementById('theme-filter');
        if (!themeSelect) return;

        const sortedThemes = Array.from(this.themes).sort();
        themeSelect.innerHTML = '<option value="">All Themes</option>' +
            sortedThemes.map(theme => `<option value="${theme}">${theme}</option>`).join('');
    }

    renderThemeGrid() {
        const themesGrid = document.getElementById('themes-grid');
        if (!themesGrid) return;

        if (this.themes.size === 0) {
            themesGrid.innerHTML = '<p style="text-align: center; color: #718096; padding: 2rem;">No themes found. Use auto-tagging to generate themes.</p>';
            return;
        }

        const themeStats = this.calculateThemeStats();
        
        themesGrid.innerHTML = themeStats.map(([theme, count]) => `
            <div class="theme-card">
                <div class="theme-name">${theme}</div>
                <div class="theme-count">${count}</div>
                <div style="font-size: 0.8rem; color: #718096; margin-top: 0.5rem;">
                    recordings
                </div>
            </div>
        `).join('');
    }

    calculateThemeStats() {
        const themeCount = {};
        this.recordings.forEach(recording => {
            if (recording.tags && Array.isArray(recording.tags)) {
                recording.tags.forEach(tag => {
                    themeCount[tag] = (themeCount[tag] || 0) + 1;
                });
            }
        });

        return Object.entries(themeCount).sort((a, b) => b[1] - a[1]);
    }

    // Individual recording actions
    async updateTags(recordingId, tagsString) {
        try {
            const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag);
            
            const response = await fetch(`/api/admin/recordings/${recordingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ tags })
            });

            if (response.ok) {
                // Update local data
                const recording = this.recordings.find(r => r.id === recordingId);
                if (recording) {
                    recording.tags = tags;
                }
                this.extractThemes();
                this.showFeedback('Tags updated successfully', 'success', 'recordings-feedback');
            } else {
                this.showFeedback('Failed to update tags', 'error', 'recordings-feedback');
                await this.loadRecordings();
            }
        } catch (error) {
            console.error('Error updating tags:', error);
            this.showFeedback('Failed to update tags', 'error', 'recordings-feedback');
        }
    }

    async autoTagSingle(recordingId) {
        try {
            const response = await fetch('/api/admin/auto-tag', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ recordingId })
            });

            if (response.ok) {
                const result = await response.json();
                
                // Update the tags input field
                const tagInput = document.querySelector(`input[onblur*="${recordingId}"]`);
                if (tagInput) {
                    tagInput.value = result.suggestedTags.join(', ');
                    // Trigger the update
                    await this.updateTags(recordingId, tagInput.value);
                }
                
                this.showFeedback('Auto-tags generated successfully', 'success', 'recordings-feedback');
            } else {
                this.showFeedback('Failed to generate auto-tags', 'error', 'recordings-feedback');
            }
        } catch (error) {
            console.error('Error generating auto-tags:', error);
            this.showFeedback('Failed to generate auto-tags', 'error', 'recordings-feedback');
        }
    }

    async toggleApproval(recordingId, approved) {
        try {
            const response = await fetch(`/api/admin/recordings/${recordingId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ approved })
            });

            if (response.ok) {
                await this.loadRecordings();
                this.showFeedback(
                    `Recording ${approved ? 'approved' : 'unapproved'} successfully`, 
                    'success', 
                    'recordings-feedback'
                );
            } else {
                this.showFeedback('Failed to update approval status', 'error', 'recordings-feedback');
            }
        } catch (error) {
            console.error('Error updating approval:', error);
            this.showFeedback('Failed to update approval status', 'error', 'recordings-feedback');
        }
    }

    async deleteRecording(recordingId) {
        if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/recordings/${recordingId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadRecordings();
                this.showFeedback('Recording deleted successfully', 'success', 'recordings-feedback');
            } else {
                this.showFeedback('Failed to delete recording', 'error', 'recordings-feedback');
            }
        } catch (error) {
            console.error('Error deleting recording:', error);
            this.showFeedback('Failed to delete recording', 'error', 'recordings-feedback');
        }
    }

    async playRecording(recordingId) {
        try {
            // Create or get audio element
            let audioElement = document.getElementById('admin-audio-player');
            if (!audioElement) {
                audioElement = document.createElement('audio');
                audioElement.id = 'admin-audio-player';
                audioElement.controls = true;
                audioElement.style.cssText = `
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    z-index: 1000;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    background: white;
                `;
                document.body.appendChild(audioElement);
            }

            // Set audio source and play
            audioElement.src = `/api/recordings/${recordingId}/audio`;
            audioElement.style.display = 'block';
            
            await audioElement.play();

            // Hide after playing
            audioElement.onended = () => {
                setTimeout(() => {
                    audioElement.style.display = 'none';
                }, 2000);
            };

        } catch (error) {
            console.error('Error playing recording:', error);
            this.showFeedback('Failed to play recording', 'error');
        }
    }

    // Bulk actions
    async bulkAutoTag() {
        if (!confirm('This will auto-generate tags for all recordings. Continue?')) {
            return;
        }

        const button = document.getElementById('bulk-auto-tag');
        const originalText = button.textContent;
        button.textContent = 'Processing...';
        button.disabled = true;

        try {
            let processed = 0;
            const total = this.recordings.length;

            for (const recording of this.recordings) {
                if (!recording.tags || recording.tags.length === 0) {
                    try {
                        const response = await fetch('/api/admin/auto-tag', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ recordingId: recording.id })
                        });

                        if (response.ok) {
                            const result = await response.json();
                            await this.updateTags(recording.id, result.suggestedTags.join(', '));
                            processed++;
                        }
                    } catch (error) {
                        console.error(`Error auto-tagging ${recording.id}:`, error);
                    }
                }
                
                // Update progress
                button.textContent = `Processing... ${processed}/${total}`;
            }

            await this.loadRecordings();
            this.showFeedback(`Auto-tagged ${processed} recordings`, 'success', 'recordings-feedback');
            
        } catch (error) {
            console.error('Bulk auto-tag error:', error);
            this.showFeedback('Bulk auto-tag failed', 'error', 'recordings-feedback');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    exportData() {
        const exportData = {
            recordings: this.recordings,
            prompts: this.prompts,
            themes: Array.from(this.themes),
            exportDate: new Date().toISOString(),
            stats: {
                totalRecordings: this.recordings.length,
                approvedRecordings: this.recordings.filter(r => r.approved).length,
                totalPrompts: this.prompts.length,
                totalThemes: this.themes.size
            }
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sounds-like-home-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showFeedback('Data exported successfully', 'success');
    }

    async analyzeAllThemes() {
        const button = document.getElementById('analyze-themes');
        const originalText = button.textContent;
        button.textContent = 'Analyzing...';
        button.disabled = true;

        try {
            // Re-extract themes from all recordings
            this.extractThemes();
            this.renderThemeGrid();
            this.showFeedback('Theme analysis completed', 'success', 'themes-feedback');
        } catch (error) {
            console.error('Theme analysis error:', error);
            this.showFeedback('Theme analysis failed', 'error', 'themes-feedback');
        } finally {
            button.textContent = originalText;
            button.disabled = false;
        }
    }

    showFeedback(message, type, targetId = 'feedback') {
        const feedbackEl = document.getElementById(targetId);
        if (!feedbackEl) return;

        feedbackEl.className = `feedback feedback-${type}`;
        feedbackEl.textContent = message;
        feedbackEl.classList.remove('hidden');

        setTimeout(() => {
            feedbackEl.classList.add('hidden');
        }, 3000);
    }
}

// Initialize enhanced admin interface when DOM is loaded
let adminInterface;
document.addEventListener('DOMContentLoaded', () => {
    adminInterface = new EnhancedAdminInterface();
});