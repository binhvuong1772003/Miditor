import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./playground.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

// `VITE_STRICT=1` mounts in React's StrictMode, as many hosts do while developing: effects and
// initialisers run twice, to show anything that assumes it runs once.
// `VITE_IFRAME=1` draws the page in a frame of its own in every mode (the e2e suite runs that way too).
if (import.meta.env.VITE_IFRAME === "1") {
  (window as unknown as { __MIDITOR_FRAME__?: boolean }).__MIDITOR_FRAME__ = true;
}
const strict = import.meta.env.VITE_STRICT === "1";
const app = <App />;
createRoot(container).render(strict ? <StrictMode>{app}</StrictMode> : app);
