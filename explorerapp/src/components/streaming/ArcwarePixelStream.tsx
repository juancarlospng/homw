import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { UnrealEmitter } from "../../integrations/unrealBridge";

type ArcwareModule = {
  WebRTCClient: new (options: ArcwareClientOptions) => ArcwareClient;
};

type ArcwareClient = {
  emitUIInteraction?: UnrealEmitter;
  close?: () => void;
  destroy?: () => void;
  disconnect?: () => void;
};

type ArcwareClientOptions = {
  address: string;
  shareId: string;
  projectId: string;
  settings: Record<string, unknown>;
  sizeContainer: string;
  playOverlay: boolean;
  loader: () => void;
  videoInitializeCallback: () => void;
  applicationResponse: (response: string) => void;
};

type ArcwarePixelStreamProps = {
  className?: string;
  onReady?: () => void;
  onResponse: (response: string) => void;
};

const ARCWARE_CLIENT_URL = "https://unpkg.com/@arcware/webrtc-plugin@latest/index_new.umd.js";
const STREAM_START_TIMEOUT_MS = 70000;
const STREAM_RETRY_DELAY_MS = 5000;
const STREAM_MAX_RETRIES = 4;
const STREAM_RELOAD_LIMIT = 2;
const STREAM_RELOAD_WINDOW_MS = 180000;
const STREAM_RELOAD_STORAGE_KEY = "homw:arcware-stream-reloads";

const ARCWARE_CONFIG = {
  address: "wss://signalling-client.ragnarok.arcware.cloud/",
  projectId: "4c72a3d6-7015-4fa1-89bb-694beed654c8",
  shareId: "share-49821913-c770-47ea-aa77-320067c2a96b",
};

function parseFeatureFlag(value: string | boolean | undefined | null) {
  if (typeof value === "boolean") return value;
  if (!value) return undefined;

  const normalized = value.toLowerCase().trim();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return undefined;
}

function isPixelStreamingEnabled() {
  const params = new URLSearchParams(window.location.search);
  const urlValue = params.get("homwStream");

  if (urlValue !== null) {
    return parseFeatureFlag(urlValue) ?? true;
  }

  return parseFeatureFlag(import.meta.env.VITE_HOMW_PIXEL_STREAMING) ?? true;
}

function getArcwareConfig() {
  const params = new URLSearchParams(window.location.search);

  return {
    address:
      params.get("arcwareAddress") ??
      import.meta.env.VITE_ARCWARE_ADDRESS ??
      ARCWARE_CONFIG.address,
    projectId: ARCWARE_CONFIG.projectId,
    shareId: ARCWARE_CONFIG.shareId,
  };
}

function cleanupClient(client: ArcwareClient | undefined) {
  client?.close?.();
  client?.destroy?.();
  client?.disconnect?.();
}

function clearStreamContainer(containerId: string) {
  const container = document.getElementById(containerId);
  if (container) container.replaceChildren();
}

