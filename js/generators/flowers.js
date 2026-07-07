export function drawFlowers(ctx, width, height, colors, rng) {
    const scale = Math.min(width, height);
    const isDarkBackground = isBgDark(colors.bg);

    // 1. Base dark background with radial atmosphere
    const gradient = ctx.createRadialGradient(
        width / 2, height / 2, 10,
        width / 2, height / 2, Math.max(width, height) * 0.95
    );
    gradient.addColorStop(0, adjustColorBrightness(colors.bg, 1.15));
    gradient.addColorStop(1, colors.bg);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Extend palette to 8 vivid colors
    const palette = buildFlowerPalette(colors, rng, isDarkBackground);

    // 3. Subtle corner/edge flare for glow (replaces the big circular background blobs)
    drawEdgeFlare(ctx, width, height, palette, isDarkBackground);

    // 4. Select species style
    const speciesIndex = Math.floor(rng() * 12);

    // 5. Generate 5-8 flowers
    const numFlowers = 5 + Math.floor(rng() * 4); // 5 to 8 flowers
    const flowers = [];

    // Structured cell layout covering the viewport to guarantee 83%-85% coverage
    const cells = [
        { yMin: 0.18, yMax: 0.35, xMin: 0.40, xMax: 0.60 }, // Top Center
        { yMin: 0.38, yMax: 0.58, xMin: 0.12, xMax: 0.35 }, // Mid Left
        { yMin: 0.35, yMax: 0.55, xMin: 0.65, xMax: 0.88 }, // Mid Right
        { yMin: 0.60, yMax: 0.80, xMin: 0.15, xMax: 0.40 }, // Bottom Left
        { yMin: 0.58, yMax: 0.78, xMin: 0.60, xMax: 0.85 }, // Bottom Right
        { yMin: 0.45, yMax: 0.65, xMin: 0.38, xMax: 0.62 }, // Center
        { yMin: 0.15, yMax: 0.32, xMin: 0.15, xMax: 0.35 }, // Top Left
        { yMin: 0.15, yMax: 0.32, xMin: 0.65, xMax: 0.85 }  // Top Right
    ];

    // Shuffle cells
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const temp = cells[i];
        cells[i] = cells[j];
        cells[j] = temp;
    }

    for (let i = 0; i < numFlowers; i++) {
        const cell = cells[i];
        const cx = width * (cell.xMin + rng() * (cell.xMax - cell.xMin));
        const cy = height * (cell.yMin + rng() * (cell.yMax - cell.yMin));
        
        // Massive, close-up Hibiscus-like flower sizes (scale * 0.26 to 0.40)
        const r = scale * (0.26 + rng() * 0.14);
        
        const ci = i % palette.length;
        flowers.push({
            x: cx,
            y: cy,
            r: r,
            color: palette[ci],
            color2: palette[(ci + 2) % palette.length],
            color3: palette[(ci + 4) % palette.length],
            petals: getPetalCountForSpecies(speciesIndex, rng),
            angleOffset: rng() * Math.PI * 2
        });
    }

    // Sort flowers bottom-to-top by Y
    flowers.sort((a, b) => b.y - a.y);

    // Parent stems fanning out from bottom
    const parentStems = [
        { x: width * 0.35, y: height },
        { x: width * 0.50, y: height },
        { x: width * 0.65, y: height }
    ];

    flowers.forEach(f => {
        let nearestParent = parentStems[0];
        let minDist = Math.abs(f.x - nearestParent.x);
        parentStems.forEach(ps => {
            const d = Math.abs(f.x - ps.x);
            if (d < minDist) {
                minDist = d;
                nearestParent = ps;
            }
        });

        const startX = nearestParent.x;
        const startY = nearestParent.y;

        const cp1x = startX + (f.x - startX) * 0.3 + (rng() - 0.5) * width * 0.15;
        const cp1y = startY - (startY - f.y) * 0.4;
        const cp2x = f.x - (f.x - startX) * 0.2 + (rng() - 0.5) * width * 0.1;
        const cp2y = f.y + (startY - f.y) * 0.3;

        drawStemForSpecies(ctx, startX, startY, f.x, f.y, cp1x, cp1y, cp2x, cp2y, colors.colors[0], scale * 0.005, speciesIndex, rng);

        f._stemStartX = startX; f._stemStartY = startY;
        f._stemCp1x = cp1x; f._stemCp1y = cp1y;
        f._stemCp2x = cp2x; f._stemCp2y = cp2y;
    });

    // Draw foliage leaves (Enlarged and aligned)
    flowers.forEach(f => {
        if (!f._stemStartX) return;
        const tValues = [0.4, 0.75];
        tValues.forEach((t, idx) => {
            const pt = getBezierPoint(t, f._stemStartX, f._stemStartY, f._stemCp1x, f._stemCp1y, f._stemCp2x, f._stemCp2y, f.x, f.y);
            const tangent = getBezierTangent(t, f._stemStartX, f._stemStartY, f._stemCp1x, f._stemCp1y, f._stemCp2x, f._stemCp2y, f.x, f.y);
            const stemAngle = Math.atan2(tangent.y, tangent.x);
            
            const dir = (idx === 0) ? -1 : 1;
            const leafAngle = stemAngle + dir * (Math.PI / 2.3 + rng() * 0.25);
            const leafSize = scale * (0.15 + rng() * 0.07);
            
            drawLeafForSpecies(ctx, pt.x, pt.y, leafSize, leafAngle, f.color, isDarkBackground, speciesIndex, rng);
        });
    });

    // Draw translucent glowing flower head petals (with linear gradients)
    ctx.globalCompositeOperation = isDarkBackground ? 'screen' : 'multiply';
    flowers.forEach(f => {
        drawFlowerHead(ctx, f, isDarkBackground, rng, speciesIndex);
    });

    // Draw detailed vein structures on top
    ctx.globalCompositeOperation = 'source-over';
    flowers.forEach(f => {
        drawVeins(ctx, f, rng, scale, isDarkBackground, speciesIndex);
    });

    // Draw glowing stamens in the center
    ctx.globalCompositeOperation = isDarkBackground ? 'screen' : 'source-over';
    flowers.forEach(f => {
        drawCenter(ctx, f, rng, scale, isDarkBackground, speciesIndex);
    });

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1.0;
}

