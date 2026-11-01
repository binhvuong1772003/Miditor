import { Editor, embedImage, type PageData, type SaveStatus } from "@midito-kitchen/editor";
import { vi } from "@midito-kitchen/editor/locales/vi";
import { useState } from "react";
import { actions } from "./actions";
import { demoIcons } from "./demo-icons";
import { fonts } from "./fonts";
import { HostDemo } from "./HostDemo";
import { components, renderers } from "./kinds";
import { loadUploaded, seedImages, storeUploaded } from "./library";
import { Preview } from "./Preview";
import { SentDataDialog } from "./SentDataDialog";
import { loadPage, storePage } from "./storage";
import { Twin } from "./Twin";
import { loadThemes, storeThemes, withId } from "./theme-store";
import { suggestedThemes } from "./themes";

/** `?reset` in the address drops the stored page; it is taken out of the address so a reload keeps the page. */
function openPage(): PageData {
  const url = new URL(window.location.href);
  const reset = url.searchParams.has("reset");
  if (reset) {
    url.searchParams.delete("reset");
    window.history.replaceState(null, "", url);
  }
  return loadPage(window.localStorage, reset);
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
  return <Playground />;
}

function Playground({ embedded = false }: { embedded?: boolean }) {
  const [page] = useState(openPage);
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

  return (
    <>
      <Editor
        data={page}
        config={{
          components,
          renderers,
          uploadImage,
          actions,
          fonts,
          images: [...uploaded, ...seedImages],
          // `?icons` swaps a few icons for the host's own, to show `config.icons`.
          ...(new URLSearchParams(window.location.search).has("icons") ? { icons: demoIcons } : {}),
          themes: [...saved, ...suggestedThemes],
          onThemeSave: (theme) => changeThemes([...saved, withId(theme, saved)]),
          onThemeRename: (id, name) =>
            changeThemes(saved.map((theme) => (theme.id === id ? { ...theme, name } : theme))),
          onThemeDelete: (id) => changeThemes(saved.filter((theme) => theme.id !== id)),
        }}
        // Autosave: a run of changes is one call, 800 ms after the last one and at least every 4 s.
        onChangeDebounce={{ wait: 800, maxWait: 4000 }}
        status={status}
        onChange={(data) => {
          setStatus("saving");
          storePage(window.localStorage, data);
          // A request to a back end takes a moment; this is that moment.
          window.setTimeout(() => setStatus("saved"), 300);
        }}
        onSave={(data) => setSent(JSON.stringify(data, null, 2))}
        // Inside a host that has its own navbar the editor shows no mark of its own.
        {...(embedded ? { logo: null } : {})}
        // `?lang=vi` shows the editor in Vietnamese.
        {...(new URLSearchParams(window.location.search).get("lang") === "vi"
          ? { i18n: { locale: "vi", messages: vi } }
          : {})}
        // `?dark` shows the dark scheme of the editor.
        {...(new URLSearchParams(window.location.search).has("dark")
          ? { appearance: { scheme: "dark" as const } }
          : {})}
        headerActions={
          <a className="preview-link" href="?preview" target="_blank" rel="noreferrer">
            Responsive preview
          </a>
        }
      />
      {sent !== null && <SentDataDialog json={sent} onClose={() => setSent(null)} />}
    </>
  );
}
