import { createNoise2D } from 'https://esm.sh/simplex-noise@4.0.1';

// ─── Utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
    if (!hex) return [200, 200, 200];
    const h = hex.replace('#', '');
    return [
        parseInt(h.slice(0, 2), 16) / 255.0,
        parseInt(h.slice(2, 4), 16) / 255.0,
        parseInt(h.slice(4, 6), 16) / 255.0
    ];
}

function colorShift(rgb, shift) {
    const cl = v => Math.max(0, Math.min(1, v));
    return [
        cl(rgb[0] + shift),
        cl(rgb[1] + shift),
        cl(rgb[2] + shift)
    ];
}

// ─── WebGL Setup ────────────────────────────────────────────────────────

let glCanvas = null;
let glContext = null;
let shaderProgram = null;

const VS_SOURCE = `
attribute vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FS_SOURCE = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_seed;
uniform vec3 u_colors[5];

// Fast Simplex 2D Noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Low-octave very smooth noise for fluid advection
float fbm_smooth(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    // Only 2 octaves to ensure absolute smoothness and sweeping curves, no grit.
    for (int i = 0; i < 2; ++i) {
        value += amplitude * snoise(st);
        st = rot * st * 2.0 + shift;
        amplitude *= 0.5;
    }
    return value;
}

// Voronoi Cellular Noise for the acrylic pour cells
vec2 random2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}
float cellular(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float min_dist = 1.0;
    for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
            vec2 neighbor = vec2(float(x), float(y));
            vec2 point = random2(i + neighbor);
            vec2 diff = neighbor + point - f;
            float dist = length(diff);
            min_dist = min(min_dist, dist);
        }
    }
    return min_dist;
}

void main() {
    vec2 st = gl_FragCoord.xy / max(u_resolution.x, u_resolution.y);
    
    // Add seed offset to completely change the generation
    st += vec2(u_seed * 10.0);
    
    // 1. SWEEPING FLUID WARP
    // We warp the coordinates to simulate paint flowing and mixing
    // Lower multiplier makes it more spread out / zoomed in
    vec2 p = st * 1.5; 
    
    // Warp 1 (Large scale swirls)
    vec2 warp1 = vec2(
        fbm_smooth(p),
        fbm_smooth(p + vec2(5.2, 1.3))
    );
    vec2 p1 = p + warp1 * 2.0;
    
    // Warp 2 (Medium scale marbling)
    vec2 warp2 = vec2(
        fbm_smooth(p1 + vec2(1.7, 9.2)),
        fbm_smooth(p1 + vec2(8.3, 2.8))
    );
    vec2 p2 = p1 + warp2 * 1.5;

    // 2. THE CHASM (Black separation)
    // We use the intensely warped Y coordinate to define the black space
    // p2.y will have beautiful, organic, sweeping fluid curves
    float fluid_y = p2.y;
    
    // Center the fluid
    float center_y = 1.5 + fbm_smooth(st * 1.5) * 1.0;
    float dist = fluid_y - center_y;
    
    // Chasm mask (black in the middle, fading into fluid)
    // Absolute distance from center defines the black river
    float chasm_dist = abs(dist);
    float chasm_mask = smoothstep(0.2, 0.5, chasm_dist);
    
    // 3. COLOR MIXING (Marbling)
    // Top body uses dist > 0. Bottom body uses dist < 0.
    float is_top = step(0.0, dist);
    
    // Create parallel contour lines in the fluid by taking the sine of the highly warped coordinate
    float marbling = sin(p2.x * 2.0 + p2.y * 2.0);
    marbling = smoothstep(-0.8, 0.8, marbling); // Smooth the bands
    
    float marbling2 = sin(p2.x * 3.0 - p2.y * 1.5);
    marbling2 = smoothstep(-0.8, 0.8, marbling2);

    // Top Fluid Colors (e.g. Cyan/Blue)
    vec3 col_top = mix(u_colors[0], u_colors[1], marbling);
    col_top = mix(col_top, u_colors[0] * 0.5, marbling2 * 0.5); // Add depth shadows
    
    // Bottom Fluid Colors (e.g. Magenta/Purple)
    vec3 col_bot = mix(u_colors[2], u_colors[3], marbling);
    col_bot = mix(col_bot, u_colors[4], marbling2);
    
    vec3 final_color = mix(col_bot, col_top, is_top);
    
    // 4. PAINT CELLS / VOIDS (Silicone oil effect in acrylic pours)
    // Cells are stretched along the fluid flow (warp2)
    vec2 cell_p = p1 * 2.5 + warp2 * 1.5;
    float v = cellular(cell_p);
    
    // Create distinct, hard-edged black holes, but only loosely applied
    float cell_mask = smoothstep(0.15, 0.4, v);
    
    // Apply cells predominantly to the bottom body, and randomly clustered
    float cell_cluster = smoothstep(0.3, 0.7, fbm_smooth(p1 * 2.0));
    float final_cell_mask = mix(1.0, cell_mask, cell_cluster * (1.0 - is_top * 0.8));
    
    // 5. COMPOSITING
    // Apply chasm
    final_color *= chasm_mask;
    
    // Apply cells (they punch through the fluid to the black background)
    final_color *= final_cell_mask;
    
    // 6. SPECULAR GLOSS (Makes the paint look 3D and thick)
    // Gloss on the edges of the chasm
    float gloss = smoothstep(0.2, 0.35, chasm_dist) - smoothstep(0.35, 0.5, chasm_dist);
    final_color += gloss * 0.2 * chasm_mask;
    
    // Gloss on the marbling bands
    float marbling_gloss = smoothstep(0.4, 0.5, marbling) - smoothstep(0.5, 0.6, marbling);
    final_color += marbling_gloss * 0.1 * chasm_mask;
    
    gl_FragColor = vec4(final_color, 1.0);
}
`;

function compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }
    return shaderProgram;
}

export function drawFluidArt(ctx, width, height, colors, rng) {
    if (!glCanvas) {
        glCanvas = document.createElement('canvas');
        glContext = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
        if (!glContext) {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);
            return;
        }
        shaderProgram = initShaderProgram(glContext, VS_SOURCE, FS_SOURCE);
    }

    const gl = glContext;
    
    if (glCanvas.width !== width || glCanvas.height !== height) {
        glCanvas.width = width;
        glCanvas.height = height;
        gl.viewport(0, 0, width, height);
    }

    gl.useProgram(shaderProgram);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0,  1.0,
         1.0,  1.0,
        -1.0, -1.0,
         1.0, -1.0,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const vertexPosition = gl.getAttribLocation(shaderProgram, 'a_position');
    gl.enableVertexAttribArray(vertexPosition);
    gl.vertexAttribPointer(vertexPosition, 2, gl.FLOAT, false, 0, 0);

    // Prepare colors
    const palette = [...colors.colors].sort(() => rng() - 0.5);
    const c1 = hexToRgb(palette[0 % palette.length]);
    const c2 = hexToRgb(palette[1 % palette.length]);
    const c3 = hexToRgb(palette[2 % palette.length]);
    
    // Variations
    const c4 = colorShift(c1, -0.2);
    const c5 = colorShift(c3, 0.2);
    
    const flatColors = new Float32Array([...c1, ...c2, ...c3, ...c4, ...c5]);

    gl.uniform2f(gl.getUniformLocation(shaderProgram, 'u_resolution'), width, height);
    gl.uniform1f(gl.getUniformLocation(shaderProgram, 'u_seed'), rng() * 1000.0);
    gl.uniform3fv(gl.getUniformLocation(shaderProgram, 'u_colors'), flatColors);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.deleteBuffer(positionBuffer);

    ctx.drawImage(glCanvas, 0, 0, width, height);
}
