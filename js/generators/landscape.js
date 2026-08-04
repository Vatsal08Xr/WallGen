import { createNoise2D } from 'https://esm.sh/simplex-noise@4.0.1';

export function drawLandscape(ctx, width, height, colors, rng, options, interactive = null) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const noise2D = createNoise2D(rng);
    
    const baseDim = Math.max(width, height);
    
    // Draw sun/moon
    const sunColor = colors.colors[Math.floor(rng() * colors.colors.length)];
    ctx.fillStyle = sunColor;
    ctx.beginPath();
    
    const sunRadius = baseDim * 0.08;
    let sunX, sunY;
    if (interactive && interactive.sun) {
        sunX = interactive.sun.x;
        sunY = interactive.sun.y;
    } else {
        sunX = width * 0.5;
        sunY = height * 0.3;
    }
    if (interactive) interactive.sun = { x: sunX, y: sunY, radius: sunRadius };
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();

    const numLayers = 6;
    for (let i = 0; i < numLayers; i++) {
        const color = colors.colors[i % colors.colors.length];
        ctx.fillStyle = color;
        
        ctx.beginPath();
        ctx.moveTo(0, height);
        
        // Layers progress downwards
        const yBase = height * 0.45 + (height * 0.5) * (i / (numLayers - 1));
        const noiseScale = 0.002 * (1 + i * 0.3) * (1920 / baseDim);
        const noiseHeight = baseDim * (0.08 - i * 0.008);

        for (let x = -10; x <= width + 10; x += baseDim * 0.01) {
            // Add multi-scale noise for jagged mountains in background, smooth hills in foreground
            let n = noise2D(x * noiseScale, i * 100);
            if (i < 3) {
                n += noise2D(x * noiseScale * 4, i * 100) * 0.2;
            }
            
            const y = yBase + n * noiseHeight;
            ctx.lineTo(x, y);
        }
        
        ctx.lineTo(width, height);
        ctx.closePath();
        
        // Atmospheric perspective
        ctx.globalAlpha = 0.6 + (i / numLayers) * 0.4;
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }
}

export function getHitTarget(x, y, objects) {
    if (!objects || !objects.sun) return null;
    const dx = x - objects.sun.x;
    const dy = y - objects.sun.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < objects.sun.radius) {
        return 'sun';
    }
    return null;
}
