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

function logRuntimeConfigStatus(source: string) {
  const token = window.HOMW_EXPLORER_CONFIG?.supabaseAnonKey?.trim() ?? "";

  console.info("[HOMW Config]", {
    hasSupabaseAnonKey: Boolean(token),
    keyPreview: token ? `${token.slice(0, 6)}...${token.slice(-4)}` : "",
    source,
    table: window.HOMW_EXPLORER_CONFIG?.supabaseUnitsTable ?? "",
  });
}

function getExplorerConfigUrls() {
  const moduleScript = Array.from(document.scripts).find((script) => script.src.includes("/assets/"));
  const urls = new Set<string>();

  if (moduleScript?.src) {
    urls.add(new URL("../explorer-config.js", moduleScript.src).toString());
  }

  urls.add(new URL("./explorer-config.js", window.location.href).toString());
  urls.add(new URL("/explorerapp/explorer-config.js", window.location.origin).toString());

  return Array.from(urls);
}

function loadScript(src: string) {
  return new Promise<void>((resolve) => {
    const script = document.createElement("script");
    const configUrl = new URL(src);

    configUrl.searchParams.set("v", String(Date.now()));
    script.src = configUrl.toString();
    script.onload = () => resolve();
    script.onerror = () => resolve();

    document.head.appendChild(script);
  });
}

export async function loadExplorerRuntimeConfig() {
  if (hasRuntimeConfig()) {
    logRuntimeConfigStatus("initial script");
    return;
  }

  for (const url of getExplorerConfigUrls()) {
    await loadScript(url);
    if (hasRuntimeConfig()) {
      logRuntimeConfigStatus(url);
      return;
    }
  }

  logRuntimeConfigStatus("not loaded");
}
