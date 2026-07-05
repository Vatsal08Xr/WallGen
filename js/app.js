import seedrandom from 'https://esm.sh/seedrandom@3.0.5';
import { palettes } from './palettes.js';
import { downloadCanvas } from './exportUtils.js';
import { drawTopography } from './generators/topography.js';
import { drawFluidMesh } from './generators/fluidMesh.js';
import { drawVoronoi } from './generators/voronoi.js';
import { drawWaveInterference } from './generators/waveInterference.js';
import { drawParticles } from './generators/particles.js';
import { drawLandscape } from './generators/landscape.js';
import { drawGeometricCity } from './generators/geometricCity.js';
import { drawCrystals } from './generators/crystals.js';
import { drawNebula } from './generators/nebula.js';
import { drawGridGlitch } from './generators/gridGlitch.js';
import { drawFlowField } from './generators/flowField.js';
import { drawOrbitals } from './generators/orbitals.js';

const generators = {
    topography: drawTopography,
    fluidMesh: drawFluidMesh,
    voronoi: drawVoronoi,
    waveInterference: drawWaveInterference,
    particles: drawParticles,
    landscape: drawLandscape,
    geometricCity: drawGeometricCity,
    crystals: drawCrystals,
    nebula: drawNebula,
    gridGlitch: drawGridGlitch,
    flowField: drawFlowField,
    orbitals: drawOrbitals
};

let state = {
    theme: 'topography',
    themeName: 'Topography',
    palette: 'monochrome',
    isDark: true,
    previewMode: 'desktop',
    seed: Math.random().toString(36).substring(2, 15),
    customPalette: {
        bg: '#18181b',
        colors: ['#3b82f6', '#8b5cf6', '#ec4899']
    }
};

