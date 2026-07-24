export function drawParticles(ctx, width, height, colors, rng, options = {}, interactive = null) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    const numParticles = options.num || 150;
    const maxDistance = Math.min(width, height) * 0.15;
    
    let particles;
    if (interactive && interactive.particles && interactive.particles.length > 0) {
        particles = interactive.particles;
        particles.forEach((p, i) => { p.color = colors.colors[i % colors.colors.length]; });
    } else {
        particles = [];
        for (let i = 0; i < numParticles; i++) {
            particles.push({
                x: rng() * width,
                y: rng() * height,
                radius: (rng() * 0.003 + 0.001) * Math.min(width, height),
                color: colors.colors[Math.floor(rng() * colors.colors.length)]
            });
        }
    }
    if (interactive) interactive.particles = particles;
    
    ctx.lineWidth = width * 0.0005;
    
    // Draw connections
    for (let i = 0; i < numParticles; i++) {
        for (let j = i + 1; j < numParticles; j++) {
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < maxDistance) {
                const alpha = 1 - (dist / maxDistance);
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                
                // Set color with dynamic alpha
                // Since color is hex, we can't easily add alpha without converting,
                // but we can set globalAlpha
                ctx.globalAlpha = alpha * 0.5;
                ctx.strokeStyle = particles[i].color;
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        }
    }
    
    // Draw particles
    for (let i = 0; i < numParticles; i++) {
        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].radius, 0, Math.PI * 2);
        ctx.fillStyle = particles[i].color;
        ctx.fill();
    }
}

export function getHitTarget(x, y, objects) {
    for (let i = 0; i < objects.length; i++) {
        const dx = x - objects[i].x;
        const dy = y - objects[i].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < objects[i].radius * 1.5) {
            return i;
        }
    }
    return -1;
}
