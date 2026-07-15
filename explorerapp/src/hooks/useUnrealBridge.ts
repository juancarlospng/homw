import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUnrealEmitter,
  parseUnrealResponse,
  type UnrealTourState,
} from "../integrations/unrealBridge";

function getInitialState(): UnrealTourState {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view") ?? params.get("mode") ?? params.get("screen") ?? window.location.hash.replace("#", "");
  const normalizedView = view.toLowerCase();

  const startsInTour =
    normalizedView === "tour" ||
    normalizedView === "apartment" ||
    normalizedView === "liveit" ||
    normalizedView === "live-it";

  const startsInExplorer =
    normalizedView === "explorer" ||
    normalizedView === "home" ||
    normalizedView === "amenities" ||
    normalizedView === "surroundings" ||
    normalizedView === "units";

  return {
    mode: startsInTour && !startsInExplorer ? "apartment" : "explorer",
    canInteract: false,
    availability: "Available",
  };
}

function syncSceneHash(mode: UnrealTourState["mode"]) {
  const nextHash = mode === "explorer" ? "#explorer" : "#apartment";
  if (window.location.hash === nextHash) return;

  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${nextHash}`);
}

export function useUnrealBridge() {
  const [tourState, setTourState] = useState<UnrealTourState>(() => getInitialState());
  const emit = useMemo(() => createUnrealEmitter(), []);

  const handleResponse = useCallback((response: string) => {
    console.info("[HOMW <- Unreal] Descriptor", response);
    setTourState((previous) => parseUnrealResponse(response, previous));
  }, []);

  useEffect(() => {
    window.homwHandleUnrealResponse = handleResponse;

    if (window.ArcanePlayer?.onReceiveEvent) {
      window.ArcanePlayer.onReceiveEvent("", handleResponse);
    }

    return () => {
      if (window.homwHandleUnrealResponse === handleResponse) {
        delete window.homwHandleUnrealResponse;
      }
    };
  }, [handleResponse]);

  useEffect(() => {
    syncSceneHash(tourState.mode);
  }, [tourState.mode]);

  return { emit, tourState, handleResponse };
}
