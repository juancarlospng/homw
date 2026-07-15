import { useCallback, useEffect, useMemo, useState } from "react";

export type GuidedTourStep = {
  id: string;
  selector: string;
  eyebrow: string;
  title: string;
  body: string;
};

type GuidedTourProps = {
  launcherLabel?: string;
  steps: GuidedTourStep[];
  storageKey?: string;
  onStepChange?: (step: GuidedTourStep) => void;
};

type TargetRect = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  top: number;
  width: number;
};

const DEFAULT_STORAGE_KEY = "homw:guided-tour-complete";

function getStoredCompletion(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

function storeCompletion(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // The tour remains usable even when storage is unavailable.
  }
}

function getTargetRect(selector: string): TargetRect | null {
  const element = document.querySelector(selector);
  if (!(element instanceof HTMLElement)) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    bottom: rect.bottom,
    height: rect.height,
    left: rect.left,
    right: rect.right,
    top: rect.top,
    width: rect.width,
  };
}

function getCardStyle(rect: TargetRect | null) {
  const margin = 18;
  const cardWidth = Math.min(360, window.innerWidth - 32);

  const centeredStyle = {
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: `${cardWidth}px`,
  };

  if (!rect) {
    return centeredStyle;
  }

  const isLargeTarget = rect.width > window.innerWidth * 0.72 || rect.height > window.innerHeight * 0.72;
  if (isLargeTarget) {
    return {
      ...centeredStyle,
      top: "54%",
    };
  }

  const rightSpace = window.innerWidth - rect.right;
  const leftSpace = rect.left;
  const placeRight = rightSpace >= cardWidth + margin;
  const placeLeft = leftSpace >= cardWidth + margin;

  let left = rect.left + rect.width / 2 - cardWidth / 2;
  let top = rect.bottom + margin;
  let transform = "none";

  if (placeRight) {
    left = rect.right + margin;
    top = rect.top;
  } else if (placeLeft) {
    left = rect.left - cardWidth - margin;
    top = rect.top;
  } else if (rect.bottom + 220 > window.innerHeight && rect.top > 260) {
    top = rect.top - margin;
    transform = "translateY(-100%)";
  }

  left = Math.max(16, Math.min(left, window.innerWidth - cardWidth - 16));
  top = Math.max(16, Math.min(top, window.innerHeight - 220));

  return {
    left: `${left}px`,
    top: `${top}px`,
    transform,
    width: `${cardWidth}px`,
  };
}

export function GuidedTour({
  launcherLabel = "Guide",
  steps,
  storageKey = DEFAULT_STORAGE_KEY,
  onStepChange,
}: GuidedTourProps) {
  const [isOpen, setIsOpen] = useState(() => !getStoredCompletion(storageKey));
  const [activeIndex, setActiveIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const activeStep = steps[activeIndex];

  const updateTarget = useCallback(() => {
    if (!activeStep) return;
    setTargetRect(getTargetRect(activeStep.selector));
  }, [activeStep]);

  useEffect(() => {
    if (!isOpen || !activeStep) return;

    onStepChange?.(activeStep);
    const firstFrame = window.requestAnimationFrame(() => {
      const secondFrame = window.requestAnimationFrame(updateTarget);
      return () => window.cancelAnimationFrame(secondFrame);
    });
    const settleTimer = window.setTimeout(updateTarget, 220);

    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.clearTimeout(settleTimer);
    };
  }, [activeStep, isOpen, onStepChange, updateTarget]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        storeCompletion(storageKey);
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", updateTarget);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", updateTarget);
    };
  }, [isOpen, storageKey, updateTarget]);

  const cardStyle = useMemo(() => getCardStyle(targetRect), [targetRect]);

  const closeTour = () => {
    storeCompletion(storageKey);
    setIsOpen(false);
  };

  const restartTour = () => {
    setActiveIndex(0);
    setIsOpen(true);
  };

  const goNext = () => {
    if (activeIndex >= steps.length - 1) {
      closeTour();
      return;
    }

    setActiveIndex((current) => current + 1);
  };

  const goBack = () => {
    setActiveIndex((current) => Math.max(0, current - 1));
  };

  return (
    <>
      <button className="guided-tour-launcher" onClick={restartTour} type="button">
        {launcherLabel}
      </button>

      {isOpen && activeStep ? (
        <div className="guided-tour" role="dialog" aria-modal="true" aria-labelledby="guided-tour-title">
          <div className="guided-tour-dim" />
          {targetRect ? (
            <div
              className="guided-tour-highlight"
              style={{
                height: `${targetRect.height}px`,
                left: `${targetRect.left}px`,
                top: `${targetRect.top}px`,
                width: `${targetRect.width}px`,
              }}
            />
          ) : null}
          <section className="guided-tour-card" style={cardStyle}>
            <div className="guided-tour-progress">
              <span>{activeStep.eyebrow}</span>
              <strong>
                {activeIndex + 1}/{steps.length}
              </strong>
            </div>
            <h2 id="guided-tour-title">{activeStep.title}</h2>
            <p>{activeStep.body}</p>
            <div className="guided-tour-actions">
              <button className="guided-tour-text-button" onClick={closeTour} type="button">
                Skip tour
              </button>
              <div>
                <button
                  className="guided-tour-secondary-button"
                  disabled={activeIndex === 0}
                  onClick={goBack}
                  type="button"
                >
                  Back
                </button>
                <button className="guided-tour-primary-button" onClick={goNext} type="button">
                  {activeIndex >= steps.length - 1 ? "Finish" : "Next"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
