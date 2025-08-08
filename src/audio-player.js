class AudioPlayer {
    constructor(options = {}) {
        this.options = {
            theme: options.theme || 'light',
            track: options.track || {},
            autoplay: options.autoplay || false,
            ...options
        };
        
        this.isMinimized = false;
        this.isPlaying = false;
        this.isDragging = false;
        this.dragPosition = 0; // Store drag position percentage
        this.currentTime = 0;
        this.duration = 0;
        this.playbackRate = 1;
        this.volume = 1;
        this.isMuted = false;
        this.previousVolume = 1; // Store volume before muting
        
        this.audio = new Audio();
        this.setupAudio();
        this.createElements();
        this.bindEvents();
    }
    
    setupAudio() {
        if (this.options.track.src) {
            this.audio.src = this.options.track.src;
        }
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.duration = this.audio.duration;
            this.updateTimeline();
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.currentTime = this.audio.currentTime;
            this.updateTimeline();
        });
        
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
        });
    }
    
    createElements() {
        // Main container
        this.container = document.createElement('div');
        this.container.className = `audio-player-container ${this.options.theme}`;
        this.container.innerHTML = `
            <!-- Full Player Modal -->
            <div class="audio-player-modal">
                <div class="audio-player-backdrop"></div>
                <div class="audio-player-content">
                    <div class="audio-player-header">
                        <button class="audio-player-minimize" title="Küçült">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 9l6 6 6-6"/>
                            </svg>
                        </button>
                        <button class="audio-player-close" title="Kapat">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="audio-player-body">
                        <div class="audio-player-cover">
                            <img src="${this.options.track.cover || ''}" alt="Album Cover" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjNmNGY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBWMTMwTTcwIDEwMEgxMzAiIHN0cm9rZT0iIzlmYTZiMiIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg=='">
                        </div>
                        
                        <h2 class="audio-player-title">${this.options.track.title || 'Unknown Track'}</h2>
                        <h3 class="audio-player-album">${this.options.track.album || 'Unknown Album'}</h3>
                        
                        <div class="audio-player-timeline">
                            <span class="timeline-time current-time">0:00</span>
                            <div class="timeline-bar">
                                <div class="timeline-progress"></div>
                                <div class="timeline-handle"></div>
                                <div class="timeline-preview" style="display: none;">0:00</div>
                            </div>
                            <span class="timeline-time total-time">0:00</span>
                            <div class="skip-tooltip"></div>
                        </div>
                        
                        <div class="audio-player-controls">
                            <button class="control-btn rewind-btn" title="10s geri sar">
                                <svg width="36" height="36" viewBox="0 0 64 64" stroke-width="4" stroke="currentColor" fill="none">
                                    <path d="M34.46,53.91A21.91,21.91,0,1,0,12.55,31.78"/>
                                    <polyline points="4.65 22.33 12.52 32.62 22.81 24.75"/>
                                </svg>
                            </button>
                            
                            <button class="control-btn play-pause-btn main-play-btn" title="Oynat/Duraklat">
                                <svg class="play-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style="transform: translateX(2px);">
                                    <polygon points="5,3 19,12 5,21"/>
                                </svg>
                                <svg class="pause-icon" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                                    <rect x="6" y="4" width="4" height="16"/>
                                    <rect x="14" y="4" width="4" height="16"/>
                                </svg>
                            </button>
                            
                            <button class="control-btn forward-btn" title="10s ileri sar">
                                <svg width="36" height="36" viewBox="0 0 64 64" stroke-width="4" stroke="currentColor" fill="none" transform="scale(-1,1)">
                                    <path d="M34.46,53.91A21.91,21.91,0,1,0,12.55,31.78"/>
                                    <polyline points="4.65 22.33 12.52 32.62 22.81 24.75"/>
                                </svg>
                            </button>
                        </div>
                        
                        <div class="audio-player-speed">
                            <select class="speed-select">
                                <option value="0.5">0.5x</option>
                                <option value="0.75">0.75x</option>
                                <option value="1" selected>1x</option>
                                <option value="1.25">1.25x</option>
                                <option value="1.5">1.5x</option>
                                <option value="2">2x</option>
                            </select>
                        </div>
                        
                        <div class="audio-player-volume">
                            <button class="volume-speaker-btn" title="Volume">
                                <svg class="speaker-unmuted-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                                <svg class="speaker-muted-icon" style="display: none;" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <line x1="23" y1="9" x2="17" y2="15"></line>
                                    <line x1="17" y1="9" x2="23" y2="15"></line>
                                </svg>
                            </button>
                            <div class="volume-popup" style="display: none;">
                                <button class="volume-mute-btn" title="Mute/Unmute">
                                    <svg class="unmuted-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                                    </svg>
                                    <svg class="muted-icon" style="display: none;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                        <line x1="23" y1="9" x2="17" y2="15"></line>
                                        <line x1="17" y1="9" x2="23" y2="15"></line>
                                    </svg>
                                </button>
                                <input type="range" class="volume-slider" min="0" max="1" step="0.01" value="1" orient="vertical">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Minimized Player -->
            <div class="audio-player-minimized" style="display: none;">
                <div class="minimized-controls">
                    <button class="minimized-play-btn">
                        <svg class="play-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="transform: translateX(1px);">
                            <polygon points="5,3 19,12 5,21"/>
                        </svg>
                        <svg class="pause-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                            <rect x="6" y="4" width="4" height="16"/>
                            <rect x="14" y="4" width="4" height="16"/>
                        </svg>
                    </button>
                    
                    <select class="minimized-speed-select">
                        <option value="0.5">0.5x</option>
                        <option value="0.75">0.75x</option>
                        <option value="1" selected>1x</option>
                        <option value="1.25">1.25x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2x</option>
                    </select>
                    
                    <button class="minimized-maximize-btn" title="Büyüt">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    </button>
                    
                    <button class="minimized-close-btn" title="Kapat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(this.container);
    }
    
    bindEvents() {
        // Modal controls
        const closeBtn = this.container.querySelector('.audio-player-close');
        const minimizeBtn = this.container.querySelector('.audio-player-minimize');
        const playPauseBtn = this.container.querySelector('.play-pause-btn');
        const rewindBtn = this.container.querySelector('.rewind-btn');
        const forwardBtn = this.container.querySelector('.forward-btn');
        const speedSelect = this.container.querySelector('.speed-select');
        const backdrop = this.container.querySelector('.audio-player-backdrop');
        
        // Volume controls
        const volumeSpeakerBtn = this.container.querySelector('.volume-speaker-btn');
        const volumeMuteBtn = this.container.querySelector('.volume-mute-btn');
        const volumeSlider = this.container.querySelector('.volume-slider');
        const volumePopup = this.container.querySelector('.volume-popup');
        
        // Timeline
        const timelineBar = this.container.querySelector('.timeline-bar');
        const timelineProgress = this.container.querySelector('.timeline-progress');
        const timelineHandle = this.container.querySelector('.timeline-handle');
        const timelinePreview = this.container.querySelector('.timeline-preview');
        
        // Minimized controls
        const minimizedPlayBtn = this.container.querySelector('.minimized-play-btn');
        const minimizedSpeedSelect = this.container.querySelector('.minimized-speed-select');
        const minimizedMaximizeBtn = this.container.querySelector('.minimized-maximize-btn');
        const minimizedCloseBtn = this.container.querySelector('.minimized-close-btn');
        
        closeBtn.addEventListener('click', () => this.close());
        minimizeBtn.addEventListener('click', () => this.minimize());
        playPauseBtn.addEventListener('click', () => this.togglePlay());
        rewindBtn.addEventListener('click', () => this.rewind());
        forwardBtn.addEventListener('click', () => this.forward());
        speedSelect.addEventListener('change', (e) => this.setPlaybackRate(e.target.value));
        backdrop.addEventListener('click', () => this.close());
        
        // Volume controls
        volumeSpeakerBtn.addEventListener('click', () => this.toggleVolumePopup());
        volumeMuteBtn.addEventListener('click', () => this.toggleMute());
        volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Close volume popup when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.querySelector('.audio-player-volume').contains(e.target)) {
                this.hideVolumePopup();
            }
        });
        
        // Timeline interaction - Mouse events
        timelineBar.addEventListener('mousedown', (e) => this.startDrag(e));
        timelineBar.addEventListener('mousemove', (e) => this.showPreview(e));
        timelineBar.addEventListener('mouseleave', () => this.hidePreview());
        
        // Timeline interaction - Touch events (with passive option where appropriate)
        timelineBar.addEventListener('touchstart', (e) => this.startDrag(e), { passive: false });
        timelineBar.addEventListener('touchmove', (e) => this.showPreview(e), { passive: true });
        timelineBar.addEventListener('touchend', () => this.hidePreview());
        
        // Global mouse events for dragging
        document.addEventListener('mousemove', (e) => this.drag(e));
        document.addEventListener('mouseup', () => this.endDrag());
        
        // Global touch events for dragging
        document.addEventListener('touchmove', (e) => this.drag(e), { passive: false });
        document.addEventListener('touchend', () => this.endDrag());
        
        // Minimized controls
        minimizedPlayBtn.addEventListener('click', () => this.togglePlay());
        minimizedSpeedSelect.addEventListener('change', (e) => this.setPlaybackRate(e.target.value));
        minimizedMaximizeBtn.addEventListener('click', () => this.maximize());
        minimizedCloseBtn.addEventListener('click', () => this.close());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (this.container.style.display !== 'none') {
                switch(e.code) {
                    case 'Space':
                        e.preventDefault();
                        this.togglePlay();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.rewind();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.forward();
                        break;
                    case 'Escape':
                        e.preventDefault();
                        if (this.isMinimized) {
                            this.close();
                        } else {
                            this.minimize();
                        }
                        break;
                }
            }
        });
    }
    
    show() {
        this.container.style.display = 'block';
        this.container.querySelector('.audio-player-modal').style.display = 'flex';
        this.container.querySelector('.audio-player-minimized').style.display = 'none';
        this.isMinimized = false;
        document.body.style.overflow = window.innerWidth <= 768 ? 'hidden' : 'auto';
        
        // Initialize volume UI
        this.updateVolumeUI();
        
        // Auto play if enabled
        if (this.options.autoplay) {
            this.audio.play().catch(e => {
                console.log('Autoplay was prevented by browser policy:', e);
            });
        }
    }
    
    minimize() {
        this.container.querySelector('.audio-player-modal').style.display = 'none';
        this.container.querySelector('.audio-player-minimized').style.display = 'flex';
        this.isMinimized = true;
        document.body.style.overflow = 'auto';
    }
    
    maximize() {
        this.container.querySelector('.audio-player-modal').style.display = 'flex';
        this.container.querySelector('.audio-player-minimized').style.display = 'none';
        this.isMinimized = false;
        document.body.style.overflow = 'hidden';
    }
    
    close() {
        this.audio.pause();
        this.container.style.display = 'none';
        this.isMinimized = false;
        document.body.style.overflow = 'auto';
    }
    
    togglePlay() {
        if (this.isPlaying) {
            this.audio.pause();
        } else {
            this.audio.play();
        }
    }
    
    rewind() {
        this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
        this.showSkipTooltip('10s geri');
    }
    
    forward() {
        this.audio.currentTime = Math.min(this.duration, this.audio.currentTime + 10);
        this.showSkipTooltip('10s ileri');
    }
    
    showSkipTooltip(message) {
        const tooltip = this.container.querySelector('.skip-tooltip');
        tooltip.textContent = message;
        tooltip.classList.add('show');
        
        // Clear any existing timeout
        if (this.skipTooltipTimeout) {
            clearTimeout(this.skipTooltipTimeout);
        }
        
        // Hide after 2 seconds
        this.skipTooltipTimeout = setTimeout(() => {
            tooltip.classList.remove('show');
        }, 2000);
    }
    
    setPlaybackRate(rate) {
        this.playbackRate = parseFloat(rate);
        this.audio.playbackRate = this.playbackRate;
        
        // Sync both speed selects
        this.container.querySelector('.speed-select').value = rate;
        this.container.querySelector('.minimized-speed-select').value = rate;
    }
    
    toggleMute() {
        if (this.isMuted) {
            // Unmuting - restore previous volume
            this.isMuted = false;
            this.volume = this.previousVolume;
            this.audio.volume = this.volume;
        } else {
            // Muting - store current volume and set to 0
            this.previousVolume = this.volume;
            this.isMuted = true;
            this.volume = 0;
            this.audio.volume = 0;
        }
        
        this.audio.muted = this.isMuted;
        this.updateVolumeUI();
    }
    
    setVolume(value) {
        this.volume = parseFloat(value);
        this.audio.volume = this.volume;
        
        // If user changes volume from 0 while muted, unmute
        if (this.isMuted && this.volume > 0) {
            this.isMuted = false;
            this.audio.muted = false;
            this.previousVolume = this.volume; // Update previous volume
        }
        
        // If user sets volume to 0, consider it muted
        if (this.volume === 0 && !this.isMuted) {
            this.isMuted = true;
            this.audio.muted = true;
        }
        
        this.updateVolumeUI();
    }
    
    updateVolumeUI() {
        const volumeSpeakerBtn = this.container.querySelector('.volume-speaker-btn');
        const volumeMuteBtn = this.container.querySelector('.volume-mute-btn');
        const volumeSlider = this.container.querySelector('.volume-slider');
        
        // Speaker button icons
        const speakerMutedIcon = volumeSpeakerBtn.querySelector('.speaker-muted-icon');
        const speakerUnmutedIcon = volumeSpeakerBtn.querySelector('.speaker-unmuted-icon');
        
        // Mute button icons
        const mutedIcon = volumeMuteBtn.querySelector('.muted-icon');
        const unmutedIcon = volumeMuteBtn.querySelector('.unmuted-icon');
        
        // Update both button icons
        if (this.isMuted) {
            // Speaker button - show muted icon
            speakerMutedIcon.style.display = 'block';
            speakerUnmutedIcon.style.display = 'none';
            // Mute button - show muted icon (so user knows it's muted and can click to unmute)
            mutedIcon.style.display = 'block';
            unmutedIcon.style.display = 'none';
        } else {
            // Speaker button - show unmuted icon
            speakerMutedIcon.style.display = 'none';
            speakerUnmutedIcon.style.display = 'block';
            // Mute button - show unmuted icon (so user knows it's unmuted and can click to mute)
            mutedIcon.style.display = 'none';
            unmutedIcon.style.display = 'block';
        }
        
        // Update slider value - always show current volume
        volumeSlider.value = this.volume;
    }
    
    toggleVolumePopup() {
        const volumePopup = this.container.querySelector('.volume-popup');
        const isVisible = volumePopup.style.display === 'block';
        
        if (isVisible) {
            this.hideVolumePopup();
        } else {
            this.showVolumePopup();
        }
    }
    
    showVolumePopup() {
        const volumePopup = this.container.querySelector('.volume-popup');
        volumePopup.style.display = 'block';
    }
    
    hideVolumePopup() {
        const volumePopup = this.container.querySelector('.volume-popup');
        volumePopup.style.display = 'none';
    }
    
    seekToPosition(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * this.duration;
        this.audio.currentTime = newTime;
    }
    
    // Helper function to get coordinates from mouse or touch events
    getEventX(e) {
        return e.touches ? e.touches[0].clientX : e.clientX;
    }
    
    startDrag(e) {
        this.isDragging = true;
        const timelineBar = this.container.querySelector('.timeline-bar');
        timelineBar.classList.add('dragging');
        
        // Calculate initial drag position but don't seek yet
        const rect = timelineBar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(this.getEventX(e) - rect.left, rect.width));
        this.dragPosition = clickX / rect.width;
        
        // Only prevent default if the event is cancelable
        if (e.cancelable) {
            e.preventDefault();
        }
    }
    
    drag(e) {
        if (!this.isDragging) return;
        
        // Prevent default behavior if possible
        if (e.cancelable) {
            e.preventDefault();
        }
        
        const timelineBar = this.container.querySelector('.timeline-bar');
        const rect = timelineBar.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(this.getEventX(e) - rect.left, rect.width));
        const percentage = clickX / rect.width;
        const previewTime = percentage * this.duration;
        
        // Store drag position
        this.dragPosition = percentage;
        
        // Update visual position to show where user is dragging
        const handle = this.container.querySelector('.timeline-handle');
        const preview = this.container.querySelector('.timeline-preview');
        
        handle.style.left = `${percentage * 100}%`;
        
        // Show preview time
        preview.style.display = 'block';
        preview.style.left = `${clickX}px`;
        preview.textContent = this.formatTime(previewTime);
        
        // Keep current time display showing actual playback position (don't update during drag)
    }
    
    endDrag() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        const timelineBar = this.container.querySelector('.timeline-bar');
        timelineBar.classList.remove('dragging');
        
        // Seek to the final drag position
        const newTime = this.dragPosition * this.duration;
        this.audio.currentTime = newTime;
        this.currentTime = newTime;
        
        // Hide preview
        this.hidePreview();
        
        // Force update timeline to show the correct position
        this.updateTimeline();
    }
    
    showPreview(e) {
        if (this.isDragging) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = this.getEventX(e) - rect.left;
        const percentage = mouseX / rect.width;
        const previewTime = percentage * this.duration;
        
        const preview = this.container.querySelector('.timeline-preview');
        preview.style.display = 'block';
        preview.style.left = `${mouseX}px`;
        preview.textContent = this.formatTime(previewTime);
    }
    
    hidePreview() {
        if (this.isDragging) return;
        
        const preview = this.container.querySelector('.timeline-preview');
        preview.style.display = 'none';
    }
    
    updateTimeline() {
        if (this.duration > 0) {
            const percentage = (this.currentTime / this.duration) * 100;
            const progress = this.container.querySelector('.timeline-progress');
            const handle = this.container.querySelector('.timeline-handle');
            
            // Always update progress bar (shows actual playback position)
            progress.style.width = `${percentage}%`;
            
            // Only update handle position if not dragging
            if (!this.isDragging) {
                handle.style.left = `${percentage}%`;
            }
            
            // Always update current time and total time (even during drag)
            this.container.querySelector('.current-time').textContent = this.formatTime(this.currentTime);
            this.container.querySelector('.total-time').textContent = this.formatTime(this.duration);
        }
    }
    
    updatePlayButton() {
        const mainPlayIcons = this.container.querySelectorAll('.play-pause-btn svg, .minimized-play-btn svg');
        
        mainPlayIcons.forEach(icon => {
            if (icon.classList.contains('play-icon')) {
                icon.style.display = this.isPlaying ? 'none' : 'block';
            } else if (icon.classList.contains('pause-icon')) {
                icon.style.display = this.isPlaying ? 'block' : 'none';
            }
        });
    }
    
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Public methods for external control
    loadTrack(track) {
        this.options.track = { ...this.options.track, ...track };
        if (track.src) {
            this.audio.src = track.src;
        }
        if (track.title) {
            this.container.querySelector('.audio-player-title').textContent = track.title;
        }
        if (track.album) {
            this.container.querySelector('.audio-player-album').textContent = track.album;
        }
        if (track.cover) {
            this.container.querySelector('.audio-player-cover img').src = track.cover;
        }
    }
    
    destroy() {
        this.audio.pause();
        this.container.remove();
        document.body.style.overflow = 'auto';
    }
}

// Make AudioPlayer available globally
window.AudioPlayer = AudioPlayer;