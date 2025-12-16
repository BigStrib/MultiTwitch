// ==================== State Management ====================
const state = {
    streams: [],
    menuOpen: false,
    isDragging: false,
    isResizing: false,
    activePlayer: null,
    resizeHandle: null,
    streamCounter: {}
};

// ==================== DOM Elements ====================
const menuToggle = document.getElementById('menuToggle');
const menuToggleArea = document.getElementById('menuToggleArea');
const menuOverlay = document.getElementById('menuOverlay');
const slideMenu = document.getElementById('slideMenu');
const urlInput = document.getElementById('urlInput');
const addBtn = document.getElementById('addBtn');
const videoContainer = document.getElementById('videoContainer');
const emptyState = document.getElementById('emptyState');
const streamItems = document.getElementById('streamItems');
const streamCount = document.getElementById('streamCount');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// ==================== Utility Functions ====================
function extractChannelName(input) {
    input = input.trim();
    
    const patterns = [
        /(?:https?:\/\/)?(?:www\.)?twitch\.tv\/([a-zA-Z0-9_]+)/,
        /(?:https?:\/\/)?(?:player\.)?twitch\.tv\/\?channel=([a-zA-Z0-9_]+)/,
        /^([a-zA-Z0-9_]+)$/
    ];

    for (const pattern of patterns) {
        const match = input.match(pattern);
        if (match) return match[1].toLowerCase();
    }
    return null;
}

function generateId() {
    return 'stream_' + Math.random().toString(36).substr(2, 9);
}

