import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register the offline service worker only in production builds — a SW in dev
// caches modules and breaks Vite HMR. Relative "./sw.js" keeps the scope correct
// under any subpath (kiosk, GitHub Pages).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      /* offline support is best-effort; the app still runs online */
    });
  });
}
