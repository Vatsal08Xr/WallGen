import Delaunator from 'https://esm.sh/delaunator@5.0.0';

export function drawCrystals(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const numPoints = 150;
    const points = [];
    
    // Add boundary points along edges and corners to guarantee full canvas coverage
    const margin = -10; // slight bleed past edges
    // Corners
    points.push([margin, margin], [width - margin, margin], [margin, height - margin], [width - margin, height - margin]);
    // Edge points
    const edgeSteps = 8;
    for (let i = 0; i <= edgeSteps; i++) {
        const t = i / edgeSteps;
        points.push([t * width, margin]);          // top
        points.push([t * width, height - margin]); // bottom
        points.push([margin, t * height]);          // left
        points.push([width - margin, t * height]);  // right
    }
    
    // Cluster points around center (original style) to reduce packing at edges
    for (let i = 0; i < numPoints; i++) {
        const angle = rng() * Math.PI * 2;
        const radius = Math.pow(rng(), 1.5) * Math.max(width, height) * 0.6;
        points.push([width/2 + Math.cos(angle) * radius, height/2 + Math.sin(angle) * radius]);
    }

    const delaunay = Delaunator.from(points);
    const triangles = delaunay.triangles;
    
    ctx.lineWidth = width * 0.001;
    ctx.lineJoin = 'round';

    for (let i = 0; i < triangles.length; i += 3) {
        const p0 = points[triangles[i]];
        const p1 = points[triangles[i + 1]];
        const p2 = points[triangles[i + 2]];
        
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        
        const cx = (p0[0] + p1[0] + p2[0]) / 3;
        const cy = (p0[1] + p1[1] + p2[1]) / 3;
        
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        
        const grad = ctx.createLinearGradient(p0[0], p0[1], cx, cy);
        grad.addColorStop(0, color);
        // Slightly fade to bg to simulate faceted lighting
        
        // Convert hex to semi-transparent
        function hexToRgba(hex, alpha) {
            if (hex.length === 9) hex = hex.substring(0, 7);
            const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return `rgba(${r},${g},${b},${alpha})`;
        }
        
        grad.addColorStop(1, hexToRgba(colors.bg, 0.4));
        
        ctx.fillStyle = grad;
        ctx.fill();
        
        ctx.strokeStyle = colors.colors[Math.floor(rng() * colors.colors.length)];
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
    }
}
