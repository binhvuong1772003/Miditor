const find = (scope: ParentNode, id: string) =>
  [...scope.querySelectorAll<HTMLElement>("[data-miditor-id]")].find(
    (element) => element.dataset.miditorId === id,
  ) ?? null;

/**
 * The element `<Render>` made for a node. Looked up by comparing, so an id needs no escaping. When the page is
 * drawn in a frame, the blocks are in the document of that frame: it is looked in too.
 */
export const elementOf = (scope: HTMLElement, id: string) =>
  find(scope, id) ??
  find(
    scope.querySelector<HTMLIFrameElement>("iframe[title='Page']")?.contentDocument ?? scope,
    id,
  );
