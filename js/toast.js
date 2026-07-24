export function showToast(message, duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-full shadow-lg text-sm font-medium opacity-0 transition-all duration-300 transform translate-y-4 scale-95';
    toast.textContent = message;
    
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', 'translate-y-4', 'scale-95');
            toast.classList.add('opacity-100', 'translate-y-0', 'scale-100');
        });
    });

    // Animate out
    setTimeout(() => {
        toast.classList.remove('opacity-100', 'translate-y-0', 'scale-100');
        toast.classList.add('opacity-0', 'translate-y-4', 'scale-95');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, duration);
}
