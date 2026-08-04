import { createNoise3D } from 'https://esm.sh/simplex-noise@4.0.1';

export function drawFlowField(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const baseDim = Math.max(width, height);
    const noise3D = createNoise3D(rng);
    const numParticles = 2500;
    const maxSteps = 120;
    const scale = 0.0015 * (1920 / baseDim);
    const stepSize = baseDim * 0.003;

    ctx.lineWidth = baseDim * 0.001;
    ctx.lineCap = 'round';
    
    // Draw subtle gradient background overlay to frame the flow
    const grad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, colors.bg);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    const zOffset = rng() * 100;

    for (let i = 0; i < numParticles; i++) {
        let x = rng() * width;
        let y = rng() * height;
        
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        ctx.strokeStyle = color;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
        
        for (let j = 0; j < maxSteps; j++) {
            const angle = noise3D(x * scale, y * scale, zOffset) * Math.PI * 4;
            x += Math.cos(angle) * stepSize;
            y += Math.sin(angle) * stepSize;
            
            ctx.lineTo(x, y);
            
            if (x < -50 || x > width + 50 || y < -50 || y > height + 50) break;
        }
        ctx.stroke();
    }
}
