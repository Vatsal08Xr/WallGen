export function generate(ctx, width, height, colors, rng, options = {}, interactive = null) {
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    const numSquares = options.squares !== undefined ? options.squares : 20;
    const numTriangles = options.triangles !== undefined ? options.triangles : 20;
    const numCircles = options.circles !== undefined ? options.circles : 50;
    const sizeScale = (options.size !== undefined ? options.size : 100) / 100;
    const userThick = options.thick !== undefined ? options.thick : 2;
    const fill = options.fill || false;
    const connect = options.connect || false;

    let shapes = [];

    if (interactive && interactive.shapes && interactive.shapes.length > 0) {
        shapes = interactive.shapes;
        shapes.forEach((s, i) => { s.color = colors.colors[i % colors.colors.length]; });
    } else {
        const totalShapes = numSquares + numTriangles + numCircles;
        const exactSizeIndices = new Set();
        const exactThickIndices = new Set();
        for (let i = 0; i < 3; i++) {
            exactSizeIndices.add(Math.floor(rng() * totalShapes));
            exactThickIndices.add(Math.floor(rng() * totalShapes));
        }
        
        let shapeIndex = 0;
        // Generate shapes
        const addShapes = (count, type) => {
            for (let i = 0; i < count; i++) {
                const isExactSize = exactSizeIndices.has(shapeIndex);
                const isExactThick = exactThickIndices.has(shapeIndex);
                
                const baseRadius = sizeScale * 0.07 * Math.min(width, height);
                const radius = isExactSize ? baseRadius : baseRadius * (1 - (0.05 + rng() * 0.15));
                
                const shapeThick = isExactThick ? userThick : userThick * (1 - (0.01 + rng() * 0.02));

                shapes.push({
                    x: rng() * width,
                    y: rng() * height,
                    radius: radius,
                    thick: shapeThick,
                    type: type,
                    color: colors.colors[Math.floor(rng() * colors.colors.length)],
                    rotation: rng() * Math.PI * 2,
                    opacity: rng() * 0.6 + 0.2 // Between 0.2 and 0.8
                });
                shapeIndex++;
            }
        };

        addShapes(numSquares, 'square');
        addShapes(numTriangles, 'triangle');
        addShapes(numCircles, 'circle');
    }

    if (interactive) interactive.shapes = shapes;

    // If connect is true, apply relaxation to avoid overlap
    if (connect && shapes.length > 0) {
        const padding = width * 0.008;
        for (let iter = 0; iter < 15; iter++) {
            for (let i = 0; i < shapes.length; i++) {
                for (let j = i + 1; j < shapes.length; j++) {
                    const s1 = shapes[i];
                    const s2 = shapes[j];
                    const dx = s2.x - s1.x;
                    const dy = s2.y - s1.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const minDist = s1.radius + s2.radius + padding;
                    if (dist < minDist && dist > 0.001) {
                        const overlap = (minDist - dist) / 2;
                        const nx = dx / dist;
                        const ny = dy / dist;
                        s1.x -= nx * overlap;
                        s1.y -= ny * overlap;
                        s2.x += nx * overlap;
                        s2.y += ny * overlap;
                    }
                }
            }
        }
        
        // Draw connecting lines (Nearest Neighbors approach to keep it simple but nice)
        ctx.lineWidth = Math.max(1, width * 0.0015);
        const connectDist = Math.min(width, height) * 0.25;
        
        shapes.forEach((s1, idx) => {
            let neighbors = shapes
                .filter(s2 => s1 !== s2)
                .map(s2 => ({ s: s2, d: Math.hypot(s2.x - s1.x, s2.y - s1.y) }))
                .sort((a, b) => a.d - b.d)
                .slice(0, 2); // Connect to 2 nearest neighbors
                
            neighbors.forEach(n => {
                if (n.d < connectDist) {
                    ctx.beginPath();
                    ctx.moveTo(s1.x, s1.y);
                    ctx.lineTo(n.s.x, n.s.y);
                    
                    // Create gradient line between the two shapes
                    const grad = ctx.createLinearGradient(s1.x, s1.y, n.s.x, n.s.y);
                    grad.addColorStop(0, s1.color + '66'); 
                    grad.addColorStop(1, n.s.color + '66');
                    
                    ctx.strokeStyle = grad;
                    ctx.shadowBlur = 0; // Don't glow the lines excessively
                    ctx.stroke();
                }
            });
        });
    }

    // Draw shapes
    shapes.forEach(s => {
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);

        if (fill) {
            // Gradient fill for premium look
            const grad = ctx.createLinearGradient(-s.radius, -s.radius, s.radius, s.radius);
            grad.addColorStop(0, s.color + 'dd'); // More opaque
            grad.addColorStop(1, s.color + '22'); // More transparent
            ctx.fillStyle = grad;
            ctx.shadowColor = s.color;
            ctx.shadowBlur = s.radius * 0.4;
        } else {
            // Outline with glow
            ctx.strokeStyle = s.color;
            ctx.lineWidth = Math.max(1, s.thick * (Math.min(width, height) / 1000));
            ctx.shadowColor = s.color;
            ctx.shadowBlur = s.radius * 0.3;
        }

        ctx.beginPath();
        if (s.type === 'circle') {
            ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
        } else if (s.type === 'square') {
            // Adjusted size so visual weight roughly matches circles
            const side = s.radius * 1.7; 
            ctx.rect(-side/2, -side/2, side, side);
        } else if (s.type === 'triangle') {
            const h = s.radius * 1.8; // Approximate height
            ctx.moveTo(0, -h/2);
            ctx.lineTo(h * 0.866 / 2, h/2);
            ctx.lineTo(-h * 0.866 / 2, h/2);
            ctx.closePath();
        }

        if (fill) {
            ctx.globalAlpha = s.opacity;
            ctx.fill();
            // A subtle stroke around filled shapes to define them
            ctx.strokeStyle = s.color;
            ctx.lineWidth = Math.max(1, (s.thick * 0.5) * (Math.min(width, height) / 1000));
            ctx.globalAlpha = 1.0; // Solid border
            ctx.stroke();
        } else {
            ctx.globalAlpha = s.opacity;
            ctx.stroke();
        }

        ctx.restore();
    });
}

export function getHitTarget(x, y, objects) {
    for (let i = 0; i < objects.length; i++) {
        const s = objects[i];
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < s.radius * 1.5) {
            return i;
        }
    }
    return -1;
}
