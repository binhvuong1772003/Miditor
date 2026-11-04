import {
  type Denial,
  Editor,
  type EditorController,
  type EditorProps,
  EditorProvider,
  embedImage,
  type HideName,
  type Overrides,
  type PageData,
  type Permissions,
  type SaveStatus,
  useCreateEditor,
} from "@miditor/editor";
import { vi } from "@miditor/editor/locales/vi";
import { type ReactNode, useState } from "react";
import { actions } from "./actions";
import { BareLayout, CanvasAndLayers, ComposeLayout, NoCanvasLayout } from "./ComposeDemo";
import { ControlDemo } from "./ControlDemo";
import { demoIcons } from "./demo-icons";
import { demoPlugin } from "./demo-plugin";
import { fonts } from "./fonts";
import { HostDemo } from "./HostDemo";
import { itemsSource } from "./items-source";
import { components, metadata, renderers } from "./kinds";
import { COFFEE_PAGE } from "./landing-coffee";
import { LANDING_PAGE } from "./landing-page";
import { loadUploaded, seedImages, storeUploaded } from "./library";
import { OutsideBar } from "./OutsideBar";
import {
  HostLogCount,
  overrides,
  overridesA,
  overridesB,
  throwingOverrides,
} from "./OverridesDemo";
import {
  DeniedNotice,
  hidden,
  lockedFooter,
  onDenied,
  PERMISSIONS_PAGE,
  PermissionsHeader,
  viewer,
} from "./PermissionsDemo";
import { Preview } from "./Preview";
import { ProductPicker } from "./ProductPicker";
import { pagesSource } from "./pages-source";
import { SentDataDialog } from "./SentDataDialog";
import { shopTool } from "./ShopTool";
import { loadPage, storePage } from "./storage";
import { Twin } from "./Twin";
import { loadThemes, storeThemes, withId } from "./theme-store";
import { suggestedThemes } from "./themes";

/** `?reset` in the address drops the stored page; it is taken out of the address so a reload keeps the page. */
function openPage(): PageData {
  const url = new URL(window.location.href);
  const landingName = url.searchParams.get("landing");
  const landing = landingName !== null;
  const reset = url.searchParams.has("reset") || landing;
  if (reset) {
    url.searchParams.delete("reset");
    url.searchParams.delete("landing");
    window.history.replaceState(null, "", url);
  }
  const page = loadPage(window.localStorage, reset);
  // `?landing` (or `?landing=coffee`, with no phone layout) opens a landing page made for trying the editor, in place of the stored page. It is
  // stored too, since `?preview` draws the stored page and would show the old one until a first edit.
  if (!landing) return page;
  const chosen = landingName === "coffee" ? COFFEE_PAGE : LANDING_PAGE;
  storePage(window.localStorage, chosen);
  return chosen;
}

/**
 * A stand-in for the host's upload (Cloudinary, S3...): it keeps the picture inside the page as a
 * `data:` address. `embedImage` makes a big picture smaller first, so any photo fits; a host with a
 * back end would use `postImage("/api/images")` here.
 */
const embed = embedImage();

export function App() {
  // `?preview` shows the stored page the way a visitor would get it, for any width.
  if (new URLSearchParams(window.location.search).has("preview")) return <Preview />;
  if (new URLSearchParams(window.location.search).has("twin")) return <Twin />;
  if (new URLSearchParams(window.location.search).has("host")) {
    return (
      <HostDemo>
        <Playground embedded />
      </HostDemo>
    );
  }
  if (new URLSearchParams(window.location.search).has("compose")) return <ComposePage />;
  if (new URLSearchParams(window.location.search).has("overrides")) return <OverridesPage />;
  if (new URLSearchParams(window.location.search).has("permissions")) return <PermissionsPage />;
  if (new URLSearchParams(window.location.search).has("control")) {
    if (new URLSearchParams(window.location.search).has("outside")) return <Outside />;
    // `?control&two` draws two editors on one page, each with its own host part.
    const two = new URLSearchParams(window.location.search).has("two");
    return two ? (
      <>
        <section data-testid="editor-a" style={{ blockSize: "90vh" }}>
          <Playground control />
        </section>
        <section data-testid="editor-b" style={{ blockSize: "90vh" }}>
          <Playground control />
        </section>
      </>
    ) : (
      <Playground control />
    );
  }
  return <Playground />;
}

