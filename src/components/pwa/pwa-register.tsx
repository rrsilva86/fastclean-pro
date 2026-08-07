"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const registerWorker = () => {
      navigator.serviceWorker.register("/sw.js").then((registration) => {
        registration.update().catch(() => undefined);

        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const nextWorker = registration.installing;
          nextWorker?.addEventListener("statechange", () => {
            if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
              nextWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      }).catch(() => undefined);
    };

    const reloadOnControllerChange = () => {
      const reloadKey = "fastclean_sw_reloaded_v4";
      if (sessionStorage.getItem(reloadKey) === "true") {
        return;
      }

      sessionStorage.setItem(reloadKey, "true");
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnControllerChange);

    if (document.readyState === "complete") {
      registerWorker();
      return;
    }

    window.addEventListener("load", registerWorker, { once: true });
    return () => {
      window.removeEventListener("load", registerWorker);
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnControllerChange);
    };
  }, []);

  return null;
}