function stringifyConsoleArg(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return `${value.name} ${value.message}`;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isRecoverableArcwareError(...values: unknown[]) {
  const message = values.map(stringifyConsoleArg).join(" ").toLowerCase();

  return (
    message.includes("maximum concurrency reached") ||
    message.includes("failed to allocate runner resources") ||
    message.includes("ws closed: 4501") ||
    message.includes('"code":4501') ||
    message.includes("code: 4501")
  );
}

function canReloadStreamPage() {
  const now = Date.now();

  try {
    const state = JSON.parse(window.sessionStorage.getItem(STREAM_RELOAD_STORAGE_KEY) ?? "null") as
      | { count: number; startedAt: number }
      | null;
    const current =
      state && now - state.startedAt < STREAM_RELOAD_WINDOW_MS
        ? state
        : { count: 0, startedAt: now };

    if (current.count >= STREAM_RELOAD_LIMIT) return false;

    window.sessionStorage.setItem(
      STREAM_RELOAD_STORAGE_KEY,
      JSON.stringify({ count: current.count + 1, startedAt: current.startedAt }),
    );
    return true;
  } catch {
    return true;
  }
}

function resetStreamReloadGuard() {
  try {
    window.sessionStorage.removeItem(STREAM_RELOAD_STORAGE_KEY);
  } catch {
    // Reload recovery is best effort only.
  }
}

export function ArcwarePixelStream({ className, onReady, onResponse }: ArcwarePixelStreamProps) {
  const reactId = useId();
  const containerId = useMemo(() => `arcware-stream-${reactId.replace(/:/g, "")}`, [reactId]);
  const streamingEnabled = useMemo(() => isPixelStreamingEnabled(), []);
  const clientRef = useRef<ArcwareClient | undefined>(undefined);
  const emitterRef = useRef<UnrealEmitter | undefined>(undefined);
  const onReadyRef = useRef<ArcwarePixelStreamProps["onReady"]>(onReady);
  const onResponseRef = useRef(onResponse);
  const [status, setStatus] = useState<"loading" | "retrying" | "ready" | "error">("loading");

  onReadyRef.current = onReady;
  onResponseRef.current = onResponse;

  useEffect(() => {
    if (!streamingEnabled) return undefined;

    let cancelled = false;
    let ready = false;
    let mediaObserver: MutationObserver | undefined;
    let retryTimer: number | undefined;
    let startTimer: number | undefined;
    let reloadTimer: number | undefined;
    let retryCount = 0;
    const mediaReadyCleanups: Array<() => void> = [];

    const reloadPageForStreamRecovery = (...values: unknown[]) => {
      if (cancelled || !isRecoverableArcwareError(...values)) return;
      if (!canReloadStreamPage()) {
        setStatus("error");
        return;
      }

      cleanupStream();
      setStatus("retrying");
      reloadTimer = window.setTimeout(() => {
        window.location.reload();
      }, 750);
    };

    const markReady = () => {
      if (cancelled || ready) return;
      ready = true;
      resetStreamReloadGuard();
      if (startTimer) window.clearTimeout(startTimer);
      setStatus("ready");
      onReadyRef.current?.();
    };

    const cleanupStream = () => {
      cleanupClient(clientRef.current);
      mediaObserver?.disconnect();
      mediaObserver = undefined;
      mediaReadyCleanups.splice(0).forEach((cleanup) => cleanup());
      clientRef.current = undefined;
      emitterRef.current = undefined;
      clearStreamContainer(containerId);
    };

    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    const patchedConsoleWarn = (...values: unknown[]) => {
      originalConsoleWarn(...values);
      reloadPageForStreamRecovery(...values);
    };
    const patchedConsoleError = (...values: unknown[]) => {
      originalConsoleError(...values);
      reloadPageForStreamRecovery(...values);
    };
    console.warn = patchedConsoleWarn;
    console.error = patchedConsoleError;

    const onWindowError = (event: ErrorEvent) => {
      reloadPageForStreamRecovery(event.message, event.error);
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reloadPageForStreamRecovery(event.reason);
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    const scheduleRetry = () => {
      if (cancelled || ready) return;

      cleanupStream();

      if (retryCount >= STREAM_MAX_RETRIES) {
        setStatus("error");
        return;
      }

      retryCount += 1;
      setStatus("retrying");
      retryTimer = window.setTimeout(() => {
        if (!cancelled && !ready) connect();
      }, STREAM_RETRY_DELAY_MS);
    };

    const watchStreamMedia = () => {
      const container = document.getElementById(containerId);
      if (!container) return;

      const bindMediaReady = (element: Element) => {
        if (element instanceof HTMLCanvasElement) {
          markReady();
          return;
        }

        if (!(element instanceof HTMLVideoElement)) return;

        if (element.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          markReady();
          return;
        }

        const onMediaReady = () => markReady();
        element.addEventListener("loadeddata", onMediaReady, { once: true });
        element.addEventListener("canplay", onMediaReady, { once: true });
        element.addEventListener("playing", onMediaReady, { once: true });
        mediaReadyCleanups.push(() => {
          element.removeEventListener("loadeddata", onMediaReady);
          element.removeEventListener("canplay", onMediaReady);
          element.removeEventListener("playing", onMediaReady);
        });
      };

      container.querySelectorAll("video, canvas").forEach(bindMediaReady);
      mediaObserver = new MutationObserver((records) => {
        records.forEach((record) => {
          record.addedNodes.forEach((node) => {
            if (!(node instanceof Element)) return;
            if (node.matches("video, canvas")) bindMediaReady(node);
            node.querySelectorAll("video, canvas").forEach(bindMediaReady);
          });
        });
      });
      mediaObserver.observe(container, { childList: true, subtree: true });
    };

    async function connect() {
      try {
        setStatus("loading");
        if (startTimer) window.clearTimeout(startTimer);
        const config = getArcwareConfig();
        const arcware = (await import(/* @vite-ignore */ ARCWARE_CLIENT_URL)) as ArcwareModule;

        if (cancelled) return;

        const client = new arcware.WebRTCClient({
          ...config,
          applicationResponse: (response) => {
            markReady();
            onResponseRef.current(response);
          },
          loader: () => {
            if (!ready) setStatus("loading");
          },
          playOverlay: false,
          settings: {},
          sizeContainer: containerId,
          videoInitializeCallback: markReady,
        });

        const emitUIInteraction: UnrealEmitter = (payload) => {
          client.emitUIInteraction?.(payload);
        };

        clientRef.current = client;
        emitterRef.current = emitUIInteraction;
        window.homwWebRTCClient = client;
        window.homwEmitUIInteraction = emitUIInteraction;
        watchStreamMedia();
        startTimer = window.setTimeout(scheduleRetry, STREAM_START_TIMEOUT_MS);
      } catch (error) {
        console.error("[HOMW Pixel Streaming]", error);
        reloadPageForStreamRecovery(error);
        scheduleRetry();
      }
    }

    connect();

    return () => {
      cancelled = true;
      if (window.homwWebRTCClient === clientRef.current) {
        delete window.homwWebRTCClient;
      }
      if (window.homwEmitUIInteraction === emitterRef.current) {
        delete window.homwEmitUIInteraction;
      }
      if (retryTimer) window.clearTimeout(retryTimer);
      if (startTimer) window.clearTimeout(startTimer);
      if (reloadTimer) window.clearTimeout(reloadTimer);
      if (console.warn === patchedConsoleWarn) {
        console.warn = originalConsoleWarn;
      }
      if (console.error === patchedConsoleError) {
        console.error = originalConsoleError;
      }
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
      cleanupStream();
    };
  }, [containerId, streamingEnabled]);

  if (!streamingEnabled) {
    return null;
  }

  return (
    <div className={className} data-tour="live-stream">
      <div className="pixel-stream-container" id={containerId} />
      {status !== "ready" ? (
        <div className={`pixel-stream-status is-${status}`}>
          {status === "error"
            ? "Pixel Streaming unavailable"
            : status === "retrying"
              ? "Arcware is busy. Retrying stream"
              : "Connecting to Unreal"}
        </div>
      ) : null}
    </div>
  );
}
