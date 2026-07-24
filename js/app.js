import seedrandom from 'https://esm.sh/seedrandom@3.0.5';
import { showToast } from './toast.js';
import { initTutorial } from './tutorial.js';
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
import { generate as drawShapes } from './generators/shapes.js';
import { drawFluidArt } from './generators/fluidArt.js';
import { store, renderSavedModal } from './store.js';
import { generateRandomPalette } from './colorUtils.js';
import { getHitTarget as particlesHit } from './generators/particles.js';
import { getHitTarget as shapesHit } from './generators/shapes.js';
import { getHitTarget as wavesHit } from './generators/waveInterference.js';
import { getHitTarget as landscapeHit } from './generators/landscape.js';
import { getHitTarget as geometricCityHit } from './generators/geometricCity.js';

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
    orbitals: drawOrbitals,
    shapes: drawShapes,
    fluidArt: drawFluidArt
};

let state = {
    theme: 'topography',
    themeName: 'Topography',
    palette: 'monochrome',
    isDark: true,
    isWallpaperDark: true,
    previewMode: 'desktop',
    isLocked: false,
    isCustomPaletteOpen: false,
    seed: Math.random().toString(36).substring(2, 15),
    customPalette: {
        bg: '#18181b',
        colors: ['#3b82f6', '#8b5cf6', '#ec4899']
    },
    themeOptions: {
        particles: { num: 150 },
        waveInterference: { num: 3, amp: 100, thick: 2 },
        shapes: { squares: 20, triangles: 20, circles: 50, size: 100, thick: 2, fill: false, connect: false },
        fluidArt: { density: 50, turbulence: 50, cells: 50 }
    },
    interactiveObjects: {}
};

try {
    const saved = localStorage.getItem('wallgen_session');
    if (saved) {
        const parsed = JSON.parse(saved);
        state = { ...state, ...parsed };
        if (parsed.themeOptions) {
            state.themeOptions = {
                particles: { ...state.themeOptions.particles, ...parsed.themeOptions.particles },
                waveInterference: { ...state.themeOptions.waveInterference, ...parsed.themeOptions.waveInterference },
                shapes: { ...state.themeOptions.shapes, ...parsed.themeOptions.shapes },
                fluidArt: { ...state.themeOptions.fluidArt, ...parsed.themeOptions.fluidArt }
            };
        }
        // Restore isWallpaperDark (defaults to isDark for backward compat)
        if (parsed.isWallpaperDark === undefined && parsed.isDark !== undefined) {
            state.isWallpaperDark = parsed.isDark;
        }
        state.interactiveObjects = {};
    }
} catch(e) {}

document.documentElement.classList.toggle('dark', state.isDark);


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
const wallpaperThemeToggle = document.getElementById('wallpaper-theme-toggle');
const wallpaperThemeLabel = document.getElementById('wallpaper-theme-label');


const customPaletteEditor = document.getElementById('custom-palette-editor');
const customBgColor = document.getElementById('custom-bg-color');
const customAccentColors = document.querySelectorAll('.custom-accent-color');

const pickrOptions = {
    theme: 'nano',
    components: {
        preview: true,
        opacity: false,
        hue: true,
        interaction: {
            hex: false,
            rgba: false,
            hsla: false,
            input: true,
            clear: false,
            save: false
        }
    }
};

let bgPickr = null;
let accentPickrs = [];