function showToast(message, type = 'success') {
    toastMessage.textContent = message;
    toast.className = 'toast ' + type;
    
    const icon = toast.querySelector('svg');
    if (type === 'success') {
        icon.innerHTML = '<polyline points="20 6 9 17 4 12"></polyline>';
    } else {
        icon.innerHTML = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>';
    }
    
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ==================== Menu Functions ====================
function toggleMenu(open = null) {
    state.menuOpen = open !== null ? open : !state.menuOpen;
    slideMenu.classList.toggle('open', state.menuOpen);
    menuOverlay.classList.toggle('active', state.menuOpen);
    menuToggle.classList.toggle('menu-open', state.menuOpen);
    
    if (state.menuOpen) {
        setTimeout(() => urlInput.focus(), 300);
    }
}

// ==================== Stream Management ====================
function addStream(channelName) {
    if (!channelName) {
        showToast('Invalid Twitch URL or channel name', 'error');
        return false;
    }

    // Track instance count for this channel
    if (!state.streamCounter[channelName]) {
        state.streamCounter[channelName] = 0;
    }
    state.streamCounter[channelName]++;

    const id = generateId();
    const instanceNum = state.streamCounter[channelName];
    
    // Calculate position with offset for multiple instances
    const baseOffset = 50;
    const instanceOffset = (state.streams.length * 40) % 200;
    
    const streamData = {
        id,
        channel: channelName,
        instance: instanceNum,
        x: baseOffset + instanceOffset,
        y: baseOffset + instanceOffset,
        width: 640,
        height: 360
    };

    state.streams.push(streamData);
    createVideoPlayer(streamData);
    updateStreamList();
    updateEmptyState();
    
    const instanceText = instanceNum > 1 ? ` (Instance ${instanceNum})` : '';
    showToast(`${channelName}${instanceText} added successfully!`);
    return true;
}

function removeStream(id) {
    const index = state.streams.findIndex(s => s.id === id);
    if (index > -1) {
        const stream = state.streams[index];
        const player = document.getElementById(id);
        if (player) player.remove();
        state.streams.splice(index, 1);
        updateStreamList();
        updateEmptyState();
        showToast(`${stream.channel} removed`);
    }
}

function createVideoPlayer(streamData) {
    const player = document.createElement('div');
    player.id = streamData.id;
    player.className = 'video-player';
    player.style.left = streamData.x + 'px';
    player.style.top = streamData.y + 'px';
    player.style.width = streamData.width + 'px';
    player.style.height = streamData.height + 'px';

    player.innerHTML = `
        <div class="video-wrapper">
            <iframe
                src="https://player.twitch.tv/?channel=${streamData.channel}&parent=${window.location.hostname}&muted=true"
                allowfullscreen>
            </iframe>
        </div>
        
        <div class="drag-overlay"></div>
        
        <div class="video-controls">
            <!-- Move Button - Left Side -->
            <button class="move-btn" data-action="move" title="Drag to move">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="5 9 2 12 5 15"></polyline>
                    <polyline points="9 5 12 2 15 5"></polyline>
                    <polyline points="15 19 12 22 9 19"></polyline>
                    <polyline points="19 9 22 12 19 15"></polyline>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="12" y1="2" x2="12" y2="22"></line>
                </svg>
            </button>

            <!-- Delete Button - Right Side -->
            <button class="delete-btn" data-action="delete" title="Delete">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>

            <div class="delete-confirm">
                <p>Remove this stream?</p>
                <div class="delete-confirm-buttons">
                    <button class="confirm-btn cancel" data-action="cancel-delete" title="Keep">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                    <button class="confirm-btn delete" data-action="confirm-delete" title="Delete">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <div class="size-indicator"></div>

        <div class="resize-handle top-left" data-resize="top-left"></div>
        <div class="resize-handle top-right" data-resize="top-right"></div>
        <div class="resize-handle bottom-left" data-resize="bottom-left"></div>
        <div class="resize-handle bottom-right" data-resize="bottom-right"></div>
    `;

    setupPlayerEvents(player, streamData);
    videoContainer.appendChild(player);
}

function setupPlayerEvents(player, streamData) {
    const moveBtn = player.querySelector('.move-btn');
    const deleteBtn = player.querySelector('.delete-btn');
    const deleteConfirm = player.querySelector('.delete-confirm');
    const cancelBtn = player.querySelector('[data-action="cancel-delete"]');
    const confirmBtn = player.querySelector('[data-action="confirm-delete"]');
    const resizeHandles = player.querySelectorAll('.resize-handle');
    const sizeIndicator = player.querySelector('.size-indicator');
    const iframe = player.querySelector('iframe');

    // ==================== Drag to Move Functionality ====================
    let dragOffset = { x: 0, y: 0 };

    moveBtn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        state.isDragging = true;
        state.activePlayer = player;
        
        const rect = player.getBoundingClientRect();
        dragOffset.x = e.clientX - rect.left;
        dragOffset.y = e.clientY - rect.top;
        
        player.classList.add('dragging');
        moveBtn.classList.add('dragging');
    });

    // ==================== Delete Functionality ====================
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConfirm.classList.add('show');
        player.classList.add('dragging'); // Disable iframe interaction
    });

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteConfirm.classList.remove('show');
        player.classList.remove('dragging');
    });

    confirmBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeStream(streamData.id);
    });

    // ==================== Resize Functionality ====================
    resizeHandles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            state.isResizing = true;
            state.resizeHandle = handle.dataset.resize;
            state.activePlayer = player;
            
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = player.offsetWidth;
            const startHeight = player.offsetHeight;
            const startLeft = player.offsetLeft;
            const startTop = player.offsetTop;
            const aspectRatio = 16 / 9;

            player.classList.add('resizing');
            sizeIndicator.classList.add('show');
            sizeIndicator.textContent = `${Math.round(startWidth)} × ${Math.round(startHeight)}`;

            function onMouseMove(e) {
                if (!state.isResizing) return;

                let newWidth, newHeight, newLeft, newTop;
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;

                switch (state.resizeHandle) {
                    case 'bottom-right':
                        newWidth = Math.max(320, startWidth + deltaX);
                        newHeight = newWidth / aspectRatio;
                        newLeft = startLeft;
                        newTop = startTop;
                        break;
                    case 'bottom-left':
                        newWidth = Math.max(320, startWidth - deltaX);
                        newHeight = newWidth / aspectRatio;
                        newLeft = startLeft + (startWidth - newWidth);
                        newTop = startTop;
                        break;
                    case 'top-right':
                        newWidth = Math.max(320, startWidth + deltaX);
                        newHeight = newWidth / aspectRatio;
                        newLeft = startLeft;
                        newTop = startTop + (startHeight - newHeight);
                        break;
                    case 'top-left':
                        newWidth = Math.max(320, startWidth - deltaX);
                        newHeight = newWidth / aspectRatio;
                        newLeft = startLeft + (startWidth - newWidth);
                        newTop = startTop + (startHeight - newHeight);
                        break;
                }

                // Apply bounds checking
                const maxWidth = window.innerWidth - newLeft;
                const maxHeight = window.innerHeight - newTop;
                
                if (newLeft >= 0 && newTop >= 0 && 
                    newWidth <= maxWidth && newHeight <= maxHeight &&
                    newWidth >= 320) {
                    
                    player.style.width = newWidth + 'px';
                    player.style.height = newHeight + 'px';
                    player.style.left = newLeft + 'px';
                    player.style.top = newTop + 'px';

                    sizeIndicator.textContent = `${Math.round(newWidth)} × ${Math.round(newHeight)}`;

                    // Update state
                    const stream = state.streams.find(s => s.id === streamData.id);
                    if (stream) {
                        stream.width = newWidth;
                        stream.height = newHeight;
                        stream.x = newLeft;
                        stream.y = newTop;
                    }
                }
            }

            function onMouseUp() {
                state.isResizing = false;
                state.resizeHandle = null;
                state.activePlayer = null;
                player.classList.remove('resizing');
                sizeIndicator.classList.remove('show');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// ==================== Global Mouse Move/Up for Dragging ====================
document.addEventListener('mousemove', (e) => {
    if (state.isDragging && state.activePlayer) {
        const player = state.activePlayer;
        const newX = e.clientX - parseInt(getComputedStyle(player).width) / 2 + 
                     (parseInt(getComputedStyle(player).width) / 2 - e.clientX + player.offsetLeft);
        const newY = e.clientY - parseInt(getComputedStyle(player).height) / 2 +
                     (parseInt(getComputedStyle(player).height) / 2 - e.clientY + player.offsetTop);
        
        // Simple calculation based on mouse position
        const rect = player.getBoundingClientRect();
        const offsetX = e.clientX - rect.left - rect.width / 2 + rect.width / 2;
        const offsetY = e.clientY - rect.top - rect.height / 2 + rect.height / 2;
        
        let finalX = e.clientX - (rect.width * 0.05); // Offset for move button position
        let finalY = e.clientY - (40 / 2); // Center on the move button
        
        // Use stored offset for accurate positioning
        const streamData = state.streams.find(s => s.id === player.id);
        if (streamData) {
            finalX = e.clientX - 32; // Approximate move button center from left
            finalY = e.clientY - 32; // Approximate move button center from top
        }

        // Boundary checking
        const maxX = window.innerWidth - player.offsetWidth;
        const maxY = window.innerHeight - player.offsetHeight;
        
        finalX = Math.max(0, Math.min(finalX, maxX));
        finalY = Math.max(0, Math.min(finalY, maxY));
        
        player.style.left = finalX + 'px';
        player.style.top = finalY + 'px';
        
        // Update state
        if (streamData) {
            streamData.x = finalX;
            streamData.y = finalY;
        }
    }
});

document.addEventListener('mouseup', () => {
    if (state.isDragging && state.activePlayer) {
        const player = state.activePlayer;
        const moveBtn = player.querySelector('.move-btn');
        
        player.classList.remove('dragging');
        moveBtn.classList.remove('dragging');
        
        state.isDragging = false;
        state.activePlayer = null;
    }
});

// ==================== Update Functions ====================
function updateStreamList() {
    streamCount.textContent = state.streams.length;
    streamItems.innerHTML = state.streams.map(stream => {
        const instanceText = stream.instance > 1 ? `#${stream.instance}` : '';
        return `
            <div class="stream-item">
                <div class="avatar">${stream.channel[0].toUpperCase()}</div>
                <div class="info">
                    <span class="name">${stream.channel}</span>
                    ${instanceText ? `<span class="instance">Instance ${instanceText}</span>` : ''}
                </div>
                <button class="remove-btn" onclick="removeStream('${stream.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    }).join('');
}

function updateEmptyState() {
    emptyState.style.display = state.streams.length === 0 ? 'block' : 'none';
}

// ==================== Event Listeners ====================
menuToggle.addEventListener('click', () => toggleMenu());
menuOverlay.addEventListener('click', () => toggleMenu(false));

// Shift key toggle
document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift' && !e.repeat) {
        toggleMenu();
    }
    if (e.key === 'Escape') {
        if (state.menuOpen) {
            toggleMenu(false);
        }
        // Also close any open delete confirmations
        document.querySelectorAll('.delete-confirm.show').forEach(confirm => {
            confirm.classList.remove('show');
            confirm.closest('.video-player').classList.remove('dragging');
        });
    }
});

// Add stream button
addBtn.addEventListener('click', () => {
    const channelName = extractChannelName(urlInput.value);
    if (addStream(channelName)) {
        urlInput.value = '';
    }
});

// Enter key in input
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const channelName = extractChannelName(urlInput.value);
        if (addStream(channelName)) {
            urlInput.value = '';
        }
    }
});

// Smart paste - auto close menu on paste
urlInput.addEventListener('paste', (e) => {
    setTimeout(() => {
        const channelName = extractChannelName(urlInput.value);
        if (addStream(channelName)) {
            urlInput.value = '';
            toggleMenu(false);
        }
    }, 100);
});

// Global paste anywhere on page
document.addEventListener('paste', (e) => {
    if (document.activeElement !== urlInput && !state.menuOpen) {
        const text = e.clipboardData.getData('text');
        const channelName = extractChannelName(text);
        if (channelName) {
            addStream(channelName);
        }
    }
});

// ==================== Initialize ====================
updateEmptyState();