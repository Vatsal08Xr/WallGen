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
import { generate as drawShapes } from './generators/shapes.js';
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
    orbitals: drawOrbitals,
    shapes: drawShapes
};

// ----- Elements -----
const canvas = document.getElementById('mobile-preview-canvas');
if (!canvas) throw new Error('Mobile canvas not found');

const ctx = canvas.getContext('2d', { willReadFrequently: true });
const wrapper = document.getElementById('mobile-canvas-wrapper');
const outer = document.getElementById('mobile-canvas-container-outer');
const themeNameDisplay = document.getElementById('mobile-theme-name-display');
const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
const previewDesktopBtn = document.getElementById('mobile-preview-desktop-btn');
const previewIphoneBtn = document.getElementById('mobile-preview-iphone-btn');
const generateBtn = document.getElementById('mobile-btn-generate');
const dlDesktopBtn = document.getElementById('mobile-btn-dl-desktop');
const dlIphoneBtn = document.getElementById('mobile-btn-dl-iphone');
const customPaletteEditor = document.getElementById('mobile-custom-palette-editor');
const customBgColor = document.getElementById('mobile-custom-bg-color');
const customAccentColors = document.querySelectorAll('.mobile-custom-accent-color');

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

let mobileBgPickr = null;
let mobileAccentPickrs = [];

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

    const bgPickerEl = document.getElementById('mobile-custom-bg-color-picker');
    if (bgPickerEl) {
        mobileBgPickr = Pickr.create({
            el: bgPickerEl,
            default: state.customPalette.bg,
            defaultRepresentation: 'HEX',
            ...pickrOptions
        });
        
        mobileBgPickr.on('init', fixPickrInput);
        mobileBgPickr.on('change', (color) => {
            handleBgChange(color.toHEXA().toString());
        });
    }

    const accentPickerEls = document.querySelectorAll('.mobile-custom-accent-color-picker');
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
        mobileAccentPickrs.push(picker);
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
                triggerUpdate();
            });
        }
    };
    updateOption('mobile-particles-num', 'mobile-particles-num-val', 'particles', 'num');
    updateOption('mobile-wave-num', 'mobile-wave-num-val', 'waveInterference', 'num');
    updateOption('mobile-wave-amp', 'mobile-wave-amp-val', 'waveInterference', 'amp');
    updateOption('mobile-wave-thick', 'mobile-wave-thick-val', 'waveInterference', 'thick', true);

    updateOption('mobile-shapes-squares', 'mobile-shapes-squares-val', 'shapes', 'squares');
    updateOption('mobile-shapes-triangles', 'mobile-shapes-triangles-val', 'shapes', 'triangles');
    updateOption('mobile-shapes-circles', 'mobile-shapes-circles-val', 'shapes', 'circles');
    updateOption('mobile-shapes-size', 'mobile-shapes-size-val', 'shapes', 'size');
    updateOption('mobile-shapes-thick', 'mobile-shapes-thick-val', 'shapes', 'thick', true);

    const shapesFillToggle = document.getElementById('mobile-shapes-fill');
    if (shapesFillToggle) {
        shapesFillToggle.checked = state.themeOptions.shapes.fill;
        shapesFillToggle.addEventListener('change', (e) => {
            state.themeOptions.shapes.fill = e.target.checked;
            triggerUpdate();
        });
    }

    const shapesConnectToggle = document.getElementById('mobile-shapes-connect');
    if (shapesConnectToggle) {
        shapesConnectToggle.checked = state.themeOptions.shapes.connect;
        shapesConnectToggle.addEventListener('change', (e) => {
            state.themeOptions.shapes.connect = e.target.checked;
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
    if (mobileBgPickr) mobileBgPickr.setColor(state.customPalette.bg);
    if (customBgColor) customBgColor.value = state.customPalette.bg.toUpperCase();
    
    mobileAccentPickrs.forEach((picker, i) => {
        if (state.customPalette.colors[i]) picker.setColor(state.customPalette.colors[i]);
    });
    customAccentColors.forEach((input, i) => {
        if (state.customPalette.colors[i]) input.value = state.customPalette.colors[i].toUpperCase();
    });
}
const btnLockPattern = document.getElementById('mobile-btn-lock-pattern');
const btnSaveWallpaper = document.getElementById('mobile-btn-save-wallpaper');
const btnOpenSaved = document.getElementById('mobile-btn-open-saved');

// ----- State -----
const state = {
    theme: 'topography',
    themeName: 'Topography',
    palette: 'monochrome',
    isDark: document.documentElement.classList.contains('dark'),
    previewMode: 'desktop',
    seed: Math.random().toString(36).substring(2, 15),
    customPalette: { bg: '#18181b', colors: ['#3b82f6', '#8b5cf6', '#ec4899'] },
    isLocked: false,
    isCustomPaletteOpen: false,
    themeOptions: {
        particles: { num: 150 },
        waveInterference: { num: 3, amp: 100, thick: 2 },
        shapes: { squares: 20, triangles: 20, circles: 50, size: 100, thick: 2, fill: false, connect: false }
    }
};

try {
    const saved = localStorage.getItem('wallgen_session');
    if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(state, parsed);
        if (parsed.themeOptions) {
            state.themeOptions = {
                particles: { ...state.themeOptions.particles, ...parsed.themeOptions.particles },
                waveInterference: { ...state.themeOptions.waveInterference, ...parsed.themeOptions.waveInterference },
                shapes: { ...state.themeOptions.shapes, ...parsed.themeOptions.shapes }
            };
        }
    }
} catch(e) {}

document.documentElement.classList.toggle('dark', state.isDark);



// ----- Colors -----
function getColors() {
    if (state.palette === 'custom') return state.customPalette;
    const mode = state.isDark ? 'dark' : 'light';
    return palettes[state.palette]?.[mode] || palettes.monochrome[mode];
}

// ----- UI sync -----
function updateUI() {
    if (themeNameDisplay) themeNameDisplay.textContent = state.themeName;

    document.querySelectorAll('#mobile-theme-grid .theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === state.theme);
    });
    document.querySelectorAll('#mobile-palette-grid .palette-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.palette === state.palette);
    });

    const themeOptsContainer = document.getElementById('mobile-theme-options-container');
    const particlesOpts = document.getElementById('mobile-particles-options');
    const waveOpts = document.getElementById('mobile-wave-options');
    const shapesOpts = document.getElementById('mobile-shapes-options');
    
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
        customPaletteEditor?.classList.remove('hidden');
        
        const customBgSection = document.getElementById('mobile-custom-bg-section');
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
        customPaletteEditor?.classList.add('hidden');
    }

    // Preview toggle active state
    const desktopActive = state.previewMode === 'desktop';
    [previewDesktopBtn, previewIphoneBtn].forEach((btn, i) => {
        const active = (i === 0) === desktopActive;
        btn.style.background = active ? 'rgba(161,161,170,0.3)' : '';
        btn.style.color = active ? '' : 'rgba(161,161,170,0.7)';
    });

    wrapper.style.borderRadius = desktopActive ? '6px' : '22px';
    
    // Sync Lock Button State
    const lockIcon = btnLockPattern?.querySelector('svg') || btnLockPattern?.querySelector('i');
    if (lockIcon && generateBtn) {
        if (state.isLocked) {
            lockIcon.setAttribute('data-lucide', 'lock');
            btnLockPattern.classList.add('bg-zinc-900', 'text-white');
            btnLockPattern.classList.remove('bg-white', 'text-black');
            generateBtn.innerHTML = '<i data-lucide="palette" class="w-4 h-4"></i> Generate Colors';
        } else {
            lockIcon.setAttribute('data-lucide', 'unlock');
            btnLockPattern.classList.remove('bg-zinc-900', 'text-white');
            btnLockPattern.classList.add('bg-white', 'text-black');
            generateBtn.innerHTML = '<i data-lucide="shuffle" class="w-4 h-4"></i> Generate';
        }
        if(window.lucide) window.lucide.createIcons({ root: generateBtn.parentElement });
        if(window.lucide) window.lucide.createIcons({ root: btnLockPattern.parentElement });
    }
    
    updateHeartUI();
}