// Initialize Pickrs after DOM load
document.addEventListener('DOMContentLoaded', () => {
    const fixPickrInput = (instance) => {
        const input = instance.getRoot().interaction.result;
        input.addEventListener('input', (e) => {
            let val = e.target.value;
            if (val.length > 0 && !val.startsWith('#')) {
                e.target.value = '#' + val;
                instance.setColor('#' + val);
            }
        });
    };

    const bgPickerEl = document.getElementById('custom-bg-color-picker');
    if (bgPickerEl) {
        bgPickr = Pickr.create({
            el: bgPickerEl,
            default: state.customPalette.bg,
            defaultRepresentation: 'HEX',
            ...pickrOptions
        });
        
        bgPickr.on('init', fixPickrInput);
        bgPickr.on('change', (color) => {
            handleBgChange(color.toHEXA().toString());
        });
    }

    const accentPickerEls = document.querySelectorAll('.custom-accent-color-picker');
    accentPickerEls.forEach((el, index) => {
        const picker = Pickr.create({
            el: el,
            default: state.customPalette.colors[index] || '#3b82f6',
            defaultRepresentation: 'HEX',
            ...pickrOptions
        });
        
        picker.on('init', fixPickrInput);
        picker.on('change', (color) => {
            handleAccentChange(color.toHEXA().toString(), index);
        });
        accentPickrs.push(picker);
    });

    // Theme options sliders setup
    const updateOption = (id, valId, theme, key, isFloat = false) => {
        const el = document.getElementById(id);
        const valEl = document.getElementById(valId);
        if (el && valEl) {
            el.value = state.themeOptions[theme][key];
            valEl.textContent = el.value;
            el.addEventListener('input', (e) => {
                valEl.textContent = e.target.value;
                state.themeOptions[theme][key] = isFloat ? parseFloat(e.target.value) : parseInt(e.target.value);
                state.interactiveObjects[theme] = {};
                triggerUpdate();
            });
        }
    };
    updateOption('particles-num', 'particles-num-val', 'particles', 'num');
    updateOption('wave-num', 'wave-num-val', 'waveInterference', 'num');
    updateOption('wave-amp', 'wave-amp-val', 'waveInterference', 'amp');
    updateOption('wave-thick', 'wave-thick-val', 'waveInterference', 'thick', true);
    
    updateOption('shapes-squares', 'shapes-squares-val', 'shapes', 'squares');
    updateOption('shapes-triangles', 'shapes-triangles-val', 'shapes', 'triangles');
    updateOption('shapes-circles', 'shapes-circles-val', 'shapes', 'circles');
    updateOption('shapes-size', 'shapes-size-val', 'shapes', 'size');
    updateOption('shapes-thick', 'shapes-thick-val', 'shapes', 'thick', true);

    const shapesFillToggle = document.getElementById('shapes-fill');
    if (shapesFillToggle) {
        shapesFillToggle.checked = state.themeOptions.shapes.fill;
        shapesFillToggle.addEventListener('change', (e) => {
            state.themeOptions.shapes.fill = e.target.checked;
            state.interactiveObjects['shapes'] = {};
            triggerUpdate();
        });
    }

    const shapesConnectToggle = document.getElementById('shapes-connect');
    if (shapesConnectToggle) {
        shapesConnectToggle.checked = state.themeOptions.shapes.connect;
        shapesConnectToggle.addEventListener('change', (e) => {
            state.themeOptions.shapes.connect = e.target.checked;
            state.interactiveObjects['shapes'] = {};
            triggerUpdate();
        });
    }

    // Reset buttons logic
    document.querySelectorAll('.reset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = e.currentTarget.dataset.target;
            const slider = document.getElementById(targetId);
            if (slider) {
                let defaultVal = 150;
                if (targetId.includes('particles-num')) defaultVal = 150;
                else if (targetId.includes('wave-num')) defaultVal = 3;
                else if (targetId.includes('wave-amp')) defaultVal = 100;
                else if (targetId.includes('wave-thick')) defaultVal = 2;
                else if (targetId.includes('shapes-squares')) defaultVal = 20;
                else if (targetId.includes('shapes-triangles')) defaultVal = 20;
                else if (targetId.includes('shapes-circles')) defaultVal = 50;
                else if (targetId.includes('shapes-size')) defaultVal = 100;
                else if (targetId.includes('shapes-thick')) defaultVal = 2;

                slider.value = defaultVal;
                slider.dispatchEvent(new Event('input'));
            }
        });
    });
});

