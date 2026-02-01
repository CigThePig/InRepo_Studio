/**
 * Download Helpers
 *
 * Small browser-side utilities for saving JSON/text blobs to a local file.
 */

export function downloadJson(filename: string, data: unknown): void {
  const json = JSON.stringify(data, null, 2);
  downloadText(filename, json, 'application/json');
}

export function downloadText(
  filename: string,
  content: string,
  mimeType = 'text/plain'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup on next tick to allow the click to start download.
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 0);
}