function updateHeartUI() {
    if (!btnSaveWallpaper) return;
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

// ----- Render -----
function render(width, height) {
    const generatorFn = generators[state.theme];
    if (!generatorFn) return;
    
    const colors = getColors();
    const rng = seedrandom(state.seed);
    generatorFn(ctx, width, height, colors, rng, state.themeOptions?.[state.theme]);
}

let renderTimeout;
function triggerUpdate() {
    try { localStorage.setItem('wallgen_session', JSON.stringify(state)); } catch(e) {}

    const ratio = state.previewMode === 'desktop' ? (16 / 9) : (1170 / 2532);
    const rect = outer.getBoundingClientRect();
    const availW = rect.width;
    const availH = rect.height;

    if (availW < 10 || availH < 10) return; // not laid out yet

    let w = availW;
    let h = w / ratio;
    if (h > availH) { h = availH; w = h * ratio; }

    // Floor to integers
    w = Math.floor(w);
    h = Math.floor(h);

    wrapper.style.width = `${w}px`;
    wrapper.style.height = `${h}px`;

    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        render(canvas.width, canvas.height);
    }, 60);
}

// ----- Event listeners -----
document.querySelectorAll('#mobile-theme-grid .theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.theme = btn.dataset.theme;
        state.themeName = btn.dataset.name;
        state.seed = Math.random().toString(36).substring(2, 15);
        updateUI();
        updateHeartUI();
        triggerUpdate();
    });
});