/**
 * `?compose` lays the parts out inside `<EditorProvider>`; `&bare` is the canvas alone, `&nocanvas` has none,
 * `&two` draws two providers.
 */
function ComposePage() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("two")) {
    return (
      <>
        <section data-testid="editor-a" style={{ blockSize: "45vh" }}>
          <Playground layout={<CanvasAndLayers />} />
        </section>
        <section data-testid="editor-b" style={{ blockSize: "45vh" }}>
          <Playground layout={<CanvasAndLayers />} />
        </section>
      </>
    );
  }
  const layout = params.has("bare") ? (
    <BareLayout />
  ) : params.has("nocanvas") ? (
    <NoCanvasLayout />
  ) : (
    <ComposeLayout />
  );
  return (
    <section style={{ blockSize: "85vh" }}>
      <Playground layout={layout} />
    </section>
  );
}

/**
 * `?overrides` reshapes the editor through `overrides`; `&throw` has the header throw, `&two` draws two
 * editors with an `overrides` of their own each.
 */
function OverridesPage() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("two")) {
    return (
      <>
        <section data-testid="editor-a" style={{ blockSize: "45vh" }}>
          <Playground overrides={overridesA} />
        </section>
        <section data-testid="editor-b" style={{ blockSize: "45vh" }}>
          <Playground overrides={overridesB} />
        </section>
      </>
    );
  }
  return (
    <>
      <HostLogCount />
      <section style={{ blockSize: "85vh" }}>
        <Playground overrides={params.has("throw") ? throwingOverrides : overrides} />
      </section>
    </>
  );
}

/**
 * `?permissions` locks the footer block and hides two parts; `&viewer` lets nobody change anything. The
 * host's notice of the last refusal is drawn above the editor.
 */
function PermissionsPage() {
  const asViewer = new URLSearchParams(window.location.search).has("viewer");
  return (
    <>
      <DeniedNotice />
      <section style={{ blockSize: "85vh" }}>
        <Playground
          data={PERMISSIONS_PAGE}
          permissions={asViewer ? viewer : lockedFooter}
          hide={hidden}
          onDenied={onDenied}
          headerActions={<PermissionsHeader />}
        />
      </section>
    </>
  );
}

/**
 * `?control&outside`: a bar drawn outside the editor drives it through a controller. `&two` gives the
 * same controller to two editors (the second is ignored), `&closed` starts with the editor closed.
 */
function Outside() {
  const params = new URLSearchParams(window.location.search);
  const editor = useCreateEditor();
  const [open, setOpen] = useState(!params.has("closed"));
  return (
    <>
      <OutsideBar editor={editor} open={open} onToggle={() => setOpen(!open)} />
      {open &&
        (params.has("two") ? (
          <>
            <section data-testid="editor-a" style={{ blockSize: "80vh" }}>
              <Playground controller={editor} />
            </section>
            <section data-testid="editor-b" style={{ blockSize: "80vh" }}>
              <Playground controller={editor} />
            </section>
          </>
        ) : (
          <section style={{ blockSize: "85vh" }}>
            <Playground controller={editor} />
          </section>
        ))}
    </>
  );
}

