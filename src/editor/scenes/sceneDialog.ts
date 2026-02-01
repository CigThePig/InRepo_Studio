/**
 * Scene Dialog Components
 *
 * Modal dialogs for scene operations: create, rename, resize, delete.
 * Mobile-friendly with touch-friendly input sizing.
 */

import { validateSceneName, validateSceneDimensions, type SceneListItem } from './sceneManager';

const LOG_PREFIX = '[SceneDialog]';

// --- Types ---

export interface DialogResult<T> {
  confirmed: boolean;
  value?: T;
}

export interface CreateSceneDialogResult {
  name: string;
  width: number;
  height: number;
}

export interface RenameDialogResult {
  name: string;
}

export interface ResizeDialogResult {
  width: number;
  height: number;
}

// --- Styles ---

const DIALOG_STYLES = `
  .scene-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 16px;
  }

  .scene-dialog {
    background: #1a1a2e;
    border-radius: 12px;
    border: 1px solid #3a3a6e;
    padding: 20px;
    max-width: 320px;
    width: 100%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .scene-dialog__title {
    color: #fff;
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 16px 0;
    text-align: center;
  }

  .scene-dialog__field {
    margin-bottom: 16px;
  }

  .scene-dialog__label {
    display: block;
    color: #aab0d4;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .scene-dialog__input {
    width: 100%;
    min-height: 44px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #3a3a6e;
    background: #16213e;
    color: #fff;
    font-size: 16px;
    box-sizing: border-box;
  }

  .scene-dialog__input:focus {
    outline: none;
    border-color: #4a9eff;
  }

  .scene-dialog__input--error {
    border-color: #ff6b6b;
  }

  .scene-dialog__error {
    color: #ff6b6b;
    font-size: 12px;
    margin-top: 4px;
    min-height: 16px;
  }

  .scene-dialog__row {
    display: flex;
    gap: 12px;
  }

  .scene-dialog__row .scene-dialog__field {
    flex: 1;
  }

  .scene-dialog__actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .scene-dialog__btn {
    flex: 1;
    min-height: 44px;
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .scene-dialog__btn--cancel {
    background: #2a2a4e;
    color: #aab0d4;
    border: 1px solid #3a3a6e;
  }

  .scene-dialog__btn--cancel:active {
    background: #3a3a6e;
  }

  .scene-dialog__btn--confirm {
    background: #4a9eff;
    color: #fff;
  }

  .scene-dialog__btn--confirm:active {
    background: #3a7fd6;
  }

  .scene-dialog__btn--confirm:disabled {
    background: #3a3a6e;
    color: #666;
    cursor: not-allowed;
  }

  .scene-dialog__btn--danger {
    background: #ff6b6b;
    color: #1a0f14;
  }

  .scene-dialog__btn--danger:active {
    background: #e55555;
  }

  .scene-dialog__message {
    color: #aab0d4;
    font-size: 14px;
    text-align: center;
    margin-bottom: 16px;
    line-height: 1.4;
  }
`;

// --- Helpers ---

let styleInjected = false;

function injectStyles(): void {
  if (styleInjected) return;

  const style = document.createElement('style');
  style.textContent = DIALOG_STYLES;
  document.head.appendChild(style);
  styleInjected = true;
}

function createOverlay(): HTMLDivElement {
  const overlay = document.createElement('div');
  overlay.className = 'scene-dialog-overlay';
  return overlay;
}

function createDialog(): HTMLDivElement {
  const dialog = document.createElement('div');
  dialog.className = 'scene-dialog';
  return dialog;
}

// --- Create Scene Dialog ---

