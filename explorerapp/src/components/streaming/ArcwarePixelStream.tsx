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

const LEGACY_ARCWARE_CONFIG = {
  address: "wss://signalling-client.ragnarok.arcware.cloud/",
  projectId: "0432103a-2246-4448-86c5-413f4ce947af",
  shareId: "share-cd5f65c6-ecab-4925-9cc1-54c2e6b48edd",
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
      LEGACY_ARCWARE_CONFIG.address,
    projectId:
      params.get("arcwareProjectId") ??
      import.meta.env.VITE_ARCWARE_PROJECT_ID ??
      LEGACY_ARCWARE_CONFIG.projectId,
    shareId:
      params.get("arcwareShareId") ??
      import.meta.env.VITE_ARCWARE_SHARE_ID ??
      LEGACY_ARCWARE_CONFIG.shareId,
  };
}

function cleanupClient(client: ArcwareClient | undefined) {
  client?.close?.();
  client?.destroy?.();
  client?.disconnect?.();
}

export function ArcwarePixelStream({ className, onReady, onResponse }: ArcwarePixelStreamProps) {
  const reactId = useId();
  const containerId = useMemo(() => `arcware-stream-${reactId.replace(/:/g, "")}`, [reactId]);
  const streamingEnabled = useMemo(() => isPixelStreamingEnabled(), []);
  const clientRef = useRef<ArcwareClient | undefined>(undefined);
  const emitterRef = useRef<UnrealEmitter | undefined>(undefined);
  const onReadyRef = useRef<ArcwarePixelStreamProps["onReady"]>(onReady);
  const onResponseRef = useRef(onResponse);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  onReadyRef.current = onReady;
  onResponseRef.current = onResponse;

  useEffect(() => {
    if (!streamingEnabled) return undefined;

    let cancelled = false;
    let ready = false;
    let mediaObserver: MutationObserver | undefined;
    const mediaReadyCleanups: Array<() => void> = [];

    const markReady = () => {
      if (cancelled || ready) return;
      ready = true;
      setStatus("ready");
      onReadyRef.current?.();
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
      } catch (error) {
        console.error("[HOMW Pixel Streaming]", error);
        setStatus("error");
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
      cleanupClient(clientRef.current);
      mediaObserver?.disconnect();
      mediaReadyCleanups.forEach((cleanup) => cleanup());
      clientRef.current = undefined;
      emitterRef.current = undefined;
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
          {status === "error" ? "Pixel Streaming unavailable" : "Connecting to Unreal"}
        </div>
      ) : null}
    </div>
  );
}
