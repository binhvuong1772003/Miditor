import { useEffect, useState } from "react";

/** Whether Alt is held. */
export function useAltHeld(): boolean {
  const [altHeld, setAltHeld] = useState(false);
  useEffect(() => {
    const note = (event: KeyboardEvent) => {
      if (event.key === "Alt") setAltHeld(event.type === "keydown");
    };
    const clear = () => setAltHeld(false);
    window.addEventListener("keydown", note);
    window.addEventListener("keyup", note);
    // The key can go up while the window is not looking.
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", note);
      window.removeEventListener("keyup", note);
      window.removeEventListener("blur", clear);
    };
  }, []);
  return altHeld;
}
