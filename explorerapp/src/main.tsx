import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { loadExplorerRuntimeConfig } from "./integrations/runtimeConfig";
import "./styles/tokens.css";
import "./styles/globals.css";

async function startApp() {
  await loadExplorerRuntimeConfig();

  createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

void startApp();
