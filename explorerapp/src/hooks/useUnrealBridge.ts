import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createUnrealEmitter,
  parseUnrealResponse,
  type UnrealTourState,
} from "../integrations/unrealBridge";

function getInitialState(): UnrealTourState {
  const params = new URLSearchParams(window.location.search);
  const view = params.get("view");

  return {
    mode: view === "tour" ? "apartment" : "explorer",
    canInteract: false,
    availability: "Available",
  };
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

  return { emit, tourState, handleResponse };
}
