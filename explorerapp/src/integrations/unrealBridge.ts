export type UnitAvailability = "Available" | "Reserved" | "Sold" | "Hold" | "Unknown";

export type UnrealTourState = {
  mode: "explorer" | "apartment" | "paused" | "material-editor";
  activePalette?: "wood" | "fabric";
  canInteract: boolean;
  selectedUnit?: string;
  unitDetailsHtml?: string;
  availability: UnitAvailability;
  rawResponse?: string;
};

export type UnrealEmitter = (payload: string | Record<string, unknown>) => void;

const UNREAL_DEBUG_STORAGE_KEY = "homw:debug-unreal-events";

declare global {
  interface Window {
    ArcanePlayer?: {
      emitUIEvent?: UnrealEmitter;
      onReceiveEvent?: (channel: string, callback: (response: string) => void) => void;
    };
    homwEmitUIInteraction?: UnrealEmitter;
    homwHandleUnrealResponse?: (response: string) => void;
    homwWebRTCClient?: {
      emitUIInteraction?: UnrealEmitter;
      close?: () => void;
      destroy?: () => void;
      disconnect?: () => void;
    };
    homwGetUnrealDebug?: () => boolean;
    homwSetUnrealDebug?: (enabled: boolean) => void;
  }
}

export const oldMaterialWallPalette = [
  "f4f9ff",
  "fafafa",
  "e7e9e7",
  "f1f0e2",
  "f1e9df",
  "f0dfcc",
  "e3bc8e",
  "da7e7a",
  "a35776",
  "6a282c",
  "a2a1ba",
  "00a0b0",
  "4d91c6",
  "699e6d",
  "61845b",
  "888d82",
  "203b3d",
];

function parseDebugFlag(value: string | boolean | undefined | null) {
  if (typeof value === "boolean") return value;
  if (!value) return undefined;

  const normalized = value.toLowerCase().trim();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return undefined;
}

export function isUnrealDebugEnabled() {
  const params = new URLSearchParams(window.location.search);
  const urlValue = parseDebugFlag(params.get("homwDebugUnreal"));
  if (urlValue !== undefined) return urlValue;

  const storedValue = parseDebugFlag(window.localStorage.getItem(UNREAL_DEBUG_STORAGE_KEY));
  if (storedValue !== undefined) return storedValue;

  const envValue = parseDebugFlag(import.meta.env.VITE_HOMW_DEBUG_UNREAL);
  if (envValue !== undefined) return envValue;

  return import.meta.env.DEV;
}

export function setUnrealDebugEnabled(enabled: boolean) {
  window.localStorage.setItem(UNREAL_DEBUG_STORAGE_KEY, enabled ? "1" : "0");
  console.info(`[HOMW Unreal debug] ${enabled ? "enabled" : "disabled"}`);
}

export function logUnrealOutgoing(payload: string | Record<string, unknown>, target: string) {
  if (!isUnrealDebugEnabled()) return;

  console.groupCollapsed(`[HOMW -> Unreal] ${target}`);
  console.info(payload);
  console.groupEnd();
}

function normalizeUnrealCommand(command: string) {
  return command.trim().replace(/^["']|["']$/g, "");
}

if (typeof window !== "undefined") {
  window.homwGetUnrealDebug = isUnrealDebugEnabled;
  window.homwSetUnrealDebug = setUnrealDebugEnabled;
}

export function createUnrealEmitter(): UnrealEmitter {
  return (payload) => {
    if (window.homwEmitUIInteraction) {
      const pixelStreamingPayload = typeof payload === "string" ? normalizeUnrealCommand(payload) : payload;
      logUnrealOutgoing(pixelStreamingPayload, "Pixel Streaming");
      window.homwEmitUIInteraction(pixelStreamingPayload);
      return;
    }

    if (window.ArcanePlayer?.emitUIEvent) {
      const legacyPayload = typeof payload === "string" ? normalizeUnrealCommand(payload) : payload;
      logUnrealOutgoing(legacyPayload, "ArcanePlayer");
      window.ArcanePlayer.emitUIEvent(legacyPayload);
      return;
    }

    logUnrealOutgoing(payload, "No active player");
  };
}

function isEmptyUnitResponse(response: string) {
  return /^Unit\s*(None|Null|Undefined)?$/i.test(response.trim());
}

export function parseUnrealResponse(response: string, previous: UnrealTourState): UnrealTourState {
  const next: UnrealTourState = { ...previous, rawResponse: response };

  if (response === "HitTrue" || response === "DoorHitTrue" || response === "EditableHitTrue") {
    next.canInteract = true;
  } else if (!response.includes("Unit") && !response.includes("<b>Surface</b><br>")) {
    next.canInteract = false;
  }

  if (isEmptyUnitResponse(response)) {
    next.selectedUnit = undefined;
    next.unitDetailsHtml = undefined;
  } else if (response.includes("Unit")) {
    next.selectedUnit = response;
  }

  if (response.includes("<b>Surface</b><br>")) {
    next.unitDetailsHtml = response;
    next.availability = getAvailability(response);
  }

  const normalizedResponse = response.toLowerCase();

  if (
    normalizedResponse.includes("apartment") ||
    normalizedResponse.includes("gameresume") ||
    normalizedResponse === "tour" ||
    normalizedResponse === "liveit" ||
    normalizedResponse === "live it"
  ) {
    next.mode = "apartment";
    next.activePalette = undefined;
  }

  if (normalizedResponse.includes("gamepause")) {
    next.mode = "paused";
  }

  if (response.includes("MaterialPared")) {
    next.mode = "material-editor";
  }

  if (response.includes("openwoodpalette")) {
    next.mode = "material-editor";
    next.activePalette = "wood";
  }

  if (response.includes("openfrabricpalette") || response.includes("openfabricpalette")) {
    next.mode = "material-editor";
    next.activePalette = "fabric";
  }

  if (normalizedResponse.includes("explorerlevel") || normalizedResponse === "explorer") {
    next.mode = "explorer";
    next.activePalette = undefined;
  }

  return next;
}

export function getAvailability(response: string): UnitAvailability {
  if (response.includes("Available")) return "Available";
  if (response.includes("Reserved")) return "Reserved";
  if (response.includes("Sold")) return "Sold";
  if (response.includes("Hold")) return "Hold";
  return "Unknown";
}

export function moodToUnrealTime(mood: string) {
  const values: Record<string, number> = {
    Day: 317,
    Sunset: 353,
    Night: 362,
  };

  return values[mood] ?? values.Day;
}
