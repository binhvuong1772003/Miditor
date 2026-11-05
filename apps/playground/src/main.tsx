import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./playground.css";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

// `VITE_STRICT=1` mounts in React's StrictMode, as many hosts do while developing: effects and
// initialisers run twice, to show anything that assumes it runs once.
const strict = import.meta.env.VITE_STRICT === "1";
const app = <App />;
createRoot(container).render(strict ? <StrictMode>{app}</StrictMode> : app);