function updateCustomPaletteUI() {
    if (bgPickr) bgPickr.setColor(state.customPalette.bg);
    if (customBgColor) customBgColor.value = state.customPalette.bg.toUpperCase();
    
    accentPickrs.forEach((picker, i) => {
        if (state.customPalette.colors[i]) picker.setColor(state.customPalette.colors[i]);
    });
    customAccentColors.forEach((input, i) => {
        if (state.customPalette.colors[i]) input.value = state.customPalette.colors[i].toUpperCase();
    });
}

function getColors() {
    if (state.palette === 'custom') {
        return state.customPalette;
    }
    return palettes[state.palette][state.isWallpaperDark ? 'dark' : 'light'];
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

    const themeOptsContainer = document.getElementById('theme-options-container');
    const particlesOpts = document.getElementById('particles-options');
    const waveOpts = document.getElementById('wave-options');
    const shapesOpts = document.getElementById('shapes-options');
    
    if (themeOptsContainer) {
        if (state.theme === 'particles' || state.theme === 'waveInterference' || state.theme === 'shapes') {
            themeOptsContainer.style.display = 'block';
            if (particlesOpts) particlesOpts.classList.toggle('hidden', state.theme !== 'particles');
            if (waveOpts) waveOpts.classList.toggle('hidden', state.theme !== 'waveInterference');
            if (shapesOpts) shapesOpts.classList.toggle('hidden', state.theme !== 'shapes');
        } else {
            themeOptsContainer.style.display = 'none';
        }
    }

    if (state.isCustomPaletteOpen) {
        customPaletteEditor.classList.remove('hidden');
        
        const customBgSection = document.getElementById('custom-bg-section');
        if (customBgSection) {
            if (state.theme === 'voronoi') customBgSection.classList.add('hidden');
            else customBgSection.classList.remove('hidden');
        }

        if (state.theme === 'topography') {
            customAccentColors.forEach((input, i) => {
                if (i > 0) input.parentElement.classList.add('hidden');
                else input.parentElement.classList.remove('hidden');
            });
        } else {
            customAccentColors.forEach(input => input.parentElement.classList.remove('hidden'));
        }
    } else {
        customPaletteEditor.classList.add('hidden');
    }

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
    
    // Sync Lock Button State
    const lockIcon = btnLockPattern.querySelector('svg') || btnLockPattern.querySelector('i');
    if (state.isLocked) {
        lockIcon.setAttribute('data-lucide', 'lock');
        btnLockPattern.classList.add('bg-zinc-900', 'text-white');
        btnLockPattern.classList.remove('bg-white', 'text-black');
        btnGenerate.innerHTML = '<i data-lucide="palette" class="w-4 h-4"></i> Generate Colors';
    } else {
        lockIcon.setAttribute('data-lucide', 'unlock');
        btnLockPattern.classList.remove('bg-zinc-900', 'text-white');
        btnLockPattern.classList.add('bg-white', 'text-black');
        btnGenerate.innerHTML = '<i data-lucide="shuffle" class="w-4 h-4"></i> Generate Variation';
    }
    lucide.createIcons();
    
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
    try { localStorage.setItem('wallgen_session', JSON.stringify(state)); } catch(e) {}
    
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
    
    // Ensure interactive objects bucket exists for this theme
    if (!state.interactiveObjects[state.theme]) {
        state.interactiveObjects[state.theme] = {};
    }
    const interactive = state.interactiveObjects[state.theme];
    
    generatorFn(ctx, width, height, colors, rng, state.themeOptions?.[state.theme], interactive);
}



window.addEventListener('resize', triggerUpdate);

themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const newTheme = btn.dataset.theme;
        const oldTheme = state.theme;
        state.theme = newTheme;
        state.themeName = btn.dataset.name;
        state.seed = Math.random().toString(36).substring(2, 15);
        state.interactiveObjects[state.theme] = {};
        updateActiveUI();
        updateHeartUI();
        triggerUpdate();
        
        if (oldTheme !== newTheme && ['particles', 'shapes', 'waveInterference', 'landscape', 'geometricCity'].includes(newTheme)) {
            if (!sessionStorage.getItem('wallgen_interactive_hint_' + newTheme)) {
                showToast('Tip: You can drag elements on the canvas to move them!', 4000);
                sessionStorage.setItem('wallgen_interactive_hint_' + newTheme, '1');
            }
        }
    });
});

paletteBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        state.palette = btn.dataset.palette;
        state.isCustomPaletteOpen = (state.palette === 'custom');
        state.interactiveObjects[state.theme] = {};
        updateActiveUI();
        updateHeartUI();
        triggerUpdate();
    });
});

const handleBgChange = (val, inputEl = null) => {
    if (val.length > 0 && !val.startsWith('#')) {
        val = '#' + val;
        if (inputEl) inputEl.value = val;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        state.customPalette.bg = val;
        state.interactiveObjects[state.theme] = {};
        updateCustomPaletteUI();
        updateHeartUI();
        triggerUpdate();
    }
};

customBgColor.addEventListener('input', (e) => handleBgChange(e.target.value, e.target));

const handleAccentChange = (val, index, inputEl = null) => {
    if (val.length > 0 && !val.startsWith('#')) {
        val = '#' + val;
        if (inputEl) inputEl.value = val;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        state.customPalette.colors[index] = val;
        state.interactiveObjects[state.theme] = {};
        updateCustomPaletteUI();
        updateHeartUI();
        triggerUpdate();
    }
};

customAccentColors.forEach((input, index) => {
    input.addEventListener('input', (e) => handleAccentChange(e.target.value, index, e.target));
});

themeToggle.addEventListener('click', () => {
    state.isDark = !state.isDark;
    document.documentElement.classList.toggle('dark', state.isDark);
    updateHeartUI();
    try { localStorage.setItem('wallgen_session', JSON.stringify(state)); } catch(e) {}
});

wallpaperThemeToggle.addEventListener('click', () => {
    state.isWallpaperDark = !state.isWallpaperDark;
    if (wallpaperThemeLabel) wallpaperThemeLabel.textContent = state.isWallpaperDark ? 'Dark' : 'Light';
    state.interactiveObjects[state.theme] = {};
    updateHeartUI();
    triggerUpdate();
});

btnGenerate.addEventListener('click', () => {
    if (state.isLocked) {
        // Randomize colors using HSL generator instead of new pattern
        const newColors = generateRandomPalette(state.isWallpaperDark);
        state.palette = 'custom';
        state.customPalette = newColors;
        updateCustomPaletteUI();
        updateActiveUI();
    } else {
        // Generate entirely new pattern variation
        state.seed = Math.random().toString(36).substring(2, 15);
        state.interactiveObjects[state.theme] = {};
        updateHeartUI();
    }
    triggerUpdate();
});

