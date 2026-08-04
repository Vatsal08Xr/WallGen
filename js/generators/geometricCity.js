export function drawGeometricCity(ctx, width, height, colors, rng, options, interactive = null) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const baseDim = Math.max(width, height);
    
    // Scale number of buildings proportionally to width so they don't get squished on mobile
    const numBuildings = Math.round(60 * (width / baseDim));
    const padding = baseDim * 0.02;
    const maxW = (baseDim - padding * 2) / (60 * 0.5);

    // Draw background sun/moon
    ctx.fillStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    
    // Always consume rng() to keep the procedural generation sequence in sync for the buildings
    const genSunX = width * (rng() * 0.6 + 0.2);
    
    let sunX, sunY, sunRadius;
    if (interactive && interactive.sun) {
        sunX = interactive.sun.x;
        sunY = interactive.sun.y;
        sunRadius = interactive.sun.radius;
    } else {
        sunX = genSunX;
        sunY = height * 0.4;
        sunRadius = baseDim * 0.15; // 0.27 of min(w,h) is roughly 0.15 of max(w,h)
        if (interactive) {
            interactive.sun = { x: sunX, y: sunY, radius: sunRadius };
        }
    }
    
    ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // Draw buildings from back to front (based on height roughly)
    const buildings = [];
    for (let i = 0; i < numBuildings; i++) {
        buildings.push({
            x: padding + (rng() * (width - padding * 2)),
            w: maxW * (rng() * 1.5 + 0.5),
            h: height * (rng() * rng() * 0.7 + 0.1), // more short buildings, some tall
            colorIndex: Math.floor(rng() * colors.colors.length)
        });
    }
    
    // Sort by height descending so taller buildings are in back
    buildings.sort((a, b) => b.h - a.h);

    for (const b of buildings) {
        const y = height - b.h;
        
        ctx.fillStyle = colors.colors[b.colorIndex];
        ctx.fillRect(b.x, y, b.w, b.h);
        
        // Darken side
        ctx.fillStyle = colors.bg;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(b.x + b.w * 0.6, y, b.w * 0.4, b.h);
        ctx.globalAlpha = 1.0;
        
        // Building outline
        ctx.strokeStyle = colors.bg;
        ctx.lineWidth = baseDim * 0.001;
        ctx.strokeRect(b.x, y, b.w, b.h);
        
        // Windows
        if (rng() > 0.3 && b.w > baseDim * 0.01) {
            ctx.fillStyle = colors.bg;
            ctx.globalAlpha = 0.8;
            const rows = Math.floor(b.h / (baseDim * 0.015));
            const cols = 2;
            const wPadding = b.w * 0.15;
            const windowW = (b.w - wPadding * 3) / 2;
            const windowH = baseDim * 0.005;
            
            for (let r = 1; r < rows; r++) {
                if (rng() > 0.3) {
                    ctx.fillRect(b.x + wPadding, y + r * (baseDim * 0.015), windowW, windowH);
                }
                if (rng() > 0.3) {
                    ctx.fillRect(b.x + wPadding * 2 + windowW, y + r * (baseDim * 0.015), windowW, windowH);
                }
            }
            ctx.globalAlpha = 1.0;
        }
    }
}

export function getHitTarget(x, y, objects) {
    if (objects.sun) {
        const dx = x - objects.sun.x;
        const dy = y - objects.sun.y;
        if (Math.sqrt(dx*dx + dy*dy) <= objects.sun.radius) {
            return { id: 'sun', type: 'sun', cursor: 'grab' };
        }
    }
    return null;
}
