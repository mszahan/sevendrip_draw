/* ============================================
   SevenDrip Raffle Spinner — Script
   ============================================ */

(function () {
    'use strict';

    // --- DOM Elements ---
    const namesInput = document.getElementById('namesInput');
    const participantCount = document.getElementById('participantCount');
    const clearBtn = document.getElementById('clearBtn');
    const loadBtn = document.getElementById('loadBtn');
    const emptyState = document.getElementById('emptyState');
    const spinnerContainer = document.getElementById('spinnerContainer');
    const wheelCanvas = document.getElementById('wheelCanvas');
    const spinBtn = document.getElementById('spinBtn');
    const winnerModal = document.getElementById('winnerModal');
    const winnerNameEl = document.getElementById('winnerName');
    const spinAgainBtn = document.getElementById('spinAgainBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const confettiContainer = document.getElementById('confettiContainer');
    const bgParticles = document.getElementById('bgParticles');

    const ctx = wheelCanvas.getContext('2d');
    const CANVAS_SIZE = 500;
    const CENTER = CANVAS_SIZE / 2;
    const RADIUS = 230;

    // --- State ---
    let participants = [];
    let currentAngle = 0;
    let isSpinning = false;
    let tickAudio = null;

    // --- Color Palette for Wheel Segments ---
    const COLORS = [
        '#e94560', '#16213e', '#0f3460', '#533483',
        '#e94560', '#1a1a2e', '#2d3a8c', '#6a0572',
        '#c0392b', '#2c3e50', '#8e44ad', '#2980b9',
        '#d35400', '#1abc9c', '#e74c3c', '#3498db',
        '#9b59b6', '#e67e22', '#1abc9c', '#34495e',
    ];

    // --- Initialize Background Particles ---
    function initParticles() {
        for (let i = 0; i < 20; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            const size = Math.random() * 4 + 2;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 12 + 's';
            particle.style.animationDuration = (Math.random() * 8 + 8) + 's';
            bgParticles.appendChild(particle);
        }
    }

    // --- Parse Names from Textarea ---
    function parseNames(text) {
        return text
            .split('\n')
            .map(name => name.trim())
            .filter(name => name.length > 0);
    }

    // --- Update Participant Count ---
    function updateCount() {
        const names = parseNames(namesInput.value);
        participantCount.textContent = names.length;
    }

    // --- Draw the Wheel ---
    function drawWheel(angle) {
        const numSegments = participants.length;
        if (numSegments === 0) return;

        const arcSize = (2 * Math.PI) / numSegments;

        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.save();
        ctx.translate(CENTER, CENTER);
        ctx.rotate(angle);

        for (let i = 0; i < numSegments; i++) {
            const startAngle = i * arcSize;
            const endAngle = startAngle + arcSize;

            // Draw segment
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, RADIUS, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = COLORS[i % COLORS.length];
            ctx.fill();

            // Segment border
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Draw text
            ctx.save();
            ctx.rotate(startAngle + arcSize / 2);

            // Determine font size based on number of participants
            let fontSize;
            if (numSegments <= 12) fontSize = 13;
            else if (numSegments <= 24) fontSize = 11;
            else if (numSegments <= 50) fontSize = 9;
            else if (numSegments <= 80) fontSize = 7;
            else fontSize = 6;

            ctx.fillStyle = '#ffffff';
            ctx.font = `600 ${fontSize}px 'Inter', sans-serif`;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            // Truncate long names
            let name = participants[i];
            const maxWidth = RADIUS - 50;
            while (ctx.measureText(name).width > maxWidth && name.length > 0) {
                name = name.slice(0, -1);
            }
            if (name !== participants[i]) name += '…';

            ctx.fillText(name, RADIUS - 18, 0);
            ctx.restore();
        }

        // Outer ring decoration
        ctx.beginPath();
        ctx.arc(0, 0, RADIUS + 2, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Tick marks
        for (let i = 0; i < numSegments; i++) {
            const tickAngle = i * arcSize;
            ctx.beginPath();
            ctx.moveTo(
                Math.cos(tickAngle) * (RADIUS - 4),
                Math.sin(tickAngle) * (RADIUS - 4)
            );
            ctx.lineTo(
                Math.cos(tickAngle) * (RADIUS + 2),
                Math.sin(tickAngle) * (RADIUS + 2)
            );
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        ctx.restore();
    }

    // --- Load Spinner ---
    function loadSpinner() {
        const names = parseNames(namesInput.value);
        if (names.length < 2) {
            namesInput.focus();
            namesInput.style.borderColor = '#e94560';
            setTimeout(() => {
                namesInput.style.borderColor = '';
            }, 1500);
            return;
        }

        participants = names;
        updateCount();
        emptyState.style.display = 'none';
        spinnerContainer.style.display = 'flex';
        currentAngle = 0;
        drawWheel(currentAngle);
    }

    // --- Create Tick Sound via Web Audio API ---
    function createTickSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.05);

            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.05);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.05);
        } catch (e) {
            // Audio not supported, silently continue
        }
    }

    // --- Determine Winner from Angle ---
    function getWinnerIndex(angle) {
        const numSegments = participants.length;
        const arcSize = (2 * Math.PI) / numSegments;

        // The pointer is at the top (–π/2 or 3π/2).
        // Normalize to find which segment is at the pointer.
        const pointerAngle = (3 * Math.PI / 2);
        let normalizedAngle = (pointerAngle - angle) % (2 * Math.PI);
        if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

        const index = Math.floor(normalizedAngle / arcSize) % numSegments;
        return index;
    }

    // --- Spin the Wheel ---
    function spin() {
        if (isSpinning || participants.length === 0) return;

        isSpinning = true;
        spinBtn.disabled = true;
        spinBtn.querySelector('.spin-btn-text').textContent = 'SPINNING...';
        spinBtn.querySelector('.spin-btn-subtitle').textContent = 'Good luck!';
        spinnerContainer.parentElement.classList.add('spinning');

        // Calculate spin parameters
        const totalRotations = 10 + Math.random() * 5; // 10-15 full rotations
        const totalAngle = totalRotations * 2 * Math.PI + Math.random() * 2 * Math.PI;
        const duration = 5000 + Math.random() * 2000; // 5-7 seconds
        const startTime = performance.now();
        const startAngle = currentAngle;

        // Track segment changes for tick sound
        let lastSegmentIndex = -1;

        function easeOutCubic(t) {
            return 1 - Math.pow(1 - t, 4);
        }

        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeOutCubic(progress);

            currentAngle = startAngle + totalAngle * easedProgress;
            drawWheel(currentAngle);

            // Tick sound on segment change
            const currentSegment = getWinnerIndex(currentAngle);
            if (currentSegment !== lastSegmentIndex) {
                lastSegmentIndex = currentSegment;
                if (progress < 0.9) {
                    createTickSound();
                    // Pointer tick animation
                    const pointer = document.querySelector('.wheel-pointer');
                    pointer.classList.remove('ticking');
                    void pointer.offsetWidth; // force reflow
                    pointer.classList.add('ticking');
                }
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Spin complete
                isSpinning = false;
                spinBtn.disabled = false;
                spinBtn.querySelector('.spin-btn-text').textContent = 'SPIN';
                spinBtn.querySelector('.spin-btn-subtitle').textContent = 'Click to draw a winner';
                spinnerContainer.parentElement.classList.remove('spinning');

                const winnerIndex = getWinnerIndex(currentAngle);
                const winner = participants[winnerIndex];

                // Show winner with a slight delay for dramatic effect
                setTimeout(() => showWinner(winner), 400);
            }
        }

        requestAnimationFrame(animate);
    }

    // --- Show Winner Modal ---
    function showWinner(name) {
        winnerNameEl.textContent = name;
        winnerModal.classList.add('active');
        spawnConfetti();
        playWinSound();
    }

    // --- Play Win Sound ---
    function playWinSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

            notes.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);
                gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.15);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.15 + 0.4);
                osc.start(audioCtx.currentTime + i * 0.15);
                osc.stop(audioCtx.currentTime + i * 0.15 + 0.4);
            });
        } catch (e) {
            // Audio not supported
        }
    }

    // --- Spawn Confetti ---
    function spawnConfetti() {
        confettiContainer.innerHTML = '';
        const colors = ['#e94560', '#ffd700', '#3498db', '#2ecc71', '#9b59b6', '#e67e22', '#1abc9c', '#fff'];

        for (let i = 0; i < 80; i++) {
            const piece = document.createElement('div');
            piece.className = 'confetti-piece';
            piece.style.left = Math.random() * 100 + '%';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.animationDelay = Math.random() * 1.5 + 's';
            piece.style.animationDuration = (Math.random() * 2 + 2) + 's';
            piece.style.width = (Math.random() * 8 + 4) + 'px';
            piece.style.height = (Math.random() * 8 + 4) + 'px';
            piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            confettiContainer.appendChild(piece);
        }
    }

    // --- Close Modal ---
    function closeModal() {
        winnerModal.classList.remove('active');
    }

    // --- Event Listeners ---
    namesInput.addEventListener('input', () => {
        updateCount();
        // Auto-load spinner when names are pasted
        const names = parseNames(namesInput.value);
        if (names.length >= 2) {
            participants = names;
            emptyState.style.display = 'none';
            spinnerContainer.style.display = 'flex';
            currentAngle = 0;
            drawWheel(currentAngle);
        }
    });

    clearBtn.addEventListener('click', () => {
        namesInput.value = '';
        participants = [];
        updateCount();
        emptyState.style.display = 'flex';
        spinnerContainer.style.display = 'none';
    });

    loadBtn.addEventListener('click', loadSpinner);

    spinBtn.addEventListener('click', spin);

    spinAgainBtn.addEventListener('click', () => {
        closeModal();
        setTimeout(spin, 300);
    });

    closeModalBtn.addEventListener('click', closeModal);

    winnerModal.addEventListener('click', (e) => {
        if (e.target === winnerModal) closeModal();
    });

    // Keyboard: Enter to spin when spinner is visible
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !isSpinning && participants.length > 0 && document.activeElement !== namesInput) {
            spin();
        }
        if (e.key === 'Escape') {
            closeModal();
        }
    });

    // --- Init ---
    initParticles();
    updateCount();

})();

