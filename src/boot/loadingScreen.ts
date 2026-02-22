/**
 * Updates the visual progress bar and status text on the initial loading screen.
 * @param percent Number between 0 and 100
 * @param message Optional status message (e.g., "Loading assets...")
 */
export function updateLoadingProgress(percent: number, message?: string): void {
  const fillEl = document.getElementById('progress-fill');
  const textEl = document.getElementById('loading-text');

  if (fillEl) {
    const clamped = Math.min(100, Math.max(0, percent));
    fillEl.style.width = `${clamped}%`;
  }

  if (textEl && message) {
    textEl.textContent = message;
  }
}

/**
 * Fades out the loading screen and removes it from the DOM after the transition completes.
 */
export function hideLoadingScreen(): void {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) {
    loadingEl.classList.add('hidden');
    setTimeout(() => {
      loadingEl.remove();
    }, 400);
  }
}
