export function initBackground() {
  const canvas = document.getElementById('ai-net-bg');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, nodes = [];
  const NODE_COUNT = 34;
  const LINK_DIST = 150;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  
  function makeNodes() {
    nodes = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.28,
      vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 1.6 + 1,
      pulse: Math.random() * Math.PI * 2
    }));
  }
  
  function step() {
    ctx.clearRect(0, 0, W, H);
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += 0.02;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    // Synapse lines between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          ctx.strokeStyle = `rgba(94,234,212,${(1 - dist / LINK_DIST) * 0.18})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // Nodes gently pulsing like little AI synapses
    nodes.forEach(n => {
      const glow = (Math.sin(n.pulse) + 1) / 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + glow * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(139,124,246,${0.25 + glow * 0.35})`;
      ctx.fill();
    });
    requestAnimationFrame(step);
  }

  resize();
  makeNodes();
  requestAnimationFrame(step);
  window.addEventListener('resize', () => {
    resize();
    makeNodes();
  });
}
