export function drawWaveInterference(ctx, width, height, colors, rng, options = {}, interactive = null) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    const baseDim = Math.max(width, height);
    const numWaves = options.num !== undefined ? options.num : Math.max(8, Math.round(45 * height / 1920));
    
    // Fallback if thick not provided is ~4 for 1920 width, so we set default userThick to 2.
    const userThick = options.thick !== undefined ? options.thick : 2;
    
    let waves = [];

    if (interactive && interactive.waves && interactive.waves.length > 0) {
        waves = interactive.waves;
        waves.forEach((w, i) => { w.color = colors.colors[i % colors.colors.length]; });
    } else {
        const exactThickCount = Math.min(numWaves, Math.floor(rng() * 2) + 2); // 2 or 3 waves
        const exactThickIndices = new Set();
        while (exactThickIndices.size < exactThickCount) {
            exactThickIndices.add(Math.floor(rng() * numWaves));
        }
        
        for (let i = 0; i < numWaves; i++) {
            const color = colors.colors[Math.floor(rng() * colors.colors.length)];
            
            let waveThick = userThick;
            if (!exactThickIndices.has(i)) {
                // 1-2% less in random
                const reduction = 0.01 + rng() * 0.01;
                waveThick = userThick * (1 - reduction);
            }
            
            const yCenter = (height * 0.1) + (rng() * height * 0.8);
            const ampScale = options.amp !== undefined ? options.amp / 100 : 1.0;
            const amplitude = (rng() * 0.15 + 0.03) * baseDim * ampScale;
            // Adjust frequency slightly based on aspect ratio to keep waves visually similar
            const frequency = (rng() * 1.5 + 0.5) * 0.01 * (1920 / baseDim);
            const phase = rng() * Math.PI * 2;
            
            waves.push({ yCenter, amplitude, frequency, phase, color, waveThick, xOffset: 0 });
        }
    }

    if (interactive) interactive.waves = waves;

    // Draw waves
    for (let i = 0; i < waves.length; i++) {
        const w = waves[i];
        ctx.strokeStyle = w.color;
        ctx.lineWidth = Math.max(1, w.waveThick * (baseDim / 1920));
        
        ctx.beginPath();
        let started = false;
        
        for (let x = -width * 0.05; x <= width * 1.05; x += baseDim * 0.005) {
            const shiftedX = x - (w.xOffset || 0);
            const y = w.yCenter + 
                      Math.sin(shiftedX * w.frequency + w.phase) * w.amplitude + 
                      Math.cos(shiftedX * w.frequency * 0.4 + w.phase) * (w.amplitude * 0.4);
                      
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.stroke();
    }
}

export function getHitTarget(x, y, objects) {
    for (let i = 0; i < objects.length; i++) {
        const w = objects[i];
        const shiftedX = x - (w.xOffset || 0);
        const waveY = w.yCenter + 
                      Math.sin(shiftedX * w.frequency + w.phase) * w.amplitude + 
                      Math.cos(shiftedX * w.frequency * 0.4 + w.phase) * (w.amplitude * 0.4);
        if (Math.abs(y - waveY) < 20) {
            return i;
        }
    }
    return -1;
}
