import { useEffect } from 'react';

/**
 * shortcuts: Array<{
 *   key: string,          // e.g. 'k', 'Space', 'ArrowRight', '?'
 *   meta?: boolean,       // Cmd / Ctrl
 *   shift?: boolean,
 *   description: string,
 *   action: () => void,
 * }>
 */
export function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    function handle(e) {
      // Skip when typing in form fields
      const tag = e.target.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag) || e.target.isContentEditable) return;

      for (const sc of shortcuts) {
        const keyMatch  = e.key === sc.key || e.code === sc.key;
        const metaMatch = sc.meta  ? (e.metaKey || e.ctrlKey) : true;
        const shiftMatch = sc.shift ? e.shiftKey : true;
        // If shortcut doesn't require meta/shift, make sure those modifiers aren't pressed
        // (to avoid conflicts with browser shortcuts)
        const noUnwantedMeta  = !sc.meta  ? !e.metaKey && !e.ctrlKey : true;
        const noUnwantedShift = !sc.shift ? true : true; // shift is OK for non-shift shortcuts

        if (keyMatch && metaMatch && shiftMatch && noUnwantedMeta) {
          e.preventDefault();
          sc.action();
          break;
        }
      }
    }

    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [shortcuts]);
}
