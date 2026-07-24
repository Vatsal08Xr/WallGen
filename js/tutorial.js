export function initTutorial() {
    if (localStorage.getItem('wallgen_tutorial_completed')) return;

    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;

    overlay.className = "fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm transition-opacity";

    const steps = [
        {
            text: 'Lock Pattern: Pin your current settings so they aren\'t randomized when you change themes.',
            desktopBtn: 'btn-lock-pattern',
            mobileBtn: 'mobile-btn-lock-pattern'
        },
        {
            text: 'Save Wallpaper: Love this one? Save it to your collection!',
            desktopBtn: 'btn-save-wallpaper',
            mobileBtn: 'mobile-btn-save-wallpaper'
        },
        {
            text: 'Saved Wallpapers: View and restore your saved creations here.',
            desktopBtn: 'btn-open-saved',
            mobileBtn: 'mobile-btn-open-saved'
        }
    ];

    let currentStep = 0;

    function renderStep() {
        if (currentStep >= steps.length) {
            completeTutorial();
            return;
        }

        overlay.innerHTML = '';
        const step = steps[currentStep];
        
        let btn = document.getElementById(step.desktopBtn);
        if (!btn || btn.offsetParent === null) {
            btn = document.getElementById(step.mobileBtn);
        }
        
        if (!btn || btn.offsetParent === null) {
            currentStep++;
            renderStep();
            return;
        }

        const rect = btn.getBoundingClientRect();
        const btnCX = rect.left + rect.width / 2;
        const btnCY = rect.top + rect.height / 2;
        
        const isMobile = window.innerWidth < 768;
        const isDark = document.documentElement.classList.contains('dark');
        const strokeColor = isDark ? '#ffffff' : '#000000';
        
        const svg = document.createElement('div');
        svg.className = 'absolute inset-0 pointer-events-none';
        svg.innerHTML = `
            <svg width="100%" height="100%" style="overflow: visible;">
                <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="${strokeColor}" />
                    </marker>
                </defs>
                <path d="" fill="none" stroke="${strokeColor}" stroke-width="2" stroke-dasharray="4" marker-end="url(#arrowhead)" />
            </svg>
        `;
        
        const popup = document.createElement('div');
        popup.className = `absolute transform -translate-x-1/2 -translate-y-1/2 rounded-xl p-4 shadow-2xl border-2 w-64 flex flex-col gap-3 pointer-events-auto
            ${isDark ? 'bg-black text-white border-white' : 'bg-white text-black border-black'}`;
        
        // Initial dummy position
        popup.style.left = `50%`;
        popup.style.top = `50%`;
        
        popup.innerHTML = `
            <div class="text-sm font-semibold flex justify-between items-center mb-1">
                <span>Tutorial</span>
                <span class="text-xs opacity-70">${currentStep + 1}/${steps.length}</span>
            </div>
            <p class="text-sm">${step.text}</p>
            <div class="flex justify-end mt-2">
                <button id="tutorial-next-btn" class="px-4 py-1.5 text-sm rounded-full font-medium transition-colors
                    ${isDark ? 'bg-white text-black hover:bg-zinc-200' : 'bg-black text-white hover:bg-zinc-800'}">
                    ${currentStep === steps.length - 1 ? 'Got it!' : 'Next'}
                </button>
            </div>
        `;
        
        overlay.appendChild(svg);
        overlay.appendChild(popup);
        
        document.getElementById('tutorial-next-btn').addEventListener('click', () => {
            currentStep++;
            renderStep();
        });
        
        // Compute correct positions
        requestAnimationFrame(() => {
            const pRect = popup.getBoundingClientRect();
            
            let targetX, targetY;
            if (isMobile) {
                targetX = window.innerWidth / 2;
                if (btnCY < window.innerHeight / 2) {
                    targetY = btnCY + pRect.height / 2 + 50;
                } else {
                    targetY = btnCY - pRect.height / 2 - 50;
                }
            } else {
                targetX = btnCX - pRect.width / 2 - 80;
                targetY = btnCY;
                targetY = Math.max(pRect.height/2 + 20, Math.min(window.innerHeight - pRect.height/2 - 20, targetY));
            }
            
            popup.style.left = `${targetX}px`;
            popup.style.top = `${targetY}px`;
            
            requestAnimationFrame(() => {
                const newPRect = popup.getBoundingClientRect();
                
                let edgeX = targetX;
                let edgeY = targetY;
                
                if (btnCX > newPRect.right) edgeX = newPRect.right + 5;
                else if (btnCX < newPRect.left) edgeX = newPRect.left - 5;
                
                if (btnCY > newPRect.bottom) edgeY = newPRect.bottom + 5;
                else if (btnCY < newPRect.top) edgeY = newPRect.top - 5;
                
                // Curve approach
                let cpX = edgeX;
                let cpY = btnCY;
                
                let destX = btnCX;
                let destY = btnCY;
                
                if (btnCX > edgeX) destX -= 25;
                else if (btnCX < edgeX) destX += 25;
                
                if (Math.abs(btnCX - edgeX) < 40) {
                    if (btnCY > edgeY) destY -= 25;
                    else destY += 25;
                    destX = btnCX;
                }

                const newPathData = `M ${edgeX} ${edgeY} Q ${cpX} ${cpY} ${destX} ${destY}`;
                overlay.querySelector('path').setAttribute('d', newPathData);
            });
        });
    }

    function completeTutorial() {
        localStorage.setItem('wallgen_tutorial_completed', '1');
        overlay.classList.add('hidden');
        overlay.innerHTML = '';
        overlay.className = "fixed inset-0 z-[100] pointer-events-none hidden";
    }

    // Wait a brief moment for the UI to settle before rendering
    setTimeout(renderStep, 500);
}
