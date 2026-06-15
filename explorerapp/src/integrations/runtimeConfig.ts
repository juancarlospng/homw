declare global {
  interface Window {
    HOMW_EXPLORER_CONFIG?: {
      supabaseAnonKey?: string;
      supabaseUnitsTable?: string;
    };
  }
}

function hasRuntimeConfig() {
  return Boolean(window.HOMW_EXPLORER_CONFIG?.supabaseAnonKey?.trim());
}

export async function loadExplorerRuntimeConfig() {
  if (hasRuntimeConfig()) return;

  await new Promise<void>((resolve) => {
    const script = document.createElement("script");
    const configUrl = new URL("./explorer-config.js", window.location.href);

    configUrl.searchParams.set("v", String(Date.now()));
    script.src = configUrl.toString();
    script.onload = () => resolve();
    script.onerror = () => resolve();

    document.head.appendChild(script);
  });
}
