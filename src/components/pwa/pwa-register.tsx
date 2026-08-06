"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerWorker = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    if (document.readyState === "complete") {
      registerWorker();
      return;
    }

    window.addEventListener("load", registerWorker, { once: true });
    return () => window.removeEventListener("load", registerWorker);
  }, []);

  return null;
}
