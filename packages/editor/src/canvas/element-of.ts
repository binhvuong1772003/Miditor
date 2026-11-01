/** The element `<Render>` made for a node. Looked up by comparing, so an id needs no escaping. */
export const elementOf = (scope: HTMLElement, id: string) =>
  [...scope.querySelectorAll<HTMLElement>("[data-midito-id]")].find(
    (element) => element.dataset.miditoId === id,
  ) ?? null;
