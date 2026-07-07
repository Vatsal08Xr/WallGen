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
import { store, renderSavedModal } from './store.js';
import { generateRandomPalette } from './colorUtils.js';

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
    },
    isLocked: false
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
const btnLockPattern = document.getElementById('btn-lock-pattern');
const btnSaveWallpaper = document.getElementById('btn-save-wallpaper');
const btnOpenSaved = document.getElementById('btn-open-saved');
const btnCloseSaved = document.getElementById('btn-close-saved');
const savedModal = document.getElementById('saved-modal');
const savedModalBackdrop = document.getElementById('saved-modal-backdrop');
const savedModalContent = document.getElementById('saved-modal-content');


const customPaletteEditor = document.getElementById('custom-palette-editor');
const customBgColor = document.getElementById('custom-bg-color');
const customAccentColors = document.querySelectorAll('.custom-accent-color');
const customBgColorPicker = document.querySelector('.custom-bg-color-picker');
const customAccentColorPickers = document.querySelectorAll('.custom-accent-color-picker');

function updateCustomPaletteUI() {
    if (customBgColorPicker) customBgColorPicker.value = state.customPalette.bg;
    if (customBgColor) customBgColor.value = state.customPalette.bg.toUpperCase();
    
    customAccentColorPickers.forEach((picker, i) => {
        if (state.customPalette.colors[i]) picker.value = state.customPalette.colors[i];
    });
    customAccentColors.forEach((input, i) => {
        if (state.customPalette.colors[i]) input.value = state.customPalette.colors[i].toUpperCase();
    });
}

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
    updateHeartUI();
}

function updateHeartUI() {
    // Target the <i> tag directly — Lucide replaces it with SVG so we need the SVG
    const svgOrI = btnSaveWallpaper.querySelector('svg, i');
    if (!svgOrI) return;
    if (store.isSaved(state)) {
        svgOrI.classList.add('fill-red-500', 'stroke-red-500');
        svgOrI.style.color = '#ef4444';
    } else {
        svgOrI.classList.remove('fill-red-500', 'stroke-red-500');
        svgOrI.style.color = '';
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
        updateHeartUI();
        triggerUpdate();
    });
});

paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.palette = btn.dataset.palette;
        updateActiveUI();
        updateHeartUI();
        triggerUpdate();
    });
});

const handleBgChange = (val) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        state.customPalette.bg = val;
        updateCustomPaletteUI();
        updateHeartUI();
        triggerUpdate();
    }
};

customBgColor.addEventListener('input', (e) => handleBgChange(e.target.value));
if (customBgColorPicker) customBgColorPicker.addEventListener('input', (e) => handleBgChange(e.target.value));

const handleAccentChange = (val, index) => {
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        state.customPalette.colors[index] = val;
        updateCustomPaletteUI();
        updateHeartUI();
        triggerUpdate();
    }
};

customAccentColors.forEach((input, index) => {
    input.addEventListener('input', (e) => handleAccentChange(e.target.value, index));
});

if (customAccentColorPickers) {
    customAccentColorPickers.forEach((picker, index) => {
        picker.addEventListener('input', (e) => handleAccentChange(e.target.value, index));
    });
}

themeToggle.addEventListener('click', () => {
    state.isDark = !state.isDark;
    document.documentElement.classList.toggle('dark', state.isDark);
    updateHeartUI();
    triggerUpdate();
});

btnGenerate.addEventListener('click', () => {
    if (state.isLocked) {
        // Randomize colors using HSL generator instead of new pattern
        const newColors = generateRandomPalette(state.isDark);
        state.palette = 'custom';
        state.customPalette = newColors;
        updateCustomPaletteUI();
        updateActiveUI();
    } else {
        // Generate entirely new pattern variation
        state.seed = Math.random().toString(36).substring(2, 15);
        updateHeartUI();
    }
    triggerUpdate();
});

btnLockPattern.addEventListener('click', () => {
    state.isLocked = !state.isLocked;
    btnLockPattern.classList.add('scale-75', 'opacity-50');
    
    setTimeout(() => {
        const icon = btnLockPattern.querySelector('svg') || btnLockPattern.querySelector('i');
        if (state.isLocked) {
            icon.setAttribute('data-lucide', 'lock');
            btnLockPattern.classList.add('bg-zinc-900', 'text-white');
            btnLockPattern.classList.remove('bg-white', 'text-black');
            btnGenerate.innerHTML = '<i data-lucide="palette" class="w-4 h-4"></i> Generate Colors';
        } else {
            icon.setAttribute('data-lucide', 'unlock');
            btnLockPattern.classList.remove('bg-zinc-900', 'text-white');
            btnLockPattern.classList.add('bg-white', 'text-black');
            btnGenerate.innerHTML = '<i data-lucide="shuffle" class="w-4 h-4"></i> Generate Variation';
        }
        lucide.createIcons({ root: btnLockPattern.parentElement });
        btnLockPattern.classList.remove('scale-75', 'opacity-50');
    }, 150);
});

btnSaveWallpaper.addEventListener('click', () => {
    if (store.isSaved(state)) return; // Already saved — heart stays red
    store.save(state);
    updateHeartUI(); // Fill red immediately
});


function openSavedModal() {
    savedModal.classList.remove('hidden');
    // small delay for transition
    requestAnimationFrame(() => {
        savedModalBackdrop.classList.remove('opacity-0');
        savedModalContent.classList.remove('opacity-0', 'scale-95');
        savedModalContent.classList.add('opacity-100', 'scale-100');
    });
    renderSavedModal('saved-list-container', (item) => {
        // Deep copy the saved item into state, excluding the 'id' field
        const { id, ...savedState } = item;
        Object.assign(state, savedState);
        
        // Sync custom palette inputs
        if (state.palette === 'custom' && state.customPalette) {
            updateCustomPaletteUI();
        }
        
        updateActiveUI();
        updateHeartUI();
        triggerUpdate();
        closeSavedModal();
    });
}

function closeSavedModal() {
    savedModalBackdrop.classList.add('opacity-0');
    savedModalContent.classList.add('opacity-0', 'scale-95');
    savedModalContent.classList.remove('opacity-100', 'scale-100');
    setTimeout(() => {
        savedModal.classList.add('hidden');
    }, 200);
}

btnOpenSaved.addEventListener('click', openSavedModal);
btnCloseSaved.addEventListener('click', closeSavedModal);
savedModalBackdrop.addEventListener('click', closeSavedModal);

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
    window.addEventListener('saved-wallpapers-changed', updateHeartUI);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('load', init);
}