btnLockPattern.addEventListener('click', () => {
    state.isLocked = !state.isLocked;
    btnLockPattern.classList.add('scale-75', 'opacity-50');
    
    setTimeout(() => {
        updateActiveUI();
        btnLockPattern.classList.remove('scale-75', 'opacity-50');
        triggerUpdate();
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
    downloadCanvas(3840, 2160, generators[state.theme], getColors(), state.seed, `wallpaper-desktop-${state.theme}-${state.seed}.png`, state.themeOptions?.[state.theme]);
});

btnDlIphone.addEventListener('click', () => {
    downloadCanvas(1290, 2796, generators[state.theme], getColors(), state.seed, `wallpaper-iphone-${state.theme}-${state.seed}.png`, state.themeOptions?.[state.theme]);
});

function init() {
    lucide.createIcons();
    if (wallpaperThemeLabel) wallpaperThemeLabel.textContent = state.isWallpaperDark ? 'Dark' : 'Light';
    updateActiveUI();
    updateCustomPaletteUI();
    triggerUpdate();
    
    initTutorial();
    window.addEventListener('saved-wallpapers-changed', updateHeartUI);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    window.addEventListener('load', init);
}

// ─── Interactive Canvas (Drag Support) ──────────────────────────────────

const hitTesters = {
    particles: particlesHit,
    shapes: shapesHit,
    waveInterference: wavesHit,
    landscape: landscapeHit,
    geometricCity: geometricCityHit
};

let dragState = {
    dragging: false,
    theme: null,
    targetIndex: null,
    startX: 0,
    startY: 0,
    startObjX: 0,
    startObjY: 0
};

function canvasToPixel(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function getObjectsForTheme(theme) {
    const io = state.interactiveObjects[theme];
    if (!io) return null;
    if (theme === 'particles') return io.particles;
    if (theme === 'shapes') return io.shapes;
    if (theme === 'waveInterference') return io.waves;
    if (theme === 'landscape') return io.sun ? io : null;
    if (theme === 'geometricCity') return io.sun ? io : null;
    return null;
}

canvas.addEventListener('pointerdown', (e) => {
    const hitFn = hitTesters[state.theme];
    if (!hitFn) return;
    
    const { x, y } = canvasToPixel(e);
    const objects = getObjectsForTheme(state.theme);
    if (!objects) return;
    
    const hit = hitFn(x, y, objects);
    if (hit === -1 || hit === null) return;
    
    dragState.dragging = true;
    dragState.theme = state.theme;
    dragState.targetIndex = hit;
    dragState.startX = x;
    dragState.startY = y;
    
    if (state.theme === 'particles' && objects[hit]) {
        dragState.startObjX = objects[hit].x;
        dragState.startObjY = objects[hit].y;
    } else if (state.theme === 'shapes' && objects[hit]) {
        dragState.startObjX = objects[hit].x;
        dragState.startObjY = objects[hit].y;
    } else if (state.theme === 'waveInterference' && objects[hit]) {
        dragState.startObjX = objects[hit].xOffset || 0;
        dragState.startObjY = objects[hit].yCenter;
    } else if ((state.theme === 'landscape' || state.theme === 'geometricCity') && objects.sun) {
        dragState.startObjX = objects.sun.x;
        dragState.startObjY = objects.sun.y;
    }
    
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
});

canvas.addEventListener('pointermove', (e) => {
    // Update cursor on hover
    const hitFn = hitTesters[state.theme];
    if (hitFn && !dragState.dragging) {
        const { x, y } = canvasToPixel(e);
        const objects = getObjectsForTheme(state.theme);
        if (objects) {
            const hit = hitFn(x, y, objects);
            canvas.style.cursor = (hit !== -1 && hit !== null) ? 'grab' : '';
        }
    }
    
    if (!dragState.dragging) return;
    e.preventDefault();
    
    const { x, y } = canvasToPixel(e);
    const dx = x - dragState.startX;
    const dy = y - dragState.startY;
    const io = state.interactiveObjects[dragState.theme];
    
    if (dragState.theme === 'particles' && io.particles) {
        io.particles[dragState.targetIndex].x = dragState.startObjX + dx;
        io.particles[dragState.targetIndex].y = dragState.startObjY + dy;
    } else if (dragState.theme === 'shapes' && io.shapes) {
        io.shapes[dragState.targetIndex].x = dragState.startObjX + dx;
        io.shapes[dragState.targetIndex].y = dragState.startObjY + dy;
    } else if (dragState.theme === 'waveInterference' && io.waves) {
        io.waves[dragState.targetIndex].xOffset = dragState.startObjX + dx;
        io.waves[dragState.targetIndex].yCenter = dragState.startObjY + dy;
    } else if ((dragState.theme === 'landscape' || dragState.theme === 'geometricCity') && io.sun) {
        io.sun.x = dragState.startObjX + dx;
        io.sun.y = dragState.startObjY + dy;
    }
    
    // Fast re-render without debounce
    render(canvas.width, canvas.height);
});

canvas.addEventListener('pointerup', () => {
    if (dragState.dragging) {
        dragState.dragging = false;
        canvas.style.cursor = '';
    }
});

canvas.addEventListener('pointerleave', () => {
    if (dragState.dragging) {
        dragState.dragging = false;
        canvas.style.cursor = '';
    }
});
