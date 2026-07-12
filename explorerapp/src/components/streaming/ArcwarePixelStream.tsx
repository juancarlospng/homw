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

const ARCWARE_CONFIG = {
  address: "wss://signalling-client.ragnarok.arcware.cloud/",
  projectId: "b472af60-49d1-40ab-b26b-a8b1aa21bbd5",
  shareId: "share-41c7a06e-72d4-4cf4-ae26-e1dbc976f0bf",
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
    let retryCount = 0;
    const mediaReadyCleanups: Array<() => void> = [];

    const markReady = () => {
      if (cancelled || ready) return;
      ready = true;
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
      cleanupStream();
    };
  }, [containerId, streamingEnabled]);

  if (!streamingEnabled) {
    return null;
  }

  return (
    <div className={className}>
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
