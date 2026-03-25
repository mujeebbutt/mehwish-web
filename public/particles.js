// public/particles.js
(function () {
    const style = document.createElement('style');
    style.textContent = `
        .student-particle {
            position: fixed;
            pointer-events: none;
            color: #00A3C1;
            opacity: 0.05;
            z-index: -10;
            user-select: none;
            animation: floatUp linear infinite;
        }
        @keyframes floatUp {
            0% { transform: translateY(110vh) rotate(0deg) scale(0.8); opacity: 0; }
            10% { opacity: 0.05; }
            90% { opacity: 0.05; }
            100% { transform: translateY(-10vh) rotate(360deg) scale(1.2); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // geometry, pencil, scale, rubber, etc.
    const icons = ['architecture', 'straighten', 'edit', 'ink_eraser', 'functions', 'calculate', 'change_history', 'square', 'circle', 'palette'];
    const numParticles = 12;

    for (let i = 0; i < numParticles; i++) {
        const span = document.createElement('span');
        span.className = 'material-symbols-outlined student-particle';
        span.textContent = icons[Math.floor(Math.random() * icons.length)];

        // Large, blending background elements
        const size = Math.random() * 180 + 100; // 100px to 280px
        const left = Math.random() * 100; // 0% to 100%
        const duration = Math.random() * 40 + 30; // 30s to 70s
        const delay = Math.random() * -70; // Start at different times

        span.style.fontSize = `${size}px`;
        span.style.left = `${left}vw`;
        span.style.animationDuration = `${duration}s`;
        span.style.animationDelay = `${delay}s`;

        document.body.appendChild(span);
    }
})();
