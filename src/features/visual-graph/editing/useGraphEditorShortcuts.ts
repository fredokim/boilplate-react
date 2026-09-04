import { useEffect } from 'react';

type ShortcutActions = { undo(): void; redo(): void; copy(): void; paste(): void; duplicate(): void; remove(): void; clearSelection(): void };

export function useGraphEditorShortcuts(actions: ShortcutActions) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === 'z') { event.preventDefault(); if (event.shiftKey) actions.redo(); else actions.undo(); }
      else if (command && event.key.toLowerCase() === 'y') { event.preventDefault(); actions.redo(); }
      else if (command && event.key.toLowerCase() === 'c') { event.preventDefault(); actions.copy(); }
      else if (command && event.key.toLowerCase() === 'v') { event.preventDefault(); actions.paste(); }
      else if (command && event.key.toLowerCase() === 'd') { event.preventDefault(); actions.duplicate(); }
      else if (event.key === 'Escape') actions.clearSelection();
      else if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); actions.remove(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);
}
