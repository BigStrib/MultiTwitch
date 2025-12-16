document.addEventListener('DOMContentLoaded', () => {
    const streamInput = document.getElementById('stream-url-input');
    const addStreamBtn = document.getElementById('add-stream-btn');
    const videoCanvas = document.getElementById('video-canvas');
    let videoCount = 0;
    
    // Constant for 16:9 aspect ratio (Width / Height)
    const ASPECT_RATIO = 16 / 9; // 1.7777...
    const MIN_SIZE = 200; // Minimum width/height for resizing

    // --- 1. Function to create the Twitch Player container ---
    function createPlayerContainer(channelName) {
        videoCount++;
        const containerId = `twitch-embed-${videoCount}`;
        const playerId = `player-${videoCount}`;

        // Create the main draggable/resizable container
        const container = document.createElement('div');
        container.id = containerId;
        container.className = 'video-player-container';
        
        // Initial positioning to stack them neatly
        const offset = (videoCount - 1) * 20;
        container.style.top = `${50 + offset}px`;
        container.style.left = `${50 + offset}px`;

        // 1A. Controls Panel
        const controlsPanel = document.createElement('div');
        controlsPanel.className = 'controls-panel';
        
        // Close (X) Button - Triggers Confirmation
        const closeBtn = document.createElement('button');
        closeBtn.className = 'control-btn close-btn';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>'; 
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            showConfirmation(container, channelName);
        });

        // Move Button - Initiates Drag
        const moveBtn = document.createElement('button');
        moveBtn.className = 'control-btn move-btn';
        moveBtn.innerHTML = '<i class="fas fa-arrows-alt"></i>';
        moveBtn.addEventListener('mousedown', (e) => {
            e.stopPropagation(); 
            initiateDrag(container, e); 
        });

        controlsPanel.appendChild(moveBtn);
        controlsPanel.appendChild(closeBtn);

        // 1B. Create and add Resize Handles
        const handles = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        handles.forEach(position => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${position}`;
            
            // Initiate resize logic on handle mousedown
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation(); 
                initiateResize(container, e, position);
            });
            container.appendChild(handle);
        });

        // 1C. Player Div
        const playerDiv = document.createElement('div');
        playerDiv.id = playerId;

        // Assemble the final container
        container.appendChild(controlsPanel);
        container.appendChild(playerDiv);
        videoCanvas.appendChild(container);

        // 2. Embed the Twitch Player
        new Twitch.Player(playerId, {
            channel: channelName,
            width: '100%',
            height: '100%',
            // IMPORTANT: Replace this with your actual domain(s) for security
            parent: ["localhost", "127.0.0.1", window.location.hostname] 
        });
    }

    // --- 2. Confirmation Overlay Logic ---
    function showConfirmation(container, channelName) {
        // Check if an overlay already exists to prevent duplicates
        if (container.querySelector('.confirmation-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'confirmation-overlay';

        // Use template literals to construct the overlay HTML
        overlay.innerHTML = `
            <div class="confirmation-icon">
                <i class="fas fa-trash-alt"></i>
            </div>
            <div class="confirmation-message">
                Are you sure you want to remove <strong>${channelName}</strong>?
            </div>
            <div class="confirmation-buttons">
                <button class="confirm-remove-btn">
                    <i class="fas fa-check"></i> Yes, Remove
                </button>
                <button class="cancel-remove-btn">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        `;

        // Add event listeners to the new buttons
        overlay.querySelector('.confirm-remove-btn').addEventListener('click', () => {
            container.remove(); // Final removal action
        });

        overlay.querySelector('.cancel-remove-btn').addEventListener('click', () => {
            overlay.remove(); // Remove the overlay, leaving the stream intact
        });

        // Append the overlay to the video container
        container.appendChild(overlay);
    }

    // --- 3. Drag Logic (Initiated by the Move Button) ---
    function initiateDrag(element, startEvent) {
        let isDragging = true;
        
        // Calculate the initial offset
        const offsetX = startEvent.clientX - element.getBoundingClientRect().left;
        const offsetY = startEvent.clientY - element.getBoundingClientRect().top;
        
        const moveButton = element.querySelector('.move-btn');
        if (moveButton) { moveButton.classList.add('dragging'); }
        element.style.zIndex = 1000; 

        const onMouseMove = (moveEvent) => {
            if (!isDragging) return;
            // Update the element's position
            element.style.left = `${moveEvent.clientX - offsetX}px`;
            element.style.top = `${moveEvent.clientY - offsetY}px`;
        };

        const onMouseUp = () => {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            element.style.zIndex = 10;
            if (moveButton) { moveButton.classList.remove('dragging'); }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    // --- 4. Aspect-Ratio Locked Resizing Logic ---
    function initiateResize(element, startEvent, position) {
        let isResizing = true;
        
        // Get initial element properties
        const startX = startEvent.clientX;
        const startY = startEvent.clientY;
        const startWidth = element.offsetWidth;
        const startHeight = element.offsetHeight;
        const startLeft = element.offsetLeft;
        const startTop = element.offsetTop;
        
        element.style.zIndex = 1000; 

        const onMouseMove = (moveEvent) => {
            if (!isResizing) return;

            const deltaX = moveEvent.clientX - startX;
            const deltaY = moveEvent.clientY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;

            // Step 1: Calculate new dimensions based on mouse movement
            if (position.includes('right')) {
                newWidth = startWidth + deltaX;
            } else if (position.includes('left')) {
                newWidth = startWidth - deltaX;
                newLeft = startLeft + deltaX;
            }

            if (position.includes('bottom')) {
                newHeight = startHeight + deltaY;
            } else if (position.includes('top')) {
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
            }
            
            // Step 2: Enforcement and Aspect Ratio Maintenance

            // Determine the controlling dimension based on which handle is dragged
            let controllingDimension;
            if (position.includes('top') || position.includes('bottom')) {
                controllingDimension = 'height';
            } else {
                controllingDimension = 'width';
            }
            
            // Check for minimum size constraints
            if (newWidth < MIN_SIZE) {
                newWidth = MIN_SIZE;
                controllingDimension = 'width'; // Force width control if minimum hit
            }
            if (newHeight < MIN_SIZE / ASPECT_RATIO) {
                newHeight = MIN_SIZE / ASPECT_RATIO;
                controllingDimension = 'height'; // Force height control if minimum hit
            }
            
            // Recalculate based on the controlling dimension to maintain aspect ratio
            if (controllingDimension === 'width') {
                // Adjust Height to match Width
                const actualNewHeight = newWidth / ASPECT_RATIO;
                if (position.includes('top')) {
                    // Adjust Top position to keep bottom corner fixed
                    newTop = startTop + (startHeight - actualNewHeight);
                }
                newHeight = actualNewHeight;

            } else { // controllingDimension === 'height'
                // Adjust Width to match Height
                const actualNewWidth = newHeight * ASPECT_RATIO;
                if (position.includes('left')) {
                    // Adjust Left position to keep right corner fixed
                    newLeft = startLeft + (startWidth - actualNewWidth);
                }
                newWidth = actualNewWidth;
            }

            // Apply new calculated dimensions and positions
            element.style.width = `${newWidth}px`;
            element.style.height = `${newHeight}px`;
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;
        };

        const onMouseUp = () => {
            isResizing = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            element.style.zIndex = 10;
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    // --- 5. Event Listener for Adding Stream ---
    addStreamBtn.addEventListener('click', () => {
        const url = streamInput.value.trim();
        if (!url) return;

        // Simple parsing: Extracts channel name from URL or assumes direct channel name
        let channelName = url.split('/').pop().toLowerCase();
        
        if (channelName.startsWith('http')) {
             alert("Please enter a valid Twitch channel URL or name.");
             return;
        }

        createPlayerContainer(channelName);
        streamInput.value = ''; // Clear input after adding
    });

    // Allow pressing Enter in the input field
    streamInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addStreamBtn.click();
        }
    });
});