export function showCreateSceneDialog(
  defaultWidth: number,
  defaultHeight: number,
  existingScenes: SceneListItem[]
): Promise<DialogResult<CreateSceneDialogResult>> {
  injectStyles();

  return new Promise((resolve) => {
    const overlay = createOverlay();
    const dialog = createDialog();

    dialog.innerHTML = `
      <h2 class="scene-dialog__title">Create New Scene</h2>
      <div class="scene-dialog__field">
        <label class="scene-dialog__label">Scene Name</label>
        <input type="text" class="scene-dialog__input" id="scene-name-input" placeholder="Enter scene name" autocomplete="off">
        <div class="scene-dialog__error" id="name-error"></div>
      </div>
      <div class="scene-dialog__row">
        <div class="scene-dialog__field">
          <label class="scene-dialog__label">Width (tiles)</label>
          <input type="number" class="scene-dialog__input" id="scene-width-input" value="${defaultWidth}" min="1" max="500">
        </div>
        <div class="scene-dialog__field">
          <label class="scene-dialog__label">Height (tiles)</label>
          <input type="number" class="scene-dialog__input" id="scene-height-input" value="${defaultHeight}" min="1" max="500">
        </div>
      </div>
      <div class="scene-dialog__error" id="dimension-error"></div>
      <div class="scene-dialog__actions">
        <button type="button" class="scene-dialog__btn scene-dialog__btn--cancel" id="cancel-btn">Cancel</button>
        <button type="button" class="scene-dialog__btn scene-dialog__btn--confirm" id="confirm-btn">Create</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const nameInput = dialog.querySelector('#scene-name-input') as HTMLInputElement;
    const widthInput = dialog.querySelector('#scene-width-input') as HTMLInputElement;
    const heightInput = dialog.querySelector('#scene-height-input') as HTMLInputElement;
    const nameError = dialog.querySelector('#name-error') as HTMLDivElement;
    const dimError = dialog.querySelector('#dimension-error') as HTMLDivElement;
    const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
    const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;

    nameInput.focus();

    function validate(): boolean {
      let valid = true;

      // Validate name
      const nameValidation = validateSceneName(nameInput.value, [], undefined, existingScenes);
      if (!nameValidation.valid) {
        nameError.textContent = nameValidation.error ?? '';
        nameInput.classList.add('scene-dialog__input--error');
        valid = false;
      } else {
        nameError.textContent = '';
        nameInput.classList.remove('scene-dialog__input--error');
      }

      // Validate dimensions
      const width = parseInt(widthInput.value, 10);
      const height = parseInt(heightInput.value, 10);
      const dimValidation = validateSceneDimensions(width, height);
      if (!dimValidation.valid) {
        dimError.textContent = dimValidation.error ?? '';
        valid = false;
      } else {
        dimError.textContent = '';
      }

      confirmBtn.disabled = !valid;
      return valid;
    }

    nameInput.addEventListener('input', validate);
    widthInput.addEventListener('input', validate);
    heightInput.addEventListener('input', validate);

    function cleanup(): void {
      document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve({ confirmed: false });
    });

    confirmBtn.addEventListener('click', () => {
      if (!validate()) return;

      cleanup();
      resolve({
        confirmed: true,
        value: {
          name: nameInput.value.trim(),
          width: parseInt(widthInput.value, 10),
          height: parseInt(heightInput.value, 10),
        },
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    });

    // Initial validation
    validate();

    console.log(`${LOG_PREFIX} Create scene dialog shown`);
  });
}

// --- Rename Dialog ---

export function showRenameDialog(
  currentName: string,
  existingScenes: SceneListItem[],
  currentSceneId: string
): Promise<DialogResult<RenameDialogResult>> {
  injectStyles();

  return new Promise((resolve) => {
    const overlay = createOverlay();
    const dialog = createDialog();

    dialog.innerHTML = `
      <h2 class="scene-dialog__title">Rename Scene</h2>
      <div class="scene-dialog__field">
        <label class="scene-dialog__label">Scene Name</label>
        <input type="text" class="scene-dialog__input" id="scene-name-input" value="${currentName}" autocomplete="off">
        <div class="scene-dialog__error" id="name-error"></div>
      </div>
      <div class="scene-dialog__actions">
        <button type="button" class="scene-dialog__btn scene-dialog__btn--cancel" id="cancel-btn">Cancel</button>
        <button type="button" class="scene-dialog__btn scene-dialog__btn--confirm" id="confirm-btn">Rename</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const nameInput = dialog.querySelector('#scene-name-input') as HTMLInputElement;
    const nameError = dialog.querySelector('#name-error') as HTMLDivElement;
    const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
    const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;

    nameInput.focus();
    nameInput.select();

    function validate(): boolean {
      const nameValidation = validateSceneName(nameInput.value, [], currentSceneId, existingScenes);
      if (!nameValidation.valid) {
        nameError.textContent = nameValidation.error ?? '';
        nameInput.classList.add('scene-dialog__input--error');
        confirmBtn.disabled = true;
        return false;
      }

      nameError.textContent = '';
      nameInput.classList.remove('scene-dialog__input--error');
      confirmBtn.disabled = false;
      return true;
    }

    nameInput.addEventListener('input', validate);

    function cleanup(): void {
      document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve({ confirmed: false });
    });

    confirmBtn.addEventListener('click', () => {
      if (!validate()) return;

      cleanup();
      resolve({
        confirmed: true,
        value: { name: nameInput.value.trim() },
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    });

    validate();

    console.log(`${LOG_PREFIX} Rename dialog shown`);
  });
}

// --- Resize Dialog ---

export function showResizeDialog(
  currentWidth: number,
  currentHeight: number
): Promise<DialogResult<ResizeDialogResult>> {
  injectStyles();

  return new Promise((resolve) => {
    const overlay = createOverlay();
    const dialog = createDialog();

    dialog.innerHTML = `
      <h2 class="scene-dialog__title">Resize Scene</h2>
      <div class="scene-dialog__message">
        Shrinking the scene will remove tiles outside the new bounds.
      </div>
      <div class="scene-dialog__row">
        <div class="scene-dialog__field">
          <label class="scene-dialog__label">Width (tiles)</label>
          <input type="number" class="scene-dialog__input" id="scene-width-input" value="${currentWidth}" min="1" max="500">
        </div>
        <div class="scene-dialog__field">
          <label class="scene-dialog__label">Height (tiles)</label>
          <input type="number" class="scene-dialog__input" id="scene-height-input" value="${currentHeight}" min="1" max="500">
        </div>
      </div>
      <div class="scene-dialog__error" id="dimension-error"></div>
      <div class="scene-dialog__actions">
        <button type="button" class="scene-dialog__btn scene-dialog__btn--cancel" id="cancel-btn">Cancel</button>
        <button type="button" class="scene-dialog__btn scene-dialog__btn--confirm" id="confirm-btn">Resize</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const widthInput = dialog.querySelector('#scene-width-input') as HTMLInputElement;
    const heightInput = dialog.querySelector('#scene-height-input') as HTMLInputElement;
    const dimError = dialog.querySelector('#dimension-error') as HTMLDivElement;
    const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
    const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;

    widthInput.focus();
    widthInput.select();

    function validate(): boolean {
      const width = parseInt(widthInput.value, 10);
      const height = parseInt(heightInput.value, 10);
      const dimValidation = validateSceneDimensions(width, height);

      if (!dimValidation.valid) {
        dimError.textContent = dimValidation.error ?? '';
        confirmBtn.disabled = true;
        return false;
      }

      dimError.textContent = '';
      confirmBtn.disabled = false;
      return true;
    }

    widthInput.addEventListener('input', validate);
    heightInput.addEventListener('input', validate);

    function cleanup(): void {
      document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve({ confirmed: false });
    });

    confirmBtn.addEventListener('click', () => {
      if (!validate()) return;

      cleanup();
      resolve({
        confirmed: true,
        value: {
          width: parseInt(widthInput.value, 10),
          height: parseInt(heightInput.value, 10),
        },
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    });

    validate();

    console.log(`${LOG_PREFIX} Resize dialog shown`);
  });
}

// --- Delete Confirmation ---

export function showDeleteConfirmation(sceneName: string): Promise<boolean> {
  injectStyles();

  return new Promise((resolve) => {
    const overlay = createOverlay();
    const dialog = createDialog();

    dialog.innerHTML = `
      <h2 class="scene-dialog__title">Delete Scene</h2>
      <div class="scene-dialog__message">
        Are you sure you want to delete "<strong>${sceneName}</strong>"?<br>
        This cannot be undone.
      </div>
      <div class="scene-dialog__actions">
        <button type="button" class="scene-dialog__btn scene-dialog__btn--cancel" id="cancel-btn">Cancel</button>
        <button type="button" class="scene-dialog__btn scene-dialog__btn--danger" id="confirm-btn">Delete</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
    const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;

    function cleanup(): void {
      document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    confirmBtn.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });

    console.log(`${LOG_PREFIX} Delete confirmation shown`);
  });
}

