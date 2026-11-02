/** The element `<Render>` made for a node. Looked up by comparing, so an id needs no escaping. */
export const elementOf = (scope: HTMLElement, id: string) =>
  [...scope.querySelectorAll<HTMLElement>("[data-miditor-id]")].find(
    (element) => element.dataset.miditorId === id,
  ) ?? null;