// ==========================================
// BACKGROUND EDGE FLARE
// ==========================================
function drawEdgeFlare(ctx, width, height, palette, isDark) {
    ctx.save();
    ctx.globalCompositeOperation = isDark ? 'screen' : 'multiply';
    
    // Smooth corner flare
    const grad = ctx.createLinearGradient(0, height, width, 0);
    grad.addColorStop(0, hexWithAlpha(palette[0], isDark ? 0.16 : 0.08));
    grad.addColorStop(0.5, 'rgba(0,0,0,0)');
    grad.addColorStop(1, hexWithAlpha(palette[1], isDark ? 0.16 : 0.08));
    
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
}

function getPetalCountForSpecies(index, rng) {
    const counts = [
        5,  // 0. Poppy
        8,  // 1. Lotus
        12, // 2. Peony (dense double layer)
        5,  // 3. Orchid
        6,  // 4. Magnolia
        5,  // 5. Sakura
        6,  // 6. Tulip
        16, // 7. Daisy
        6,  // 8. Ginkgo
        5,  // 9. Hibiscus
        6,  // 10. Star Jasmine
        8   // 11. Clematis
    ];
    return counts[index] || 5;
}

// ---- DRAW STEM FOR SPECIES ----
function drawStemForSpecies(ctx, x1, y1, x4, y4, x2, y2, x3, y3, color, baseWidth, speciesIndex, rng) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.4;

    if (speciesIndex === 1) { // Lotus double hollow stems
        [-1.5, 1.5].forEach(offset => {
            ctx.beginPath();
            ctx.moveTo(x1 + offset, y1);
            ctx.bezierCurveTo(x2 + offset, y2, x3 + offset, y3, x4, y4);
            ctx.lineWidth = baseWidth * 0.45;
            ctx.stroke();
        });
    } else if (speciesIndex === 4) { // Magnolia Segmented Woody
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
        ctx.lineWidth = baseWidth * 1.25;
        ctx.stroke();

        const nodes = 4;
        for (let i = 1; i < nodes; i++) {
            const t = i / nodes;
            const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, baseWidth * 1.8, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (speciesIndex === 11) { // Clematis Twisting vine
        const steps = 40;
        ctx.lineWidth = baseWidth * 0.6;
        ctx.beginPath();
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const pt = getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4);
            const tangent = getBezierTangent(t, x1, y1, x2, y2, x3, y3, x4, y4);
            const normalAngle = Math.atan2(tangent.y, tangent.x) + Math.PI / 2;
            const offset = Math.sin(t * Math.PI * 10) * baseWidth * 0.9;
            const sx = pt.x + Math.cos(normalAngle) * offset;
            const sy = pt.y + Math.sin(normalAngle) * offset;
            if (s === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
    } else { // Standard sinuous elegant stem
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.bezierCurveTo(x2, y2, x3, y3, x4, y4);
        ctx.lineWidth = baseWidth;
        ctx.stroke();
    }
    ctx.restore();
}

// ---- DRAW LEAF FOR SPECIES ----
function drawLeafForSpecies(ctx, x, y, size, angle, color, isDark, speciesIndex, rng) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.globalAlpha = isDark ? 0.18 : 0.32;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    switch (speciesIndex) {
        case 0: // Poppy (Ovate, detailed veins)
        default:
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.35, -size * 0.18, size * 0.75, -size * 0.12, size, 0);
            ctx.bezierCurveTo(size * 0.75, size * 0.12, size * 0.35, size * 0.18, 0, 0);
            ctx.closePath();
            ctx.fill();

            // Veins
            ctx.globalAlpha = isDark ? 0.45 : 0.55;
            ctx.lineWidth = size * 0.015;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size * 0.95, 0); ctx.stroke();

            ctx.lineWidth = size * 0.007;
            for (let v = 1; v <= 6; v++) {
                const vx = size * (v / 7);
                const vy = size * 0.12 * Math.sin((v / 7) * Math.PI);
                [-1, 1].forEach(d => {
                    ctx.beginPath(); ctx.moveTo(vx, 0);
                    ctx.quadraticCurveTo(vx + size * 0.04, d * vy * 0.5, vx + size * 0.07, d * vy);
                    ctx.stroke();
                });
            }
            break;

        case 1: // Lotus (Shield/Peltate round leaf)
            ctx.beginPath();
            ctx.arc(size * 0.35, 0, size * 0.42, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = isDark ? 0.35 : 0.45;
            ctx.lineWidth = size * 0.008;
            for (let a = 0; a < 8; a++) {
                const rad = (a / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(size * 0.35, 0);
                ctx.lineTo(size * 0.35 + Math.cos(rad) * size * 0.38, Math.sin(rad) * size * 0.38);
                ctx.stroke();
            }
            break;

        case 2: // Peony (Multi-lobed oak-like leaves)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(size * 0.15, -size * 0.25, size * 0.3, -size * 0.15);
            ctx.quadraticCurveTo(size * 0.45, -size * 0.3, size * 0.6, -size * 0.15);
            ctx.quadraticCurveTo(size * 0.8, -size * 0.25, size, 0);
            ctx.quadraticCurveTo(size * 0.8, size * 0.25, size * 0.6, size * 0.15);
            ctx.quadraticCurveTo(size * 0.45, size * 0.3, size * 0.3, size * 0.15);
            ctx.quadraticCurveTo(size * 0.15, size * 0.25, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 3: // Orchid (Broad thick elliptic)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.25, -size * 0.18, size * 0.75, -size * 0.18, size, 0);
            ctx.bezierCurveTo(size * 0.75, size * 0.18, size * 0.25, size * 0.18, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 4: // Magnolia (Large leathery ovate)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.3, -size * 0.22, size * 0.7, -size * 0.22, size, 0);
            ctx.bezierCurveTo(size * 0.7, size * 0.22, size * 0.3, size * 0.22, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 5: // Sakura (Serrated small leaves)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            for (let t = 0; t <= 10; t++) {
                const lt = t / 10;
                const lx = size * lt;
                const ly = -size * 0.15 * Math.sin(lt * Math.PI) + (Math.sin(lt * Math.PI * 5) * size * 0.015);
                ctx.lineTo(lx, ly);
            }
            for (let t = 10; t >= 0; t--) {
                const lt = t / 10;
                const lx = size * lt;
                const ly = size * 0.15 * Math.sin(lt * Math.PI) - (Math.sin(lt * Math.PI * 5) * size * 0.015);
                ctx.lineTo(lx, ly);
            }
            ctx.closePath();
            ctx.fill();
            break;

        case 6: // Tulip (Upright grass blade)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.4, -size * 0.08, size * 0.9, -size * 0.04, size * 1.3, 0);
            ctx.bezierCurveTo(size * 0.9, size * 0.04, size * 0.4, size * 0.08, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 7: // Daisy (Fine feathery leaves)
            ctx.lineWidth = size * 0.01;
            ctx.globalAlpha = isDark ? 0.35 : 0.45;
            const lines = 6;
            for (let i = 0; i < lines; i++) {
                const nAngle = -0.4 + (i / lines) * 0.8;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.quadraticCurveTo(size * 0.5 * Math.cos(nAngle), size * 0.5 * Math.sin(nAngle), size * Math.cos(nAngle), size * Math.sin(nAngle));
                ctx.stroke();
            }
            break;

        case 8: // Ginkgo Fan Leaf
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.2, -size * 0.4, size * 0.7, -size * 0.6, size, -size * 0.15);
            ctx.quadraticCurveTo(size * 0.82, 0, size, size * 0.15);
            ctx.bezierCurveTo(size * 0.7, size * 0.6, size * 0.2, size * 0.4, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 9: // Hibiscus (Cordate heart leaf)
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(size * 0.15, -size * 0.28, size * 0.6, -size * 0.3, size, 0);
            ctx.bezierCurveTo(size * 0.6, size * 0.3, size * 0.15, size * 0.28, 0, 0);
            ctx.closePath();
            ctx.fill();
            break;

        case 10: // Fern pinnate leaf
            ctx.lineWidth = size * 0.015;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(size, 0); ctx.stroke();
            const leaflets = 6;
            for (let v = 0; v < leaflets; v++) {
                const lx = size * (v / leaflets) * 0.85 + size * 0.1;
                const lSize = size * 0.23 * (1.05 - (v / leaflets));
                [-1, 1].forEach(d => {
                    ctx.save();
                    ctx.translate(lx, 0); ctx.rotate(d * (Math.PI / 3));
                    ctx.beginPath(); ctx.ellipse(lSize, 0, lSize, lSize * 0.35, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.restore();
                });
            }
            break;

        case 11: // Clematis (3 pointed lobes vine)
            [-0.35, 0, 0.35].forEach(rot => {
                ctx.save();
                ctx.rotate(rot);
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.bezierCurveTo(size * 0.3, -size * 0.15, size * 0.7, -size * 0.1, size * 0.8, 0);
                ctx.bezierCurveTo(size * 0.7, size * 0.1, size * 0.3, size * 0.15, 0, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            });
            break;
    }

    ctx.restore();
}

// ---- DRAW FLOWER HEAD PETALS ----
function drawFlowerHead(ctx, flower, isDark, rng, speciesIndex) {
    const { x, y, r, color, secondaryColor, color3, petals, angleOffset } = flower;

    // Rich translucent layering (highly cupped like Hibiscus/Poppy closeups)
    const layers = [
        { scale: 1.0, opacity: isDark ? 0.32 : 0.44, rotOffset: 0, col: color, colEnd: secondaryColor },
        { scale: 0.85, opacity: isDark ? 0.38 : 0.48, rotOffset: Math.PI / petals, col: secondaryColor, colEnd: color3 },
        { scale: 0.68, opacity: isDark ? 0.42 : 0.52, rotOffset: -Math.PI / (petals * 2), col: color3, colEnd: color }
    ];

    layers.forEach(layer => {
        for (let i = 0; i < petals; i++) {
            const angle = angleOffset + (i / petals) * Math.PI * 2 + layer.rotOffset;
            const size = r * layer.scale;
            drawSpeciesPetal(ctx, x, y, size, angle, layer.col, layer.colEnd, layer.opacity, speciesIndex, rng);
        }
    });
}

// ---- DRAW SPECIES PETAL ----
function drawSpeciesPetal(ctx, cx, cy, r, angle, colorStart, colorEnd, alpha, speciesIndex, rng) {
    ctx.save();

    // Spread factor is widened significantly so petals overlap beautifully (0.52 to 0.68)
    const spread = 0.52 + rng() * 0.12;
    const leftAngle = angle - spread;
    const rightAngle = angle + spread;

    const leftR = r * (0.95 + rng() * 0.1);
    const rightR = r * (0.95 + rng() * 0.1);
    const tipX = cx + Math.cos(angle) * r;
    const tipY = cy + Math.sin(angle) * r;

    // Linear gradient for each individual petal to give a realistic soft, rich glass transition
    const grad = ctx.createLinearGradient(cx, cy, tipX, tipY);
    grad.addColorStop(0, hexWithAlpha(colorStart, alpha * 1.5));
    grad.addColorStop(0.6, hexWithAlpha(colorEnd, alpha * 0.95));
    grad.addColorStop(1, hexWithAlpha(colorEnd, alpha * 0.2));
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(cx, cy);

    switch (speciesIndex) {
        case 0: // Poppy (Ruffled, clefted)
        default:
            const centerR = r * 0.85;
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.8) * r * 0.45, cy + Math.sin(angle - spread * 0.8) * r * 0.45,
                cx + Math.cos(leftAngle) * r * 0.85, cy + Math.sin(leftAngle) * r * 0.85,
                cx + Math.cos(angle - spread * 0.35) * r * 1.02, cy + Math.sin(angle - spread * 0.35) * r * 1.02
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.15) * centerR * 1.05, cy + Math.sin(angle - spread * 0.15) * centerR * 1.05,
                cx + Math.cos(angle + spread * 0.15) * centerR * 1.05, cy + Math.sin(angle + spread * 0.15) * centerR * 1.05,
                cx + Math.cos(angle + spread * 0.35) * r * 1.02, cy + Math.sin(angle + spread * 0.35) * r * 1.02
            );
            ctx.bezierCurveTo(
                cx + Math.cos(rightAngle) * r * 0.85, cy + Math.sin(rightAngle) * r * 0.85,
                cx + Math.cos(angle + spread * 0.8) * r * 0.45, cy + Math.sin(angle + spread * 0.8) * r * 0.45,
                cx, cy
            );
            break;

        case 1: // Lotus / Water Lily (Sharp pointed)
        case 11: // Clematis (Flat pointed)
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.45) * r * 0.5, cy + Math.sin(angle - spread * 0.45) * r * 0.5,
                cx + Math.cos(angle - spread * 0.15) * r * 0.95, cy + Math.sin(angle - spread * 0.15) * r * 0.95,
                cx + Math.cos(angle) * r * 1.1, cy + Math.sin(angle) * r * 1.1
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.15) * r * 0.95, cy + Math.sin(angle + spread * 0.15) * r * 0.95,
                cx + Math.cos(angle + spread * 0.45) * r * 0.5, cy + Math.sin(angle + spread * 0.45) * r * 0.5,
                cx, cy
            );
            break;

        case 2: // Peony (Overlapping layered ruffle)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.65, cy + Math.sin(leftAngle) * r * 0.65,
                cx + Math.cos(angle - spread * 0.5) * r * 1.02, cy + Math.sin(angle - spread * 0.5) * r * 1.02,
                cx + Math.cos(angle - spread * 0.1) * r * 1.0, cy + Math.sin(angle - spread * 0.1) * r * 1.0
            );
            ctx.quadraticCurveTo(cx + Math.cos(angle) * r * 1.15, cy + Math.sin(angle) * r * 1.15, cx + Math.cos(angle + spread * 0.1) * r * 1.0, cy + Math.sin(angle + spread * 0.1) * r * 1.0);
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.5) * r * 1.02, cy + Math.sin(angle + spread * 0.5) * r * 1.02,
                cx + Math.cos(rightAngle) * r * 0.65, cy + Math.sin(rightAngle) * r * 0.65,
                cx, cy
            );
            break;

        case 3: // Orchid (Broad bilobed asymmetric)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.7, cy + Math.sin(leftAngle) * r * 0.7,
                cx + Math.cos(angle - spread * 0.3) * r * 1.15, cy + Math.sin(angle - spread * 0.3) * r * 1.15,
                cx + Math.cos(angle - spread * 0.08) * r * 0.95, cy + Math.sin(angle - spread * 0.08) * r * 0.95
            );
            ctx.lineTo(cx + Math.cos(angle) * r * 0.65, cy + Math.sin(angle) * r * 0.65);
            ctx.lineTo(cx + Math.cos(angle + spread * 0.08) * r * 0.95, cy + Math.sin(angle + spread * 0.08) * r * 0.95);
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.3) * r * 1.15, cy + Math.sin(angle + spread * 0.3) * r * 1.15,
                cx + Math.cos(rightAngle) * r * 0.7, cy + Math.sin(rightAngle) * r * 0.7,
                cx, cy
            );
            break;

        case 4: // Magnolia (Thick broad cup)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.55, cy + Math.sin(leftAngle) * r * 0.55,
                cx + Math.cos(angle - spread * 0.45) * r * 0.95, cy + Math.sin(angle - spread * 0.45) * r * 0.95,
                cx + Math.cos(angle) * r * 1.0, cy + Math.sin(angle) * r * 1.0
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.45) * r * 0.95, cy + Math.sin(angle + spread * 0.45) * r * 0.95,
                ctx.white = true,
                cx + Math.cos(rightAngle) * r * 0.55, cy + Math.sin(rightAngle) * r * 0.55,
                cx, cy
            );
            break;

        case 5: // Sakura (Small notched blossom)
            const notchR = r * 0.88;
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.6, cy + Math.sin(leftAngle) * r * 0.6,
                cx + Math.cos(angle - spread * 0.4) * r * 1.05, cy + Math.sin(angle - spread * 0.4) * r * 1.05,
                cx + Math.cos(angle - spread * 0.1) * r * 1.0, cy + Math.sin(angle - spread * 0.1) * r * 1.0
            );
            ctx.lineTo(cx + Math.cos(angle) * notchR, cy + Math.sin(angle) * notchR);
            ctx.lineTo(cx + Math.cos(angle + spread * 0.1) * r * 1.0, cy + Math.sin(angle + spread * 0.1) * r * 1.0);
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.4) * r * 1.05, cy + Math.sin(angle + spread * 0.4) * r * 1.05,
                cx + Math.cos(rightAngle) * r * 0.6, cy + Math.sin(rightAngle) * r * 0.6,
                cx, cy
            );
            break;

        case 6: // Tulip (Upright petals)
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.5) * r * 0.5, cy + Math.sin(angle - spread * 0.5) * r * 0.5,
                cx + Math.cos(angle - spread * 0.15) * r * 0.85, cy + Math.sin(angle - spread * 0.15) * r * 1.25,
                cx + Math.cos(angle) * r * 1.08, cy + Math.sin(angle) * r * 1.08
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.15) * r * 0.85, cy + Math.sin(angle + spread * 0.15) * r * 1.25,
                cx + Math.cos(angle + spread * 0.5) * r * 0.5, cy + Math.sin(angle + spread * 0.5) * r * 0.5,
                cx, cy
            );
            break;

        case 7: // Daisy / Cosmos (Elongated radiating)
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.25) * r * 0.4, cy + Math.sin(angle - spread * 0.25) * r * 0.4,
                cx + Math.cos(angle - spread * 0.08) * r * 0.95, cy + Math.sin(angle - spread * 0.08) * r * 0.95,
                cx + Math.cos(angle) * r, cy + Math.sin(angle) * r
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.08) * r * 0.95, cy + Math.sin(angle + spread * 0.08) * r * 0.95,
                cx + Math.cos(angle + spread * 0.25) * r * 0.4, cy + Math.sin(angle + spread * 0.25) * r * 0.4,
                cx, cy
            );
            break;

        case 8: // Ginkgo Fan shape
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.4, cy + Math.sin(leftAngle) * r * 0.4,
                cx + Math.cos(angle - spread * 0.6) * r * 1.15, cy + Math.sin(angle - spread * 0.6) * r * 1.15,
                cx + Math.cos(angle - spread * 0.05) * r * 0.92, cy + Math.sin(angle - spread * 0.05) * r * 0.92
            );
            ctx.lineTo(cx + Math.cos(angle + spread * 0.05) * r * 0.92, cy + Math.sin(angle + spread * 0.05) * r * 0.92);
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.6) * r * 1.15, cy + Math.sin(angle + spread * 0.6) * r * 1.15,
                cx + Math.cos(rightAngle) * r * 0.4, cy + Math.sin(rightAngle) * r * 0.4,
                cx, cy
            );
            break;

        case 9: // Hibiscus / Rose-mallow (Huge flared overlapping, ruffled edge)
            ctx.bezierCurveTo(
                cx + Math.cos(leftAngle) * r * 0.6, cy + Math.sin(leftAngle) * r * 0.6,
                cx + Math.cos(angle - spread * 0.5) * r * 1.15, cy + Math.sin(angle - spread * 0.5) * r * 1.15,
                cx + Math.cos(angle - spread * 0.18) * r * 1.05, cy + Math.sin(angle - spread * 0.18) * r * 1.05
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.18) * r * 1.05, cy + Math.sin(angle + spread * 0.18) * r * 1.05,
                cx + Math.cos(angle + spread * 0.5) * r * 1.15, cy + Math.sin(angle + spread * 0.5) * r * 1.15,
                cx + Math.cos(rightAngle) * r * 0.6, cy + Math.sin(rightAngle) * r * 0.6,
                cx, cy
            );
            break;

        case 10: // Star Jasmine (Slender starry)
            ctx.bezierCurveTo(
                cx + Math.cos(angle - spread * 0.35) * r * 0.4, cy + Math.sin(angle - spread * 0.35) * r * 0.4,
                cx + Math.cos(angle - spread * 0.12) * r * 0.95, cy + Math.sin(angle - spread * 0.12) * r * 0.95,
                cx + Math.cos(angle) * r * 1.05, cy + Math.sin(angle) * r * 1.05
            );
            ctx.bezierCurveTo(
                cx + Math.cos(angle + spread * 0.12) * r * 0.95, cy + Math.sin(angle + spread * 0.12) * r * 0.95,
                cx + Math.cos(angle + spread * 0.35) * r * 0.4, cy + Math.sin(angle + spread * 0.35) * r * 0.4,
                cx, cy
            );
            break;
    }

    ctx.fill();
    ctx.restore();
}

