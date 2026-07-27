// Tiny, dependency-free confetti/hearts burst used by the "Chat Bubble
// Animations" GENZ Exclusive mod. Previously this mod only toggled a CSS
// class ('bubble-animations') on <body> that had no matching styles
// anywhere in the project, so turning it on visibly did nothing. This
// creates real floating particles anchored to wherever the user just sent
// a message from.

const PARTICLES = ['🎉', '💖', '✨', '💕', '🔥', '💫'];
let stylesInjected = false;

const ensureStyles = () => {
  if (stylesInjected || typeof document === 'undefined') return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.id = 'genz-bubble-burst-style';
  style.textContent = `
    @keyframes genzBubbleBurstFloat {
      0% { transform: translate(0, 0) scale(0.6) rotate(0deg); opacity: 0; }
      15% { opacity: 1; }
      100% { transform: translate(var(--genz-burst-x, 0px), -120px) scale(1.15) rotate(var(--genz-burst-rot, 20deg)); opacity: 0; }
    }
    .genz-bubble-burst-particle {
      position: fixed;
      pointer-events: none;
      z-index: 9999;
      font-size: 20px;
      will-change: transform, opacity;
      animation: genzBubbleBurstFloat 900ms ease-out forwards;
    }
  `;
  document.head.appendChild(style);
};

export const spawnBubbleBurst = (anchorEl) => {
  if (typeof document === 'undefined') return;
  ensureStyles();

  const rect = anchorEl?.getBoundingClientRect?.() || {
    left: window.innerWidth - 60,
    top: window.innerHeight - 100,
    width: 40,
    height: 40,
  };
  const originX = rect.left + rect.width / 2;
  const originY = rect.top + rect.height / 2;

  const count = 6;
  for (let i = 0; i < count; i += 1) {
    const el = document.createElement('span');
    el.className = 'genz-bubble-burst-particle';
    el.textContent = PARTICLES[Math.floor(Math.random() * PARTICLES.length)];
    el.style.left = `${originX}px`;
    el.style.top = `${originY}px`;
    const drift = (Math.random() - 0.5) * 90;
    const rotate = (Math.random() - 0.5) * 60;
    el.style.setProperty('--genz-burst-x', `${drift}px`);
    el.style.setProperty('--genz-burst-rot', `${rotate}deg`);
    el.style.animationDelay = `${i * 25}ms`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
  }
};
