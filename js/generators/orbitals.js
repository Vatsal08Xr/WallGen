export function drawOrbitals(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    
    const numOrbits = 35;
    const maxRadius = Math.max(width, height) * 0.7;
    const baseDim = Math.max(width, height);
    
    for (let i = 0; i < numOrbits; i++) {
        const radius = (rng() * 0.9 + 0.1) * maxRadius;
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        
        ctx.strokeStyle = color;
        ctx.lineWidth = baseDim * 0.001;
        
        const isFull = rng() > 0.6;
        const startAngle = rng() * Math.PI * 2;
        const extent = isFull ? Math.PI * 2 : (rng() * Math.PI + Math.PI/4);
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, startAngle + extent);
        ctx.stroke();
        
        // Orbital body
        if (rng() > 0.4) {
            const angle = startAngle + rng() * extent;
            const px = cx + Math.cos(angle) * radius;
            const py = cy + Math.sin(angle) * radius;
            
            ctx.fillStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
            ctx.beginPath();
            ctx.arc(px, py, baseDim * 0.002 * (rng() * 3 + 1), 0, Math.PI * 2);
            ctx.fill();
            
            // Subtle glow/halo
            if (rng() > 0.6) {
                ctx.strokeStyle = ctx.fillStyle;
                ctx.globalAlpha = 0.3;
                ctx.beginPath();
                ctx.arc(px, py, baseDim * 0.006 * (rng() * 2 + 1), 0, Math.PI * 2);
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }
    }
    
    // Core/Sun
    ctx.fillStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
    ctx.beginPath();
    ctx.arc(cx, cy, baseDim * 0.015, 0, Math.PI * 2);
    ctx.fill();
}