// --- Duplicate Dialog ---

export function showDuplicateDialog(
  originalName: string,
  existingScenes: SceneListItem[]
): Promise<DialogResult<RenameDialogResult>> {
  injectStyles();

  // Generate a default name for the duplicate
  let duplicateName = `${originalName} (copy)`;
  let counter = 1;
  while (existingScenes.some(s => s.name.toLowerCase() === duplicateName.toLowerCase())) {
    counter++;
    duplicateName = `${originalName} (copy ${counter})`;
  }

  return new Promise((resolve) => {
    const overlay = createOverlay();
    const dialog = createDialog();

    dialog.innerHTML = `
      <h2 class="scene-dialog__title">Duplicate Scene</h2>
      <div class="scene-dialog__field">
        <label class="scene-dialog__label">New Scene Name</label>
        <input type="text" class="scene-dialog__input" id="scene-name-input" value="${duplicateName}" autocomplete="off">
        <div class="scene-dialog__error" id="name-error"></div>
      </div>
      <div class="scene-dialog__actions">
        <button type="button" class="scene-dialog__btn scene-dialog__btn--cancel" id="cancel-btn">Cancel</button>
        <button type="button" class="scene-dialog__btn scene-dialog__btn--confirm" id="confirm-btn">Duplicate</button>
      </div>
    `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const nameInput = dialog.querySelector('#scene-name-input') as HTMLInputElement;
    const nameError = dialog.querySelector('#name-error') as HTMLDivElement;
    const cancelBtn = dialog.querySelector('#cancel-btn') as HTMLButtonElement;
    const confirmBtn = dialog.querySelector('#confirm-btn') as HTMLButtonElement;

    nameInput.focus();
    nameInput.select();

    function validate(): boolean {
      const nameValidation = validateSceneName(nameInput.value, [], undefined, existingScenes);
      if (!nameValidation.valid) {
        nameError.textContent = nameValidation.error ?? '';
        nameInput.classList.add('scene-dialog__input--error');
        confirmBtn.disabled = true;
        return false;
      }

      nameError.textContent = '';
      nameInput.classList.remove('scene-dialog__input--error');
      confirmBtn.disabled = false;
      return true;
    }

    nameInput.addEventListener('input', validate);

    function cleanup(): void {
      document.body.removeChild(overlay);
    }

    cancelBtn.addEventListener('click', () => {
      cleanup();
      resolve({ confirmed: false });
    });

    confirmBtn.addEventListener('click', () => {
      if (!validate()) return;

      cleanup();
      resolve({
        confirmed: true,
        value: { name: nameInput.value.trim() },
      });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve({ confirmed: false });
      }
    });

    validate();

    console.log(`${LOG_PREFIX} Duplicate dialog shown`);
  });
}
