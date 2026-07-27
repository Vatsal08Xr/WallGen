import { createNoise3D } from 'https://esm.sh/simplex-noise@4.0.1';

export function drawSilkWaves(ctx, width, height, colors, rng) {
    // Fill background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const noise3D = createNoise3D(rng);
    
    // Scale noise based on canvas size for consistent swirling
    const noiseScale = 0.002 * (1000 / Math.max(width, height));
    const zOffset = rng() * 100;
    
    // Number of paths controls density
    // Reduce slightly on mobile for performance while keeping it dense
    const isMobile = Math.max(width, height) < 800;
    const numPaths = isMobile ? 1500 : 3000;
    
    const paths = [];
    const maxSteps = 80;
    const stepSize = Math.max(width, height) * 0.005;
    
    // Generate all paths first
    for (let i = 0; i < numPaths; i++) {
        let x = rng() * width * 1.2 - width * 0.1; // seed slightly outside canvas
        let y = rng() * height * 1.2 - height * 0.1;
        
        const path = [];
        path.push({ x, y });
        
        for (let j = 0; j < maxSteps; j++) {
            // Strong angular multiplier (Math.PI * 6) forces deep, tight swirling
            const angle = noise3D(x * noiseScale, y * noiseScale, zOffset) * Math.PI * 6;
            x += Math.cos(angle) * stepSize;
            y += Math.sin(angle) * stepSize;
            path.push({ x, y });
            
            // Stop early if well outside bounds
            if (x < -width*0.2 || x > width*1.2 || y < -height*0.2 || y > height*1.2) break;
        }
        
        // Randomize width for organic variety (some thick ribbons, some thin threads)
        const baseWidth = (rng() * 0.015 + 0.002) * Math.max(width, height);
        
        // Pick an accent color
        const accentHex = colors.colors[Math.floor(rng() * colors.colors.length)];
        
        paths.push({ vertices: path, baseWidth, accentHex });
    }
    
    // Sort paths by length so shorter ones (details) tend to sit on top of longer sweeps
    // Or just random order is fine too since they all overlap organically. 
    // We'll shuffle them slightly to avoid clumps from the generation loop.
    paths.sort(() => rng() - 0.5);

    // Color mixing helpers
    function mix(hex1, hex2, ratio) {
        if (!hex1) hex1 = '#000000';
        if (!hex2) hex2 = '#ffffff';
        if (hex1.length === 9) hex1 = hex1.substring(0, 7);
        if (hex2.length === 9) hex2 = hex2.substring(0, 7);
        const r1 = parseInt(hex1.slice(1,3), 16) || 0, g1 = parseInt(hex1.slice(3,5), 16) || 0, b1 = parseInt(hex1.slice(5,7), 16) || 0;
        const r2 = parseInt(hex2.slice(1,3), 16) || 0, g2 = parseInt(hex2.slice(3,5), 16) || 0, b2 = parseInt(hex2.slice(5,7), 16) || 0;
        return `rgb(${Math.round(r1 + (r2-r1)*ratio)}, ${Math.round(g1 + (g2-g1)*ratio)}, ${Math.round(b1 + (b2-b1)*ratio)})`;
    }
    
    // Check if background is light or dark to adjust shadows/highlights
    const bgR = parseInt(colors.bg.slice(1,3), 16) || 0;
    const bgG = parseInt(colors.bg.slice(3,5), 16) || 0;
    const bgB = parseInt(colors.bg.slice(5,7), 16) || 0;
    const isLightMode = (bgR * 0.299 + bgG * 0.587 + bgB * 0.114) > 186;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw passes
    for (const pathObj of paths) {
        const { vertices, baseWidth, accentHex } = pathObj;
        if (vertices.length < 2) continue;
        
        // Define path once per ribbon
        ctx.beginPath();
        ctx.moveTo(vertices[0].x, vertices[0].y);
        for (let i = 1; i < vertices.length; i++) {
            // Smooth curve through points
            const curr = vertices[i];
            const prev = vertices[i-1];
            const mx = (prev.x + curr.x) / 2;
            const my = (prev.y + curr.y) / 2;
            ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
        }
        // Connect to last point
        ctx.lineTo(vertices[vertices.length-1].x, vertices[vertices.length-1].y);
        
        // 1. Base shape with heavy drop shadow (Deep 3D effect)
        ctx.shadowColor = isLightMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = baseWidth * 1.5;
        ctx.shadowOffsetX = baseWidth * 0.2;
        ctx.shadowOffsetY = baseWidth * 0.2;
        
        ctx.lineWidth = baseWidth;
        // Base color is mostly background to blend, slightly tinted by accent
        ctx.strokeStyle = mix(colors.bg, accentHex, 0.15);
        ctx.stroke();
        
        // Clear shadow for subsequent layers
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // 2. Mid-tone body (adds color and rounds the shape)
        ctx.lineWidth = baseWidth * 0.6;
        ctx.strokeStyle = mix(colors.bg, accentHex, 0.4);
        ctx.stroke();
        
        // 3. Highlight ridge (creates the sharp, folded ribbon edge)
        // Offset slightly to simulate directional lighting
        const offset = baseWidth * 0.15;
        ctx.translate(-offset, -offset);
        ctx.lineWidth = baseWidth * 0.15;
        ctx.strokeStyle = isLightMode ? mix(accentHex, '#ffffff', 0.4) : mix(accentHex, '#ffffff', 0.25);
        ctx.stroke();
        ctx.translate(offset, offset);
    }
}