const canvas = document.getElementById('preview-canvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const wrapper = document.getElementById('canvas-wrapper');
const outerContainer = document.getElementById('canvas-container-outer');

const themeNameDisplay = document.getElementById('theme-name-display');
const themeBtns = document.querySelectorAll('.theme-btn');
const paletteBtns = document.querySelectorAll('.palette-btn');
const themeToggle = document.getElementById('theme-toggle');
const btnGenerate = document.getElementById('btn-generate');
const btnDlDesktop = document.getElementById('btn-dl-desktop');
const btnDlIphone = document.getElementById('btn-dl-iphone');

const previewDesktopBtn = document.getElementById('preview-desktop-btn');
const previewIphoneBtn = document.getElementById('preview-iphone-btn');


const customPaletteEditor = document.getElementById('custom-palette-editor');
const customBgColor = document.getElementById('custom-bg-color');
const customAccentColors = document.querySelectorAll('.custom-accent-color');

function getColors() {
    if (state.palette === 'custom') {
        return state.customPalette;
    }
    return palettes[state.palette][state.isDark ? 'dark' : 'light'];
}

function updateActiveUI() {
    themeNameDisplay.textContent = state.themeName;
    themeBtns.forEach(btn => {
        if(btn.dataset.theme === state.theme) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    paletteBtns.forEach(btn => {
        if(btn.dataset.palette === state.palette) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if (state.palette === 'custom') customPaletteEditor.classList.remove('hidden');
    else customPaletteEditor.classList.add('hidden');

    if (state.previewMode === 'desktop') {
        previewDesktopBtn.classList.replace('text-zinc-500', 'text-zinc-900');
        previewDesktopBtn.classList.replace('dark:hover:text-white', 'dark:text-white');
        previewDesktopBtn.classList.add('bg-zinc-100', 'dark:bg-zinc-800');
        
        previewIphoneBtn.classList.replace('text-zinc-900', 'text-zinc-500');
        previewIphoneBtn.classList.replace('dark:text-white', 'dark:hover:text-white');
        previewIphoneBtn.classList.remove('bg-zinc-100', 'dark:bg-zinc-800');
        
        wrapper.style.borderRadius = '8px';
    } else {
        previewIphoneBtn.classList.replace('text-zinc-500', 'text-zinc-900');
        previewIphoneBtn.classList.replace('dark:hover:text-white', 'dark:text-white');
        previewIphoneBtn.classList.add('bg-zinc-100', 'dark:bg-zinc-800');
        
        previewDesktopBtn.classList.replace('text-zinc-900', 'text-zinc-500');
        previewDesktopBtn.classList.replace('dark:text-white', 'dark:hover:text-white');
        previewDesktopBtn.classList.remove('bg-zinc-100', 'dark:bg-zinc-800');

        wrapper.style.borderRadius = '32px';
    }
}

let renderTimeout;
function triggerUpdate() {
    const previewRatio = state.previewMode === 'desktop' ? (16 / 9) : (1170 / 2532);
    const containerRect = outerContainer.getBoundingClientRect();
    
    if (containerRect.width === 0) return;
    
    // Account for padding (p-8 = 32px * 2 = 64px width, pt-16 + pb-8 = 64 + 32 = 96px height)
    let availW = containerRect.width - 64;
    let availH = containerRect.height - 96;
    
    let displayWidth = availW;
    let displayHeight = displayWidth / previewRatio;
    
    if (displayHeight > availH) {
        displayHeight = availH;
        displayWidth = displayHeight * previewRatio;
    }
    
    // Update CSS container instantly for buttery smooth transitions
    wrapper.style.width = `${displayWidth}px`;
    wrapper.style.height = `${displayHeight}px`;

    // Defer heavy canvas redraw to prevent UI thread freezing during the 300ms CSS transition
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        const dpr = window.devicePixelRatio || 1;
        const renderDpr = Math.min(dpr, 2); // Cap at 2x to save performance
        
        canvas.width = displayWidth * renderDpr;
        canvas.height = displayHeight * renderDpr;
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        
        render(canvas.width, canvas.height);
    }, 100); 
}

function render(width, height) {
    const generatorFn = generators[state.theme];
    if (!generatorFn) return;
    
    const colors = getColors();
    const rng = seedrandom(state.seed);
    generatorFn(ctx, width, height, colors, rng);
}



window.addEventListener('resize', triggerUpdate);

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.theme = btn.dataset.theme;
        state.themeName = btn.dataset.name;
        state.seed = Math.random().toString(36).substring(2, 15);
        updateActiveUI();
        triggerUpdate();
    });
});

paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.palette = btn.dataset.palette;
        updateActiveUI();
        triggerUpdate();
    });
});

customBgColor.addEventListener('input', (e) => {
    state.customPalette.bg = e.target.value;
    triggerUpdate();
});

customAccentColors.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        state.customPalette.colors[index] = e.target.value;
        triggerUpdate();
    });
});

themeToggle.addEventListener('click', () => {
    state.isDark = !state.isDark;
    document.documentElement.classList.toggle('dark', state.isDark);
    triggerUpdate();
});

btnGenerate.addEventListener('click', () => {
    state.seed = Math.random().toString(36).substring(2, 15);
    triggerUpdate();
});

previewDesktopBtn.addEventListener('click', () => {
    state.previewMode = 'desktop';
    updateActiveUI();
    triggerUpdate();
});

previewIphoneBtn.addEventListener('click', () => {
    state.previewMode = 'iphone';
    updateActiveUI();
    triggerUpdate();
});

btnDlDesktop.addEventListener('click', () => {
    downloadCanvas(3840, 2160, generators[state.theme], getColors(), state.seed, `wallpaper-desktop-${state.theme}-${state.seed}.png`);
});

btnDlIphone.addEventListener('click', () => {
    downloadCanvas(1290, 2796, generators[state.theme], getColors(), state.seed, `wallpaper-iphone-${state.theme}-${state.seed}.png`);
});

function init() {
    lucide.createIcons();
    updateActiveUI();
    triggerUpdate();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('load', init);
}