document.querySelectorAll('#mobile-palette-grid .palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.palette = btn.dataset.palette;
        state.isCustomPaletteOpen = (state.palette === 'custom');
        updateUI();
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
        updateCustomPaletteUI();
        updateHeartUI();
        triggerUpdate();
    }
};

if (customBgColor) customBgColor.addEventListener('input', (e) => handleBgChange(e.target.value, e.target));

const handleAccentChange = (val, index, inputEl = null) => {
    if (val.length > 0 && !val.startsWith('#')) {
        val = '#' + val;
        if (inputEl) inputEl.value = val;
    }
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        state.customPalette.colors[index] = val;
        updateCustomPaletteUI();
        updateHeartUI();
        triggerUpdate();
    }
};

customAccentColors.forEach((input, i) => {
    input.addEventListener('input', e => handleAccentChange(e.target.value, i, e.target));
});

mobileThemeToggle?.addEventListener('click', () => {
    state.isDark = !state.isDark;
    document.documentElement.classList.toggle('dark', state.isDark);
    updateHeartUI();
    updateUI();
    triggerUpdate();
});

generateBtn?.addEventListener('click', () => {
    if (state.isLocked) {
        const newColors = generateRandomPalette(state.isDark);
        state.palette = 'custom';
        state.customPalette = newColors;
        updateCustomPaletteUI();
        updateUI();
    } else {
        state.seed = Math.random().toString(36).substring(2, 15);
        updateHeartUI();
    }
    triggerUpdate();
});

btnLockPattern?.addEventListener('click', () => {
    state.isLocked = !state.isLocked;
    btnLockPattern.classList.add('scale-75', 'opacity-50');
    
    setTimeout(() => {
        updateUI();
        btnLockPattern.classList.remove('scale-75', 'opacity-50');
        triggerUpdate();
    }, 150);
});

btnSaveWallpaper?.addEventListener('click', () => {
    if (store.isSaved(state)) return; // Already saved — heart stays red
    store.save(state);
    updateHeartUI(); // Fill red immediately
});

btnOpenSaved?.addEventListener('click', () => {
    const savedModal = document.getElementById('saved-modal');
    const savedModalBackdrop = document.getElementById('saved-modal-backdrop');
    const savedModalContent = document.getElementById('saved-modal-content');
    
    if(!savedModal) return;
    
    savedModal.classList.remove('hidden');
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
        
        updateUI();
        updateHeartUI();
        triggerUpdate();
        
        // Close modal
        savedModalBackdrop.classList.add('opacity-0');
        savedModalContent.classList.add('opacity-0', 'scale-95');
        savedModalContent.classList.remove('opacity-100', 'scale-100');
        setTimeout(() => {
            savedModal.classList.add('hidden');
        }, 200);
    });
});

previewDesktopBtn?.addEventListener('click', () => {
    state.previewMode = 'desktop';
    updateUI();
    triggerUpdate();
});

previewIphoneBtn?.addEventListener('click', () => {
    state.previewMode = 'iphone';
    updateUI();
    triggerUpdate();
});

dlDesktopBtn?.addEventListener('click', () => {
    downloadCanvas(3840, 2160, generators[state.theme], getColors(), state.seed,
        `wallpaper-desktop-${state.theme}-${state.seed}.png`, state.themeOptions?.[state.theme]);
});

dlIphoneBtn?.addEventListener('click', () => {
    downloadCanvas(1290, 2796, generators[state.theme], getColors(), state.seed,
        `wallpaper-iphone-${state.theme}-${state.seed}.png`, state.themeOptions?.[state.theme]);
});

window.addEventListener('resize', triggerUpdate);

// ----- Init: use ResizeObserver so we render as soon as the container has real size -----
// This avoids the race condition where getBoundingClientRect returns 0 at module load time.
const ro = new ResizeObserver(entries => {
    for (const entry of entries) {
        if (entry.contentRect.width > 10 && entry.contentRect.height > 10) {
            triggerUpdate();
        }
    }
});
ro.observe(outer);

// Also run immediately in case layout is already done
updateUI();
updateCustomPaletteUI();
triggerUpdate();

window.addEventListener('saved-wallpapers-changed', updateHeartUI);
