import Delaunator from 'https://esm.sh/delaunator@5.0.0';

export function drawVoronoi(ctx, width, height, colors, rng) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    
    const baseDim = Math.max(width, height);
    
    // Scale number of points proportionally with the screen area to keep density consistent
    const areaRatio = (width * height) / (baseDim * baseDim);
    const numPoints = Math.round(150 * areaRatio * 1.5);
    const points = [];
    
    for (let i = 0; i < numPoints; i++) {
        points.push([rng() * width, rng() * height]);
    }
    
    // Add points outside the canvas to fill the edges properly
    const pad = baseDim * 0.2;
    points.push([-pad, -pad], [width/2, -pad], [width + pad, -pad]);
    points.push([-pad, height/2], [width + pad, height/2]);
    points.push([-pad, height + pad], [width/2, height + pad], [width + pad, height + pad]);
    
    const delaunay = Delaunator.from(points);
    const triangles = delaunay.triangles;
    
    // Slight line width to cover gaps between triangles
    ctx.lineWidth = baseDim * 0.001;
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
        
        const color = colors.colors[Math.floor(rng() * colors.colors.length)];
        ctx.fillStyle = color;
        ctx.fill();
        
        // Stroke with the same color to avoid antialiasing gaps
        ctx.strokeStyle = color;
        ctx.stroke();
    }
}
