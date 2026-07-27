import { createNoise2D } from 'https://esm.sh/simplex-noise@4.0.1';

export function drawSilkWaves(ctx, width, height, colors, rng) {
    const noise2D = createNoise2D(rng);

    function hexToRgb(hex) {
        if (!hex) return [0, 0, 0];
        if (hex.length === 9) hex = hex.substring(0, 7);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [0, 0, 0];
    }

    const bgRgb = hexToRgb(colors.bg);
    const accentRgbs = colors.colors.map(hexToRgb);

    // Noise parameters — scale inversely with canvas size for consistent visual density
    const baseScale = 0.003 * (1000 / Math.max(width, height));
    // Band frequency — controls ribbon density, scales with resolution
    const bandFreq = Math.max(15, Math.round(30 * Math.min(width, height) / 1000));

    // Random phase offsets for domain warping (unique per generation)
    const px1 = rng() * 100, py1 = rng() * 100;
    const px2 = rng() * 100, py2 = rng() * 100;

    // Helper: compute domain-warped noise at a pixel position
    function warpedNoise(px, py) {
        const nx = px * baseScale;
        const ny = py * baseScale;
        // Two-pass domain warp for complex, organic folding
        const w1 = noise2D(nx + px1, ny + py1) * 0.8;
        const w2 = noise2D(nx + px2, ny + py2) * 0.8;
        return noise2D(nx + w1, ny + w2);
    }

    // ---- Pass 1: Pre-compute the noise field ----
    const field = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            field[y * width + x] = warpedNoise(x, y);
        }
    }

    // ---- Lighting setup ----
    // Light direction (upper-left, slightly behind viewer)
    const lx = 0.35, ly = -0.65, lz = 0.55;
    const ll = Math.sqrt(lx * lx + ly * ly + lz * lz);
    const ldx = lx / ll, ldy = ly / ll, ldz = lz / ll;

    // Blinn-Phong half-vector (view direction = (0, 0, 1))
    const hvx = ldx, hvy = ldy, hvz = ldz + 1;
    const hvl = Math.sqrt(hvx * hvx + hvy * hvy + hvz * hvz);
    const hx = hvx / hvl, hy = hvy / hvl, hz = hvz / hvl;

    // ---- Pass 2: Shade each pixel ----
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Controls how steep the surface appears (higher = more pronounced 3D)
    const shadingStrength = 5.0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const nc = field[i];

            // Band height at this pixel (sine creates parallel ribbon bands)
            const hc = Math.sin(nc * bandFreq);

            // Forward-difference gradient of the band surface
            const nr = x < width - 1 ? field[i + 1] : nc;
            const nd = y < height - 1 ? field[i + width] : nc;
            const hr = Math.sin(nr * bandFreq);
            const hd = Math.sin(nd * bandFreq);

            const dhdx = (hr - hc) * shadingStrength;
            const dhdy = (hd - hc) * shadingStrength;

            // Surface normal from height-field gradient
            const nmag = Math.sqrt(dhdx * dhdx + dhdy * dhdy + 1);
            const nnx = -dhdx / nmag;
            const nny = -dhdy / nmag;
            const nnz = 1 / nmag;

            // Diffuse (Lambertian)
            const diffuse = Math.max(0, nnx * ldx + nny * ldy + nnz * ldz);

            // Specular (Blinn-Phong) — tight highlight for silk sheen
            const specDot = Math.max(0, nnx * hx + nny * hy + nnz * hz);
            const spec = Math.pow(specDot, 50) * 0.45;

            // Combined brightness
            const ambient = 0.04;
            const brightness = ambient + diffuse * 0.50 + spec;

            // Choose accent color based on the raw noise value
            const ci = Math.floor(Math.abs(nc * 3 + 0.5)) % accentRgbs.length;
            const accent = accentRgbs[ci];

            // Final color: dark bg tinted toward accent, intensity driven by lighting
            const tint = brightness * 0.55;
            const r = bgRgb[0] + (accent[0] - bgRgb[0]) * tint + 255 * spec * 0.12;
            const g = bgRgb[1] + (accent[1] - bgRgb[1]) * tint + 255 * spec * 0.12;
            const b = bgRgb[2] + (accent[2] - bgRgb[2]) * tint + 255 * spec * 0.12;

            const idx = i * 4;
            data[idx]     = Math.min(255, Math.max(0, r));
            data[idx + 1] = Math.min(255, Math.max(0, g));
            data[idx + 2] = Math.min(255, Math.max(0, b));
            data[idx + 3] = 255;
        }
    }

    ctx.putImageData(imgData, 0, 0);
}
