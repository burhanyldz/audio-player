class AudioPlayer {
    constructor(options = {}) {
        this.options = {
            theme: options.theme || 'light',
            track: options.track || {},
            autoplay: options.autoplay || false,
            allowMulti: options.allowMulti !== undefined ? options.allowMulti : false,
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
    // Simple in-instance event emitter: eventName -> Set of handlers
    this._events = {};

    // Played seconds counter (counts actual seconds audio was playing)
    this.playedSeconds = 0;
    this._playedInterval = null; // interval id while playing
        this.setupAudio();
        this.createElements();
        this.bindEvents();

        // If saveSettings is enabled, apply saved settings (volume/playbackRate)
        if (this.options.saveSettings) {
            this._applySavedSettings();
        }

        // Register this instance globally so we can manage multiple players
        if (!window.__AudioPlayers) {
            window.__AudioPlayers = new Set();
        }
        window.__AudioPlayers.add(this);
    }

    // Event emitter API
    on(eventName, handler) {
        if (!this._events[eventName]) this._events[eventName] = new Set();
        this._events[eventName].add(handler);
    }

    off(eventName, handler) {
        if (!this._events[eventName]) return;
        if (!handler) {
            delete this._events[eventName];
            return;
        }
        this._events[eventName].delete(handler);
    }

    emit(eventName, detail = {}) {
        // Call JS handlers
        const handlers = this._events[eventName];
        if (handlers) {
            for (const h of handlers) {
                try { h(detail); } catch (e) { console.error(e); }
            }
        }

        // Dispatch DOM CustomEvent from container for DOM listeners
        if (this.container) {
            try {
                const ev = new CustomEvent(eventName, { detail });
                this.container.dispatchEvent(ev);
            } catch (e) {
                // ignore
            }
        }
    }
    
    setupAudio() {
        if (this.options.track.src) {
            this.audio.src = this.options.track.src;
        }
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.duration = this.audio.duration;
            this.updateTimeline();
            this.emit('loadedmetadata', { duration: this.duration, track: this.options.track });
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.currentTime = this.audio.currentTime;
            this.updateTimeline();
            this.emit('timeupdate', { currentTime: this.currentTime, duration: this.duration, track: this.options.track });
        });
        
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this._stopPlayedInterval();
            this.emit('ended', { playedSeconds: this.playedSeconds, track: this.options.track });
        });
        
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.updatePlayButton();
            // Ensure only one player is active at a time when allowMulti is false
            if (this.options.allowMulti === false) {
                this.closeOthers();
            }
            this._startPlayedInterval();
            this.emit('play', { track: this.options.track });
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.updatePlayButton();
            this._stopPlayedInterval();
            this.emit('pause', { playedSeconds: this.playedSeconds, track: this.options.track });
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
                            <div class="audio-player-cover-overlay">
                                <div class="cover-headphones-icon">
                                    <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                                    </svg>
                                </div>
                                <div class="cover-album-text">${this.options.track.album || 'Unknown Album'}</div>
                            </div>
                        </div>
                        
                        <h2 class="audio-player-title">${this.options.track.title || 'Unknown Track'}</h2>
                        
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
                        
                        <!-- Speed Controls -->
                        <div class="audio-player-speed">
                            <button class="speed-btn" title="Playback Speed">1x</button>
                            <div class="speed-popup" style="display: none;">
                                <button class="speed-option" data-speed="0.5">0.5x</button>
                                <button class="speed-option" data-speed="0.75">0.75x</button>
                                <button class="speed-option active" data-speed="1">1x</button>
                                <button class="speed-option" data-speed="1.25">1.25x</button>
                                <button class="speed-option" data-speed="1.5">1.5x</button>
                                <button class="speed-option" data-speed="2">2x</button>
                            </div>
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
                    
                    <button class="minimized-speed-btn" title="Playback Speed">1x</button>
                    
                    <button class="minimized-volume-btn" title="Volume">
                        <svg class="minimized-speaker-unmuted-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                        <svg class="minimized-speaker-muted-icon" style="display: none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                            <line x1="23" y1="9" x2="17" y2="15"></line>
                            <line x1="17" y1="9" x2="23" y2="15"></line>
                        </svg>
                    </button>
                    
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
                    
                    <!-- Minimized Speed Popup -->
                    <div class="minimized-speed-popup" style="display: none;">
                        <button class="minimized-speed-option" data-speed="0.5">0.5x</button>
                        <button class="minimized-speed-option" data-speed="0.75">0.75x</button>
                        <button class="minimized-speed-option active" data-speed="1">1x</button>
                        <button class="minimized-speed-option" data-speed="1.25">1.25x</button>
                        <button class="minimized-speed-option" data-speed="1.5">1.5x</button>
                        <button class="minimized-speed-option" data-speed="2">2x</button>
                    </div>
                    
                    <!-- Minimized Volume Popup -->
                    <div class="minimized-volume-popup" style="display: none;">
                        <button class="minimized-volume-mute-btn" title="Mute/Unmute">
                            <svg class="minimized-muted-icon" style="display: none;" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <line x1="23" y1="9" x2="17" y2="15"></line>
                                <line x1="17" y1="9" x2="23" y2="15"></line>
                            </svg>
                            <svg class="minimized-unmuted-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                            </svg>
                        </button>
                        <input type="range" class="minimized-volume-slider" min="0" max="1" step="0.01" value="1" orient="vertical">
                    </div>
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
        const speedBtn = this.container.querySelector('.speed-btn');
        const speedPopup = this.container.querySelector('.speed-popup');
        const speedOptions = this.container.querySelectorAll('.speed-option');
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
        const minimizedSpeedBtn = this.container.querySelector('.minimized-speed-btn');
        const minimizedVolumeBtn = this.container.querySelector('.minimized-volume-btn');
        const minimizedMaximizeBtn = this.container.querySelector('.minimized-maximize-btn');
        const minimizedCloseBtn = this.container.querySelector('.minimized-close-btn');
        
        // Minimized popups
        const minimizedSpeedPopup = this.container.querySelector('.minimized-speed-popup');
        const minimizedSpeedOptions = this.container.querySelectorAll('.minimized-speed-option');
        const minimizedVolumePopup = this.container.querySelector('.minimized-volume-popup');
        const minimizedVolumeMuteBtn = this.container.querySelector('.minimized-volume-mute-btn');
        const minimizedVolumeSlider = this.container.querySelector('.minimized-volume-slider');
        
        closeBtn.addEventListener('click', () => this.close());
        minimizeBtn.addEventListener('click', () => this.minimize());
        playPauseBtn.addEventListener('click', () => this.togglePlay());
        rewindBtn.addEventListener('click', () => this.rewind());
        forwardBtn.addEventListener('click', () => this.forward());
        speedBtn.addEventListener('click', () => this.toggleSpeedPopup());
        backdrop.addEventListener('click', () => this.close());
        
        // Speed options
        speedOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const speed = e.target.dataset.speed;
                this.setPlaybackRate(speed);
                this.hideSpeedPopup();
            });
        });
        
        // Volume controls
        volumeSpeakerBtn.addEventListener('click', () => this.toggleVolumePopup());
        volumeMuteBtn.addEventListener('click', () => this.toggleMute());
        volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Close popups when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.querySelector('.audio-player-volume').contains(e.target)) {
                this.hideVolumePopup();
            }
            if (!this.container.querySelector('.audio-player-speed').contains(e.target)) {
                this.hideSpeedPopup();
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
        minimizedSpeedBtn.addEventListener('click', () => this.toggleMinimizedSpeedPopup());
        minimizedVolumeBtn.addEventListener('click', () => this.toggleMinimizedVolumePopup());
        minimizedMaximizeBtn.addEventListener('click', () => this.maximize());
        minimizedCloseBtn.addEventListener('click', () => this.close());
        
        // Minimized speed options
        minimizedSpeedOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const speed = e.target.dataset.speed;
                this.setPlaybackRate(speed);
                this.hideMinimizedSpeedPopup();
            });
        });
        
        // Minimized volume controls
        minimizedVolumeMuteBtn.addEventListener('click', () => this.toggleMute());
        minimizedVolumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        
        // Close minimized popups when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.querySelector('.audio-player-minimized').contains(e.target) && 
                !minimizedSpeedPopup.contains(e.target) && 
                !minimizedVolumePopup.contains(e.target)) {
                this.hideMinimizedSpeedPopup();
                this.hideMinimizedVolumePopup();
            }
        });
        
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
        // Close other players before showing this one when allowMulti is false
        if (this.options.allowMulti === false) {
            this.closeOthers();
        }
    // Ensure this instance is registered (re-open after close)
    if (!window.__AudioPlayers) window.__AudioPlayers = new Set();
    window.__AudioPlayers.add(this);
        this.container.style.display = 'block';
        this.container.querySelector('.audio-player-modal').style.display = 'flex';
        this.container.querySelector('.audio-player-minimized').style.display = 'none';
        this.isMinimized = false;
        this.container.classList.remove('minimized');
        document.body.style.overflow = window.innerWidth <= 768 ? 'hidden' : 'auto';
        
        // Initialize volume UI
        this.updateVolumeUI();
        
        // Auto play if enabled
        if (this.options.autoplay) {
            this.audio.play().catch(e => {
                console.log('Autoplay was prevented by browser policy:', e);
            });
        }

    // Emit show event
    this.emit('show', { track: this.options.track, playedSeconds: this.playedSeconds });
    }
    
    minimize() {
        this.container.querySelector('.audio-player-modal').style.display = 'none';
        this.container.querySelector('.audio-player-minimized').style.display = 'flex';
        this.isMinimized = true;
        this.container.classList.add('minimized');
        document.body.style.overflow = 'auto';

    this.emit('minimize', { track: this.options.track, playedSeconds: this.playedSeconds });
    }
    
    maximize() {
        this.container.querySelector('.audio-player-modal').style.display = 'flex';
        this.container.querySelector('.audio-player-minimized').style.display = 'none';
        this.isMinimized = false;
        this.container.classList.remove('minimized');
        document.body.style.overflow = 'hidden';

    this.emit('maximize', { track: this.options.track, playedSeconds: this.playedSeconds });
    }
    
    close() {
        // Avoid duplicate close
        if (this._closed) return;
        this._closed = true;

        this.audio.pause();
        this.container.style.display = 'none';
        this.isMinimized = false;
        this.container.classList.remove('minimized');
        document.body.style.overflow = 'auto';

        // Stop interval and emit close with playedSeconds
        this._stopPlayedInterval();
        this.emit('close', { playedSeconds: this.playedSeconds, track: this.options.track });

        // Remove from global registry so future closeOthers won't target this instance
        if (window.__AudioPlayers) {
            window.__AudioPlayers.delete(this);
        }
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
        
        // Update button text
        const speedBtn = this.container.querySelector('.speed-btn');
        const minimizedSpeedBtn = this.container.querySelector('.minimized-speed-btn');
        const speedText = rate + 'x';
        
        if (speedBtn) speedBtn.textContent = speedText;
        if (minimizedSpeedBtn) minimizedSpeedBtn.textContent = speedText;
        
        // Update active state in popup
        const speedOptions = this.container.querySelectorAll('.speed-option');
        speedOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.speed === rate.toString()) {
                option.classList.add('active');
            }
        });
        
        // Update active state in minimized popup
        const minimizedSpeedOptions = this.container.querySelectorAll('.minimized-speed-option');
        minimizedSpeedOptions.forEach(option => {
            option.classList.remove('active');
            if (option.dataset.speed === rate.toString()) {
                option.classList.add('active');
            }
        });

        // Persist settings if enabled
        if (this.options.saveSettings) {
            this._saveSettingsToStorage();
        }
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

        if (this.options.saveSettings) {
            this._saveSettingsToStorage();
        }
    }

    // Settings persistence helpers
    _storageKey() {
        return 'audioPlayer.settings';
    }

    _saveSettingsToStorage() {
        try {
            const payload = {
                playbackRate: this.playbackRate,
                volume: this.volume
            };
            localStorage.setItem(this._storageKey(), JSON.stringify(payload));
        } catch (e) {
            console.warn('Failed to save audio player settings', e);
        }
    }

    _loadSettingsFromStorage() {
        try {
            const raw = localStorage.getItem(this._storageKey());
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed;
        } catch (e) {
            return null;
        }
    }

    _applySavedSettings() {
        const s = this._loadSettingsFromStorage();
        if (!s) return;
        if (s.playbackRate !== undefined && s.playbackRate !== null) {
            // Use setPlaybackRate to update UI and audio
            this.setPlaybackRate(s.playbackRate);
        }
        if (s.volume !== undefined && s.volume !== null) {
            this.setVolume(s.volume);
        }
    }
    
    updateVolumeUI() {
        const volumeSpeakerBtn = this.container.querySelector('.volume-speaker-btn');
        const volumeMuteBtn = this.container.querySelector('.volume-mute-btn');
        const minimizedVolumeBtn = this.container.querySelector('.minimized-volume-btn');
        const volumeSlider = this.container.querySelector('.volume-slider');
        
        // Speaker button icons
        const speakerMutedIcon = volumeSpeakerBtn.querySelector('.speaker-muted-icon');
        const speakerUnmutedIcon = volumeSpeakerBtn.querySelector('.speaker-unmuted-icon');
        
        // Mute button icons
        const mutedIcon = volumeMuteBtn.querySelector('.muted-icon');
        const unmutedIcon = volumeMuteBtn.querySelector('.unmuted-icon');
        
        // Minimized volume button icons
        const minimizedSpeakerMutedIcon = minimizedVolumeBtn?.querySelector('.minimized-speaker-muted-icon');
        const minimizedSpeakerUnmutedIcon = minimizedVolumeBtn?.querySelector('.minimized-speaker-unmuted-icon');
        
        // Update all button icons
        if (this.isMuted) {
            // Speaker button - show muted icon
            speakerMutedIcon.style.display = 'block';
            speakerUnmutedIcon.style.display = 'none';
            // Mute button - show muted icon (so user knows it's muted and can click to unmute)
            mutedIcon.style.display = 'block';
            unmutedIcon.style.display = 'none';
            // Minimized volume button - show muted icon
            if (minimizedSpeakerMutedIcon && minimizedSpeakerUnmutedIcon) {
                minimizedSpeakerMutedIcon.style.display = 'block';
                minimizedSpeakerUnmutedIcon.style.display = 'none';
            }
        } else {
            // Speaker button - show unmuted icon
            speakerMutedIcon.style.display = 'none';
            speakerUnmutedIcon.style.display = 'block';
            // Mute button - show unmuted icon (so user knows it's unmuted and can click to mute)
            mutedIcon.style.display = 'none';
            unmutedIcon.style.display = 'block';
            // Minimized volume button - show unmuted icon
            if (minimizedSpeakerMutedIcon && minimizedSpeakerUnmutedIcon) {
                minimizedSpeakerMutedIcon.style.display = 'none';
                minimizedSpeakerUnmutedIcon.style.display = 'block';
            }
        }
        
        // Update slider values - always show current volume
        volumeSlider.value = this.volume;
        
        // Update minimized volume popup elements
        const minimizedVolumeSlider = this.container.querySelector('.minimized-volume-slider');
        const minimizedVolumeMuteBtn = this.container.querySelector('.minimized-volume-mute-btn');
        
        if (minimizedVolumeSlider) {
            minimizedVolumeSlider.value = this.volume;
        }
        
        if (minimizedVolumeMuteBtn) {
            const minimizedMutedIcon = minimizedVolumeMuteBtn.querySelector('.minimized-muted-icon');
            const minimizedUnmutedIcon = minimizedVolumeMuteBtn.querySelector('.minimized-unmuted-icon');
            
            if (this.isMuted) {
                minimizedMutedIcon.style.display = 'block';
                minimizedUnmutedIcon.style.display = 'none';
            } else {
                minimizedMutedIcon.style.display = 'none';
                minimizedUnmutedIcon.style.display = 'block';
            }
        }
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
        const modal = this.container.querySelector('.audio-player-modal');
        const minimized = this.container.querySelector('.audio-player-minimized');
        
        volumePopup.style.display = 'block';
        
        // Position popup based on whether we're in minimized mode
        if (this.isMinimized) {
            // When minimized, show the modal temporarily to access the popup
            modal.style.display = 'flex';
            modal.style.visibility = 'hidden';
            modal.style.pointerEvents = 'none';
            
            volumePopup.style.position = 'fixed';
            volumePopup.style.bottom = '80px';
            volumePopup.style.right = '20px';
            volumePopup.style.left = 'auto';
            volumePopup.style.visibility = 'visible';
            volumePopup.style.pointerEvents = 'all';
        } else {
            modal.style.visibility = 'visible';
            modal.style.pointerEvents = 'all';
            volumePopup.style.position = 'absolute';
            volumePopup.style.bottom = '100%';
            volumePopup.style.right = '0';
            volumePopup.style.left = 'auto';
            volumePopup.style.visibility = 'visible';
            volumePopup.style.pointerEvents = 'all';
        }
    }
    
    hideVolumePopup() {
        const volumePopup = this.container.querySelector('.volume-popup');
        const modal = this.container.querySelector('.audio-player-modal');
        
        volumePopup.style.display = 'none';
        
        // If we're minimized, hide the modal again
        if (this.isMinimized) {
            modal.style.display = 'none';
        }
    }
    
    toggleSpeedPopup() {
        const speedPopup = this.container.querySelector('.speed-popup');
        const isVisible = speedPopup.style.display === 'block';
        
        if (isVisible) {
            this.hideSpeedPopup();
        } else {
            this.showSpeedPopup();
        }
    }
    
    showSpeedPopup() {
        const speedPopup = this.container.querySelector('.speed-popup');
        const modal = this.container.querySelector('.audio-player-modal');
        const minimized = this.container.querySelector('.audio-player-minimized');
        
        speedPopup.style.display = 'block';
        
        // Position popup based on whether we're in minimized mode
        if (this.isMinimized) {
            // When minimized, show the modal temporarily to access the popup
            modal.style.display = 'flex';
            modal.style.visibility = 'hidden';
            modal.style.pointerEvents = 'none';
            
            speedPopup.style.position = 'fixed';
            speedPopup.style.bottom = '80px';
            speedPopup.style.left = '20px';
            speedPopup.style.right = 'auto';
            speedPopup.style.visibility = 'visible';
            speedPopup.style.pointerEvents = 'all';
        } else {
            modal.style.visibility = 'visible';
            modal.style.pointerEvents = 'all';
            speedPopup.style.position = 'absolute';
            speedPopup.style.bottom = '100%';
            speedPopup.style.left = '0';
            speedPopup.style.right = 'auto';
            speedPopup.style.visibility = 'visible';
            speedPopup.style.pointerEvents = 'all';
        }
    }
    
    hideSpeedPopup() {
        const speedPopup = this.container.querySelector('.speed-popup');
        const modal = this.container.querySelector('.audio-player-modal');
        
        speedPopup.style.display = 'none';
        
        // If we're minimized, hide the modal again
        if (this.isMinimized) {
            modal.style.display = 'none';
        }
    }
    
    // Minimized popup methods
    toggleMinimizedSpeedPopup() {
        const speedPopup = this.container.querySelector('.minimized-speed-popup');
        const isVisible = speedPopup.style.display === 'block';
        
        if (isVisible) {
            this.hideMinimizedSpeedPopup();
        } else {
            this.showMinimizedSpeedPopup();
        }
    }
    
    showMinimizedSpeedPopup() {
        // Close volume popup if it's open
        this.hideMinimizedVolumePopup();
        
        const speedPopup = this.container.querySelector('.minimized-speed-popup');
        speedPopup.style.display = 'block';
    }
    
    hideMinimizedSpeedPopup() {
        const speedPopup = this.container.querySelector('.minimized-speed-popup');
        speedPopup.style.display = 'none';
    }
    
    toggleMinimizedVolumePopup() {
        const volumePopup = this.container.querySelector('.minimized-volume-popup');
        const isVisible = volumePopup.style.display === 'block';
        
        if (isVisible) {
            this.hideMinimizedVolumePopup();
        } else {
            this.showMinimizedVolumePopup();
        }
    }
    
    showMinimizedVolumePopup() {
        // Close speed popup if it's open
        this.hideMinimizedSpeedPopup();
        
        const volumePopup = this.container.querySelector('.minimized-volume-popup');
        volumePopup.style.display = 'block';
    }
    
    hideMinimizedVolumePopup() {
        const volumePopup = this.container.querySelector('.minimized-volume-popup');
        volumePopup.style.display = 'none';
    }
    
    hideSpeedPopup() {
        const speedPopup = this.container.querySelector('.speed-popup');
        speedPopup.style.display = 'none';
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
            // Update the overlay album text as well
            const overlayText = this.container.querySelector('.cover-album-text');
            if (overlayText) {
                overlayText.textContent = track.album;
            }
        }
        if (track.cover) {
            this.container.querySelector('.audio-player-cover img').src = track.cover;
        }

    // Reset played seconds for new track
    this.playedSeconds = 0;
    }
    
    destroy() {
        this._closed = true;
        this.audio.pause();
        this._stopPlayedInterval();
        this.container.remove();
        document.body.style.overflow = 'auto';
        if (window.__AudioPlayers) {
            window.__AudioPlayers.delete(this);
        }
    }

    // Internal: start/stop interval to count played seconds
    _startPlayedInterval() {
        if (this._playedInterval) return;
        // Tick every 1 second while playing; increment by current playbackRate
        this._playedInterval = setInterval(() => {
            // Only increment when audio is actually playing (not paused)
            if (!this.audio.paused && !this.audio.ended) {
                const rate = this.audio.playbackRate || 1;
                // Increase playedSeconds by playback rate so that e.g. 2x doubles counted seconds
                this.playedSeconds += rate;
                this.emit('playedsecond', { playedSeconds: this.playedSeconds, track: this.options.track, rate });
            }
        }, 1000);
    }

    _stopPlayedInterval() {
        if (this._playedInterval) {
            clearInterval(this._playedInterval);
            this._playedInterval = null;
        }
    }
}

// Ensure only one player is displayed/active at a time
AudioPlayer.prototype.closeOthers = function() {
    if (!window.__AudioPlayers) return;
    window.__AudioPlayers.forEach(p => {
        if (p !== this) {
            p.close();
        }
    });
};

// Make AudioPlayer available globally
window.AudioPlayer = AudioPlayer;