// ---- FINE VEIN LINES ----
function drawVeins(ctx, f, rng, scale, isDark, speciesIndex) {
    const { x, y, r, petals, angleOffset } = f;

    ctx.globalAlpha = isDark ? 0.65 : 0.45;
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.9)';
    ctx.lineWidth = r * 0.007;

    for (let i = 0; i < petals; i++) {
        const angle = angleOffset + (i / petals) * Math.PI * 2;
        const spread = 0.52 + rng() * 0.08;
        const tipX = x + Math.cos(angle) * r * 0.88;
        const tipY = y + Math.sin(angle) * r * 0.88;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(
            x + Math.cos(angle) * r * 0.45,
            y + Math.sin(angle) * r * 0.45,
            tipX, tipY
        );
        ctx.stroke();

        const numSide = 3;
        ctx.lineWidth = r * 0.0035;
        ctx.globalAlpha = isDark ? 0.35 : 0.28;
        for (let s = 1; s <= numSide; s++) {
            const t = s / (numSide + 1);
            const baseX = x + Math.cos(angle) * r * t * 0.85;
            const baseY = y + Math.sin(angle) * r * t * 0.85;
            const sideLen = r * 0.18 * (1 - t * 0.4);

            [-1, 1].forEach(dir => {
                const sAngle = angle + dir * (spread * 0.45 + rng() * 0.05);
                ctx.beginPath();
                ctx.moveTo(baseX, baseY);
                ctx.lineTo(
                    baseX + Math.cos(sAngle) * sideLen,
                    baseY + Math.sin(sAngle) * sideLen
                );
                ctx.stroke();
            });
        }
    }
}