function Playground({
  embedded = false,
  control = false,
  controller,
  overrides: given,
  data,
  permissions,
  hide,
  onDenied: denied,
  headerActions,
  layout,
}: {
  embedded?: boolean;
  control?: boolean;
  controller?: EditorController;
  overrides?: Overrides;
  data?: PageData;
  permissions?: Permissions;
  hide?: readonly HideName[];
  onDenied?: (denial: Denial) => void;
  headerActions?: ReactNode;
  /** The host's own layout of the parts; without it the editor draws its default one. */
  layout?: ReactNode;
}) {
  // A demo that brings its own page (`data`) keeps the stored one out of it.
  const [page] = useState(() => data ?? openPage());
  const plain = new URLSearchParams(window.location.search).has("plain");
  // What `onSave` was given, shown in a pop-up in place of a request to a back end.
  const [uploaded, setUploaded] = useState(() => loadUploaded(window.localStorage));
  // Like a real host, the upload also puts the picture in the library the editor shows.
  const uploadImage = async (file: File) => {
    const url = await embed(file);
    const next = [{ url, name: file.name }, ...uploaded.filter((image) => image.url !== url)];
    setUploaded(next);
    storeUploaded(window.localStorage, next);
    return url;
  };
  const [sent, setSent] = useState<string | null>(null);
  // How the stand-in "server" is doing, for the header. A real host sets it from its own request.
  const [status, setStatus] = useState<SaveStatus>("saved");
  // The themes a person saved: stored here, as a real host would store them in its database.
  const [saved, setSaved] = useState(() => loadThemes(window.localStorage));
  const changeThemes = (next: typeof saved) => {
    storeThemes(window.localStorage, next);
    setSaved(next);
  };

  // The props both paths share: the default `<Editor>` and the host's `<EditorProvider>`.
  const editorProps: EditorProps = {
    data: page,
    metadata,
    config: {
      components,
      renderers,
      uploadImage,
      actions,
      fonts,
      images: [...uploaded, ...seedImages],
      // `?icons` swaps a few icons for the host's own, to show `config.icons`.
      ...(new URLSearchParams(window.location.search).has("icons") ? { icons: demoIcons } : {}),
      themes: [...saved, ...suggestedThemes],
      // `?nopicker` leaves the product picker out, to show the note a kind with no input gets.
      ...(new URLSearchParams(window.location.search).has("nopicker")
        ? {}
        : { customFields: { "product-picker": ProductPicker } }),
      // `?nosource` leaves the list of pages out, to show the note a field with no list gets.
      ...(new URLSearchParams(window.location.search).has("nosource")
        ? {}
        : { sources: { pages: pagesSource, items: itemsSource } }),
      // `?tools` puts a tool of the host on the rail, with its own panel.
      ...(new URLSearchParams(window.location.search).has("tools") ? { tools: [shopTool] } : {}),
      onThemeSave: (theme) => changeThemes([...saved, withId(theme, saved)]),
      onThemeRename: (id, name) =>
        changeThemes(saved.map((theme) => (theme.id === id ? { ...theme, name } : theme))),
      onThemeDelete: (id) => changeThemes(saved.filter((theme) => theme.id !== id)),
    },
    // Autosave: a run of changes is one call, 800 ms after the last one and at least every 4 s.
    // `?plain` is a host that sets neither: onChange at once, and the header follows the Save button.
    ...(plain ? {} : { onChangeDebounce: { wait: 800, maxWait: 4000 }, status }),
    // The host is told of each change that was kept: what was done and the pages around it. A real host
    // would log it or send it; here it is kept on `window` for a test to read.
    onAction: (action, page, prevPage) => {
      const w = window as unknown as { __actions?: object[] };
      w.__actions = w.__actions ?? [];
      w.__actions.push({
        type: action.type,
        ids: action.ids,
        blocks: page.root.children.length,
        before: prevPage.root.children.length,
      });
    },
    onChange: (data) => {
      setStatus("saving");
      storePage(window.localStorage, data);
      // A request to a back end takes a moment; this is that moment.
      window.setTimeout(() => setStatus("saved"), 300);
    },
    ...(controller ? { controller } : {}),
    // `?plugin` gives the editor a plugin: a bundle of overrides, hidden parts and a tool.
    ...(new URLSearchParams(window.location.search).has("plugin") ? { plugins: [demoPlugin] } : {}),
    ...(given ? { overrides: given } : {}),
    ...(permissions ? { permissions } : {}),
    ...(hide ? { hide } : {}),
    ...(denied ? { onDenied: denied } : {}),
    onSave: (data) => setSent(JSON.stringify(data, null, 2)),
    // Inside a host that has its own navbar the editor shows no mark of its own.
    ...(embedded ? { logo: null } : {}),
    // `?lang=vi` shows the editor in Vietnamese.
    ...(new URLSearchParams(window.location.search).get("lang") === "vi"
      ? { i18n: { locale: "vi", messages: vi } }
      : {}),
    // `?dark` shows the dark scheme of the editor.
    ...(new URLSearchParams(window.location.search).has("dark")
      ? { appearance: { scheme: "dark" as const } }
      : {}),
    headerActions: headerActions ? (
      headerActions
    ) : control ? (
      <ControlDemo />
    ) : (
      <a className="preview-link" href="?preview" target="_blank" rel="noreferrer">
        Responsive preview
      </a>
    ),
  };

  return (
    <>
      {layout === undefined ? (
        <Editor {...editorProps} />
      ) : (
        <EditorProvider {...editorProps}>{layout}</EditorProvider>
      )}
      {sent !== null && <SentDataDialog json={sent} onClose={() => setSent(null)} />}
    </>
  );
}
