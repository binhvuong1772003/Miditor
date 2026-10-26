/**
 * True for a field where a person types: keys pressed there belong to the field, not to the editor's
 * shortcuts (Esc to clear the selection, and later Delete and the arrow keys).
 */
export function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])") !==
      null
  );
}