// ---- GLOWING CENTER & STAMENS ----
function drawCenter(ctx, f, rng, scale, isDark, speciesIndex) {
    const { x, y, r, color2, color3, petals, angleOffset } = f;
    const centerR = r * 0.13;

    // Glowing core
    const aura = ctx.createRadialGradient(x, y, 0, x, y, centerR * 2.5);
    aura.addColorStop(0, hexWithAlpha(color2, isDark ? 0.95 : 0.75));
    aura.addColorStop(0.4, hexWithAlpha(color2, isDark ? 0.4 : 0.25));
    aura.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(x, y, centerR * 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Natural stamens matching species (Hibiscus has extremely long stamens)
    let lengthMult = 1.0;
    if (speciesIndex === 9 || speciesIndex === 0) lengthMult = 2.4; // Long column for Poppy/Hibiscus
    
    const numStamens = petals * 4;
    ctx.strokeStyle = color3;
    ctx.lineWidth = r * 0.007;

    for (let i = 0; i < numStamens; i++) {
        const angle = angleOffset + (i / numStamens) * Math.PI * 2;
        const len = centerR * (0.95 + Math.sin(i * 2.5) * 0.25) * lengthMult;
        const sx = x + Math.cos(angle) * len;
        const sy = y + Math.sin(angle) * len;

        ctx.globalAlpha = isDark ? 0.7 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        ctx.globalAlpha = isDark ? 0.95 : 0.85;
        ctx.fillStyle = color2;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.015, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ---- CLOSED/HALF-OPEN BUD ----
function drawBud(ctx, x, y, r, angle, color, sepalColor, isDark) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = sepalColor;
    ctx.globalAlpha = isDark ? 0.4 : 0.55;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, 0);
    ctx.bezierCurveTo(-r * 0.55, -r * 0.25, -r * 0.2, -r * 0.55, 0, -r * 0.35);
    ctx.bezierCurveTo(r * 0.2, -r * 0.55, r * 0.55, -r * 0.25, r * 0.4, 0);
    ctx.quadraticCurveTo(0, r * 0.15, -r * 0.4, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = color;
    ctx.globalAlpha = isDark ? 0.65 : 0.85;
    
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-r * 0.75, -r * 0.45, -r * 0.35, -r * 1.1, 0, -r * 1.3);
    ctx.bezierCurveTo(-r * 0.08, -r * 0.75, 0, -r * 0.35, 0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(r * 0.75, -r * 0.45, r * 0.35, -r * 1.1, 0, -r * 1.3);
    ctx.bezierCurveTo(r * 0.08, -r * 0.75, 0, -r * 0.35, 0, 0);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
}

function buildFlowerPalette(colors, rng, isDark) {
    const base = colors.colors.slice();
    const h0 = extractHue(base[0]) || (rng() * 360);
    const hues = [
        h0,
        (h0 + 30) % 360,
        (h0 + 60) % 360,
        (h0 + 150) % 360,
        (h0 + 200) % 360,
        (h0 + 270) % 360,
        (h0 + 310) % 360,
        (h0 + 180) % 360,
    ];
    const extended = hues.map(h => {
        const s = 70 + rng() * 25;
        const l = isDark ? (40 + rng() * 20) : (35 + rng() * 20);
        return hslToHex(h, s, l);
    });
    return [...base, ...extended].slice(0, 8);
}

// ==========================================
// PROCEDURAL MATH & BEZIER HELPERS
// ==========================================
function getBezierPoint(t, x1, y1, x2, y2, x3, y3, x4, y4) {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return {
        x: uuu * x1 + 3 * uu * t * x2 + 3 * u * tt * x3 + ttt * x4,
        y: uuu * y1 + 3 * uu * t * y2 + 3 * u * tt * y3 + ttt * y4
    };
}

function getBezierTangent(t, x1, y1, x2, y2, x3, y3, x4, y4) {
    const u = 1 - t;
    const d1x = 3 * u * u * (x2 - x1);
    const d1y = 3 * u * u * (y2 - y1);
    const d2x = 6 * u * t * (x3 - x2);
    const d2y = 6 * u * t * (y3 - y2);
    const d3x = 3 * t * t * (x4 - x3);
    const d3y = 3 * t * t * (y4 - y3);

    return {
        x: d1x + d2x + d3x,
        y: d1y + d2y + d3y
    };
}

function getQuadraticPoint(t, x1, y1, x2, y2, x3, y3) {
    const u = 1 - t;
    return {
        x: u * u * x1 + 2 * u * t * x2 + t * t * x3,
        y: u * u * y1 + 2 * u * t * y2 + t * t * y3
    };
}

function isBgDark(hex) {
    if (!hex || hex[0] !== '#') return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.45;
}

function adjustColorBrightness(hex, factor) {
    if (!hex || hex[0] !== '#') return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    r = Math.min(255, Math.floor(r * factor));
    g = Math.min(255, Math.floor(g * factor));
    b = Math.min(255, Math.floor(b * factor));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexWithAlpha(hex, alpha) {
    if (!hex || hex[0] !== '#') return `rgba(128,128,128,${alpha})`;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${alpha})`;
}

function extractHue(hex) {
    if (!hex || hex[0] !== '#') return 0;
    const r = parseInt(hex.slice(1,3),16) / 255;
    const g = parseInt(hex.slice(3,5),16) / 255;
    const b = parseInt(hex.slice(5,7),16) / 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    if (max === min) return 0;
    const d = max - min;
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return h * 360;
}

function hslToHex(h, s, l) {
    l /= 100; s /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}
