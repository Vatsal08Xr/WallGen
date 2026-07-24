export function initTutorial() {
    if (localStorage.getItem('wallgen_tutorial_completed')) return;

    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;

    // Overlay is transparent but captures clicks so user must use tutorial buttons
    overlay.style.cssText = '';
    overlay.className = "fixed inset-0 z-[100]";
    overlay.style.pointerEvents = 'auto';

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

    function advance() {
        currentStep++;
        renderStep();
    }

    function renderStep() {
        if (currentStep >= steps.length) {
            completeTutorial();
            return;
        }

        overlay.innerHTML = '';
        overlay.classList.remove('hidden');
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

        // Scroll button into view instantly to avoid bounding rect issues during smooth scroll
        btn.scrollIntoView({ behavior: 'auto', block: 'center' });

        // Small delay to ensure layout has settled (using auto scroll means it's instant)
        setTimeout(() => {
            const rect = btn.getBoundingClientRect();
            const btnCX = rect.left + rect.width / 2;
            const btnCY = rect.top + rect.height / 2;

            const isDark = document.documentElement.classList.contains('dark');
            const strokeColor = isDark ? '#ffffff' : '#000000';

            // --- Build popup ---
            const popup = document.createElement('div');
            popup.style.position = 'absolute';
            popup.style.pointerEvents = 'auto';
            popup.style.width = '260px';
            popup.style.padding = '16px';
            popup.style.borderRadius = '12px';
            popup.style.border = `2px solid ${strokeColor}`;
            popup.style.background = isDark ? '#000' : '#fff';
            popup.style.color = isDark ? '#fff' : '#000';
            popup.style.boxShadow = '0 10px 40px rgba(0,0,0,0.3)';
            popup.style.zIndex = '10';
            popup.style.display = 'flex';
            popup.style.flexDirection = 'column';
            popup.style.gap = '10px';
            popup.style.fontFamily = 'inherit';

            popup.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:14px;font-weight:600;">Tutorial</span>
                    <span style="font-size:12px;opacity:0.6;">${currentStep + 1}/${steps.length}</span>
                </div>
                <p style="font-size:14px;line-height:1.5;margin:0;">${step.text}</p>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
                    <span id="tutorial-skip-btn" style="font-size:13px;opacity:0.5;cursor:pointer;text-decoration:none;">Skip</span>
                    <button id="tutorial-next-btn" style="
                        padding:6px 18px;font-size:13px;border-radius:9999px;font-weight:500;cursor:pointer;
                        border:none;
                        background:${isDark ? '#fff' : '#000'};
                        color:${isDark ? '#000' : '#fff'};
                    ">${currentStep === steps.length - 1 ? 'Got it!' : 'Next'}</button>
                </div>
            `;

            overlay.appendChild(popup);

            // --- Attach event listeners AFTER element is in the DOM ---
            const nextBtn = popup.querySelector('#tutorial-next-btn');
            const skipBtn = popup.querySelector('#tutorial-skip-btn');

            const handleNext = (e) => {
                e.preventDefault();
                e.stopPropagation();
                advance();
            };

            const handleSkip = (e) => {
                e.preventDefault();
                e.stopPropagation();
                completeTutorial();
            };

            if (nextBtn) {
                nextBtn.onclick = handleNext;
                nextBtn.ontouchstart = handleNext;
            }
            if (skipBtn) {
                skipBtn.onclick = handleSkip;
                skipBtn.ontouchstart = handleSkip;
            }

            // --- Position the popup ---
            const isMobile = window.innerWidth < 768;
            const popupW = 260;
            const popupH = popup.offsetHeight || 180;

            let px, py;
            if (isMobile) {
                px = (window.innerWidth - popupW) / 2;
                if (btnCY < window.innerHeight / 2) {
                    py = btnCY + rect.height / 2 + 40;
                } else {
                    py = btnCY - rect.height / 2 - popupH - 40;
                }
            } else {
                // Place popup to the left of the button, shifted right enough to stay on screen
                px = btnCX - popupW - 30;
                py = btnCY - popupH / 2;
            }

            // Clamp to viewport
            px = Math.max(12, Math.min(window.innerWidth - popupW - 12, px));
            py = Math.max(12, Math.min(window.innerHeight - popupH - 12, py));

            popup.style.left = px + 'px';
            popup.style.top = py + 'px';

            // --- Draw the curved arrow using an inline SVG ---
            requestAnimationFrame(() => {
                const popupRect = popup.getBoundingClientRect();

                // Find the closest edge point of the popup to the button
                let startX, startY;

                // Determine which edge to start from
                if (btnCX > popupRect.right) {
                    // Button is to the right of popup
                    startX = popupRect.right;
                    startY = Math.max(popupRect.top + 10, Math.min(popupRect.bottom - 10, btnCY));
                } else if (btnCX < popupRect.left) {
                    // Button is to the left of popup
                    startX = popupRect.left;
                    startY = Math.max(popupRect.top + 10, Math.min(popupRect.bottom - 10, btnCY));
                } else if (btnCY > popupRect.bottom) {
                    // Button is below popup
                    startX = Math.max(popupRect.left + 10, Math.min(popupRect.right - 10, btnCX));
                    startY = popupRect.bottom;
                } else {
                    // Button is above popup
                    startX = Math.max(popupRect.left + 10, Math.min(popupRect.right - 10, btnCX));
                    startY = popupRect.top;
                }

                // Corners of the button
                const corners = [
                    { x: rect.left, y: rect.top },
                    { x: rect.right, y: rect.top },
                    { x: rect.left, y: rect.bottom },
                    { x: rect.right, y: rect.bottom }
                ];
                
                let tipX = corners[0].x, tipY = corners[0].y;
                let minDist = Infinity;
                corners.forEach(c => {
                    const d = Math.hypot(c.x - startX, c.y - startY);
                    if (d < minDist) {
                        minDist = d;
                        tipX = c.x;
                        tipY = c.y;
                    }
                });
                
                // Offset tip slightly outwards from the button center
                const cx = rect.left + rect.width / 2;
                const cy = rect.top + rect.height / 2;
                tipX += Math.sign(tipX - cx) * 6;
                tipY += Math.sign(tipY - cy) * 6;

                // Control point for the quadratic bezier curve
                const midX = (startX + tipX) / 2;
                const midY = (startY + tipY) / 2;
                
                const dxTip = tipX - startX;
                const dyTip = tipY - startY;
                const tipDist = Math.hypot(dxTip, dyTip) || 1;
                
                // Perpendicular vector for the curve
                const perpX = -dyTip / tipDist;
                const perpY = dxTip / tipDist;
                const curvature = Math.min(30, tipDist * 0.2);
                
                const cpX = midX + perpX * curvature;
                const cpY = midY + perpY * curvature;

                // Compute the arrowhead direction from the tangent at t=1 of the quadratic bezier
                // Tangent at t=1: 2*(P2 - P1) where P0=start, P1=cp, P2=tip
                const tangentX = tipX - cpX;
                const tangentY = tipY - cpY;
                const tLen = Math.hypot(tangentX, tangentY) || 1;
                const ux = tangentX / tLen;
                const uy = tangentY / tLen;

                // V-shaped arrowhead lines (inverted V pointing toward the button)
                const headLen = 10;
                const headAngle = Math.PI / 7; // Narrower V

                const leftX = tipX - headLen * (ux * Math.cos(headAngle) - uy * Math.sin(headAngle));
                const leftY = tipY - headLen * (uy * Math.cos(headAngle) + ux * Math.sin(headAngle));
                const rightX = tipX - headLen * (ux * Math.cos(-headAngle) - uy * Math.sin(-headAngle));
                const rightY = tipY - headLen * (uy * Math.cos(-headAngle) + ux * Math.sin(-headAngle));

                const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svgEl.setAttribute('width', '100%');
                svgEl.setAttribute('height', '100%');
                svgEl.style.position = 'fixed'; // Use fixed to match the overlay's bounds perfectly
                svgEl.style.top = '0';
                svgEl.style.left = '0';
                svgEl.style.pointerEvents = 'none';
                svgEl.style.overflow = 'visible';
                svgEl.style.zIndex = '5';

                // Curved line
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${startX} ${startY} Q ${cpX} ${cpY} ${tipX} ${tipY}`);
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', strokeColor);
                path.setAttribute('stroke-width', '2');
                path.setAttribute('stroke-dasharray', '3 4'); // Dotted line effect

                // Arrowhead — two lines forming a V
                const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                arrow.setAttribute('d', `M ${leftX} ${leftY} L ${tipX} ${tipY} L ${rightX} ${rightY}`);
                arrow.setAttribute('fill', 'none');
                arrow.setAttribute('stroke', strokeColor);
                arrow.setAttribute('stroke-width', '2');
                arrow.setAttribute('stroke-linecap', 'round');
                arrow.setAttribute('stroke-linejoin', 'round');

                svgEl.appendChild(path);
                svgEl.appendChild(arrow);
                overlay.appendChild(svgEl);
            });
        }, 50);
    }

    function completeTutorial() {
        localStorage.setItem('wallgen_tutorial_completed', '1');
        overlay.innerHTML = '';
        overlay.classList.add('hidden');
    }

    // Wait a brief moment for the UI to settle before rendering
    setTimeout(renderStep, 600);
}
