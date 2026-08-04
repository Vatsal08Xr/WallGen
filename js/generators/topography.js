import { createNoise2D } from 'https://esm.sh/simplex-noise@4.0.1';

export function drawTopography(ctx, width, height, colors, rng) {
    const noise2D = createNoise2D(rng);
    
    // We use the background color and the first accent color to create high-contrast bands
    function hexToRgb(hex) {
        if (!hex) return [0,0,0];
        // Handle hex with alpha (e.g. #ff000099)
        if (hex.length === 9) hex = hex.substring(0, 7);
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : [0,0,0];
    }
    
    const c1 = hexToRgb(colors.bg);
    const c2 = hexToRgb(colors.colors[0] || '#ffffff');
    
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;
    
    const baseDim = Math.max(width, height);
    
    // Parameters for domain warping (Zebra / Marble effect)
    // Scale must decrease as resolution increases to maintain the same visual size
    const baseScale = 0.0015 * (1000 / baseDim); 
    // Scale band count with canvas size so mobile gets proportionally fewer bands without shrinking them
    const bandFrequency = Math.max(12, Math.round(60 * baseDim / 1000));
    const phaseX = rng() * 100;
    const phaseY = rng() * 100;
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const nx = x * baseScale;
            const ny = y * baseScale;
            
            // Domain warp: evaluate noise to distort the original coordinates
            const warpX = noise2D(nx + phaseX, ny);
            const warpY = noise2D(nx, ny + phaseY);
            
            // Evaluate noise at the warped coordinates for complex folding
            const n = noise2D(nx + warpX * 0.8, ny + warpY * 0.8);
            
            // Apply sine function to create bands
            const sineVal = Math.sin(n * bandFrequency);
            
            // Sharp threshold for high contrast bands, with slight anti-aliasing
            const edgeThickness = 0.02;
            let mix = 0;
            if (sineVal < -edgeThickness) {
                mix = 0;
            } else if (sineVal > edgeThickness) {
                mix = 1;
            } else {
                mix = (sineVal + edgeThickness) / (edgeThickness * 2);
            }
            
            const index = (y * width + x) * 4;
            data[index] = c1[0] * (1 - mix) + c2[0] * mix;
            data[index + 1] = c1[1] * (1 - mix) + c2[1] * mix;
            data[index + 2] = c1[2] * (1 - mix) + c2[2] * mix;
            data[index + 3] = 255;
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
}
