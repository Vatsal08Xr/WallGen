export const store = {
    getSaved() {
        try {
            const saved = JSON.parse(localStorage.getItem('wallgen_saved')) || [];
            let migrated = false;
            saved.forEach((item, idx) => {
                if (!item.id) {
                    item.id = `${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`;
                    migrated = true;
                }
            });
            if (migrated) {
                localStorage.setItem('wallgen_saved', JSON.stringify(saved));
            }
            return saved;
        } catch (e) {
            return [];
        }
    },
    isSaved(state) {
        const saved = this.getSaved();
        return saved.some(item => {
            if (item.theme !== state.theme || item.seed !== state.seed || item.palette !== state.palette) return false;
            if (state.palette === 'custom') {
                if (!item.customPalette || !state.customPalette) return false;
                return item.customPalette.bg === state.customPalette.bg && 
                       item.customPalette.colors.join(',') === state.customPalette.colors.join(',');
            }
            return true;
        });
    },
    save(wallpaperState) {
        if (this.isSaved(wallpaperState)) return; // Prevent duplicates
        const saved = this.getSaved();
        saved.push({
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            ...wallpaperState
        });
        localStorage.setItem('wallgen_saved', JSON.stringify(saved));
        window.dispatchEvent(new CustomEvent('saved-wallpapers-changed'));
    },
    remove(id) {
        let saved = this.getSaved();
        // Compare strictly as string since dataset id attributes are strings
        saved = saved.filter(item => String(item.id) !== String(id));
        localStorage.setItem('wallgen_saved', JSON.stringify(saved));
        window.dispatchEvent(new CustomEvent('saved-wallpapers-changed'));
    }
};

export function renderSavedModal(containerId, onRestore) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const saved = store.getSaved();
    if (saved.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-zinc-500 py-10">No saved wallpapers yet. Click the heart icon to save one!</div>';
        return;
    }

    container.innerHTML = saved.map(item => `
        <div class="relative group border border-zinc-200 dark:border-zinc-800 rounded-lg p-3 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer bg-zinc-50 dark:bg-zinc-900/50" data-id="${item.id}">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-8 h-8 rounded-md flex items-center justify-center bg-zinc-200 dark:bg-zinc-800">
                    <i data-lucide="${getIconForTheme(item.theme)}" class="w-4 h-4 text-zinc-600 dark:text-zinc-400"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold truncate text-zinc-900 dark:text-white">${item.themeName || item.theme}</h3>
                    <p class="text-xs text-zinc-500 truncate">${item.palette}</p>
                </div>
            </div>
            <div class="h-12 rounded-md w-full flex overflow-hidden border border-zinc-200 dark:border-zinc-800/50 opacity-80 group-hover:opacity-100 transition-opacity">
                ${renderPalettePreview(item)}
            </div>
            <button class="btn-delete-saved absolute -top-2 -right-2 bg-black dark:bg-white rounded-full p-1 shadow-md border border-zinc-300 dark:border-zinc-600 transition-transform hover:scale-110 z-10" style="box-shadow: 0 0 8px rgba(239, 68, 68, 0.5), 0 0 3px rgba(239, 68, 68, 0.3);" data-id="${item.id}">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 3px rgba(239, 68, 68, 0.6));"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>
    `).reverse().join('');

    // Re-initialize lucide icons for the new elements
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Attach click listeners for restore
    container.querySelectorAll('.group').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-delete-saved')) return; // ignore delete clicks
            const id = card.dataset.id;
            const item = store.getSaved().find(i => i.id === id);
            if (item && onRestore) onRestore(item);
        });
    });

    // Attach click listeners for delete
    container.querySelectorAll('.btn-delete-saved').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.id;
            store.remove(id);
            renderSavedModal(containerId, onRestore); // re-render
        });
    });
}

function renderPalettePreview(item) {
    if (item.palette === 'custom' && item.customPalette) {
        return `
            <div class="flex-1" style="background-color: ${item.customPalette.bg}"></div>
            ${item.customPalette.colors.map(c => `<div class="flex-1" style="background-color: ${c}"></div>`).join('')}
        `;
    }
    return `<div class="flex-1 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs text-zinc-400">Preset</div>`;
}

function getIconForTheme(theme) {
    const icons = {
        topography: 'map',
        fluidMesh: 'droplets',
        voronoi: 'hexagon',
        waveInterference: 'waves',
        particles: 'network',
        landscape: 'image',
        geometricCity: 'building-2',
        crystals: 'gem',
        nebula: 'cloud',
        gridGlitch: 'binary',
        flowField: 'wind',
        orbitals: 'aperture',
        shapes: 'shapes'
    };
    return icons[theme] || 'image';
}
