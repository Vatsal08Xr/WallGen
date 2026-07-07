import { createNoise3D } from 'https://esm.sh/simplex-noise@4.0.1';

export function drawNebula(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const noise3D = createNoise3D(rng);
    
    // Reduce number of clouds slightly for performance, radial gradient is rich enough
    const numClouds = 150; 
    
    function isLightColor(hex) {
        if (!hex) return true;
        if (hex.length === 9) hex = hex.substring(0, 7);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        if (!result) return true;
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) > 128;
    }
    
    const isLightBg = isLightColor(colors.bg);
    ctx.globalCompositeOperation = isLightBg ? 'multiply' : 'screen';
    
    const zOffset = rng() * 100;
    
    function hexToRgba(hex, alpha) {
        if (!hex) return `rgba(255,255,255,${alpha})`;
        if (hex.length === 9) hex = hex.substring(0, 7);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})` : `rgba(255,255,255,${alpha})`;
    }
    
    for (let i = 0; i < numClouds; i++) {
        const x = rng() * width;
        const y = rng() * height;
        
        const n = noise3D(x * 0.0015, y * 0.0015, zOffset);
        
        if (n > -0.3) {
            // Using a circular radius instead of ellipse to perfectly use createRadialGradient
            const radius = Math.max(width * 0.1, n * width * 0.4);
            
            const colorIndex = Math.floor((n + 1) * 0.5 * colors.colors.length);
            const color = colors.colors[Math.min(colorIndex, colors.colors.length - 1)];
            
            // Create a soft, fuzzy gradient instead of relying on expensive ctx.filter = blur()
            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, hexToRgba(color, 0.25));
            grad.addColorStop(0.4, hexToRgba(color, 0.1));
            grad.addColorStop(1, hexToRgba(color, 0));
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    ctx.globalCompositeOperation = 'source-over';
    
    // Draw starfield
    const numStars = 600;
    ctx.fillStyle = isLightBg ? '#000000' : '#ffffff';
    for (let i=0; i<numStars; i++) {
        if(rng() > 0.3) continue;
        ctx.beginPath();
        ctx.globalAlpha = rng() * 0.7 + 0.1;
        ctx.arc(rng()*width, rng()*height, rng() * rng() * width * 0.0008 + 0.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1.0;
}
