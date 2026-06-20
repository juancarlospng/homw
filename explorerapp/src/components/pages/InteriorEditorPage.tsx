import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import interiorImage from "../../assets/interior-tour.png";
import {
  editableMeshes,
  interiorStyles,
  journeySteps,
  materialPalettes,
  moods,
  previewToggles,
} from "../../data/interior";
import { useUnrealBridge } from "../../hooks/useUnrealBridge";
import {
  fetchUnitFromSupabase,
  fetchUnitsFromSupabase,
  findUnitByIdentifier,
  filterUnits,
  getSupabaseCredentialsError,
  hasSupabaseCredentials,
  SupabaseConfigurationError,
  SupabaseRequestError,
  type UnitAvailabilityFilter,
  type UnitFilters,
  type UnitRecord,
} from "../../integrations/supabaseUnits";
import { moodToUnrealTime, oldMaterialWallPalette } from "../../integrations/unrealBridge";
import { TourTopbar } from "../layout/TourTopbar";
import { GlassPanel } from "../ui/GlassPanel";
import { MaterialSwatch } from "../ui/MaterialSwatch";
import { ScoreRing } from "../ui/ScoreRing";
import { SegmentedControl } from "../ui/SegmentedControl";
import { ToggleSwitch } from "../ui/ToggleSwitch";

declare global {
  interface Window {
    homwShowUnitInfo?: (unit?: Partial<UnitRecord>) => void;
    homwShowLegacyUnitInfo?: () => void;
  }
}

const moodIcons = {
  Day: "sun",
  Sunset: "sunset",
  Night: "moon",
} as const;

const unrealTimeRange = {
  min: 186,
  max: 362,
} as const;

const initialUnitFilters: UnitFilters = {
  availability: ["Available", "Reserved", "Sold"],
  bathrooms: [1, 2, 3],
  bedrooms: [1, 2, 3],
  budget: 500000,
  surface: 20,
};

function formatDayTime(value: number) {
  const normalized = (value - unrealTimeRange.min) / (unrealTimeRange.max - unrealTimeRange.min);
  const totalMinutes = Math.round((6 * 60 + normalized * 18 * 60) / 5) * 5;
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;

  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

function formatUnitFieldLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatUnitFieldValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "--";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function getUnitDetailRows(unit: UnitRecord) {
  const rawEntries = Object.entries(unit.raw)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => [formatUnitFieldLabel(key), formatUnitFieldValue(value)] as const);

  if (rawEntries.length) return rawEntries;

  return [
    ["Unit", unit.title],
    ["Surface", unit.surface ? `${unit.surface}m2` : "--"],
    ["Budget", unit.budget ? `$${unit.budget.toLocaleString()}` : "--"],
    ["Availability", unit.availability],
    ["Bathrooms", unit.bathrooms || "--"],
    ["Bedrooms", unit.bedrooms || "--"],
  ] as const;
}

function isEmptyUnrealUnitResponse(response: string | undefined) {
  return /^Unit\s*(None|Null|Undefined)?$/i.test((response ?? "").trim());
}

export function InteriorEditorPage() {
  const [activeSection, setActiveSection] = useState("Home");
  const [unitPanelMode, setUnitPanelMode] = useState<"overview" | "filters" | "detail">("overview");
  const [unitFilters, setUnitFilters] = useState<UnitFilters>(initialUnitFilters);
  const [units, setUnits] = useState<UnitRecord[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<UnitRecord | null>(null);
  const [unitsStatus, setUnitsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [unitsError, setUnitsError] = useState("");
  const [selectedUnitStatus, setSelectedUnitStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dismissedUnitResponse, setDismissedUnitResponse] = useState<string | null>(null);
  const [activeJourney, setActiveJourney] = useState<(typeof journeySteps)[number]>("Explore");
  const [mood, setMood] = useState<(typeof moods)[number]>("Sunset");
  const [dayTime, setDayTime] = useState(moodToUnrealTime("Sunset"));
  const [style, setStyle] = useState<(typeof interiorStyles)[number]>("Warm");
  const [selectedMesh, setSelectedMesh] = useState<(typeof editableMeshes)[number]["label"]>("Sofa");
  const [selectedMaterialId, setSelectedMaterialId] = useState("fabric-01");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
  const [joystickPosition, setJoystickPosition] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [enabledPreview, setEnabledPreview] = useState(() => new Set(previewToggles));
  const { emit, tourState, handleResponse } = useUnrealBridge();
  const joystickRef = useRef<HTMLDivElement | null>(null);

  const currentScreen = tourState.mode === "explorer" ? "explorer" : "tour";
  const isTourScreen = currentScreen === "tour";
  const activePalette = tourState.activePalette;
  const visibleMaterials = activePalette ? materialPalettes[activePalette] : [];
  const filteredUnits = useMemo(() => filterUnits(units, unitFilters), [unitFilters, units]);
  const selectedUnitRows = selectedUnit ? getUnitDetailRows(selectedUnit) : [];

  useEffect(() => {
    window.homwWebRTCClient?.close?.();
    window.homwWebRTCClient?.destroy?.();
    window.homwWebRTCClient?.disconnect?.();
    delete window.homwWebRTCClient;
    delete window.homwEmitUIInteraction;
  }, []);

  function navigateTour(descriptor: string, label: string) {
    setActiveSection(label);
    setSelectedUnit(null);
    setDismissedUnitResponse(null);
    setUnitPanelMode(label === "Units" ? "filters" : "overview");
    emit({ topcall: descriptor });
  }

  useEffect(() => {
    if (unitPanelMode !== "filters") return;

    let cancelled = false;

    if (!hasSupabaseCredentials()) {
      setUnitsStatus("error");
      setUnitsError(getSupabaseCredentialsError());
      return;
    }

    setUnitsStatus("loading");
    setUnitsError("");
    fetchUnitsFromSupabase()
      .then((nextUnits) => {
        if (cancelled) return;
        setUnits(nextUnits);
        setUnitsStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        if (!(error instanceof SupabaseConfigurationError || error instanceof SupabaseRequestError)) {
          console.warn("[HOMW Units]", error);
        }
        setUnitsStatus("error");
        setUnitsError(
          error instanceof SupabaseConfigurationError || error instanceof SupabaseRequestError
            ? error.message
            : "Could not reach Supabase. Check the anon key, table name and project API permissions.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [unitPanelMode]);

  useEffect(() => {
    if (unitPanelMode !== "filters") return;

    emit({
      Availability: unitFilters.availability
        .map((item) => ({ Available: 1, Reserved: 2, Sold: 3 })[item])
        .join(""),
      Bathroomcount: unitFilters.bathrooms.join(""),
      Bedroomcount: unitFilters.bedrooms.join(""),
      Budget: unitFilters.budget,
      Surface: unitFilters.surface,
    });
  }, [emit, unitFilters, unitPanelMode]);

  useEffect(() => {
    if (
      activeSection === "Units" &&
      (tourState.selectedUnit || tourState.unitDetailsHtml) &&
      tourState.selectedUnit !== dismissedUnitResponse
    ) {
      setUnitPanelMode("detail");
    }
  }, [activeSection, dismissedUnitResponse, tourState.selectedUnit, tourState.unitDetailsHtml]);

  useEffect(() => {
    if (!isEmptyUnrealUnitResponse(tourState.rawResponse)) return;

    setSelectedUnit(null);
    setSelectedUnitStatus("idle");
    setDismissedUnitResponse(null);
  }, [tourState.rawResponse]);

  useEffect(() => {
    if (activeSection !== "Units" || !tourState.selectedUnit) return;
    if (tourState.selectedUnit === dismissedUnitResponse) return;

    let cancelled = false;
    const localUnit = findUnitByIdentifier(units, tourState.selectedUnit);

    setUnitPanelMode("detail");

    if (localUnit) {
      setSelectedUnit(localUnit);
      setSelectedUnitStatus("ready");
      return;
    }

    setSelectedUnit(null);

    if (!hasSupabaseCredentials()) {
      setSelectedUnitStatus("error");
      return;
    }

    setSelectedUnitStatus("loading");

    fetchUnitFromSupabase(tourState.selectedUnit)
      .then((unit) => {
        if (cancelled) return;
        if (unit) {
          setSelectedUnit(unit);
          setSelectedUnitStatus("ready");
          setUnits((current) => (findUnitByIdentifier(current, unit.id) ? current : [...current, unit]));
        } else {
          setSelectedUnitStatus("error");
        }
      })
      .catch((error) => {
        if (cancelled) return;
        console.warn("[HOMW Unit Detail]", error);
        setSelectedUnitStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [activeSection, dismissedUnitResponse, tourState.selectedUnit, units]);

  function togglePreview(label: (typeof previewToggles)[number]) {
    setEnabledPreview((current) => {
      const next = new Set(current);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  }

  function selectMood(nextMood: (typeof moods)[number]) {
    const nextTime = moodToUnrealTime(nextMood);
    setMood(nextMood);
    setDayTime(nextTime);
    emit({ time: nextTime });
  }

  function changeDayTime(value: number) {
    const clampedValue = Math.min(unrealTimeRange.max, Math.max(unrealTimeRange.min, value));
    setDayTime(clampedValue);
    emit({ time: clampedValue });
  }

  function selectStyle(nextStyle: (typeof interiorStyles)[number]) {
    setStyle(nextStyle);
    emit({ InteriorStyle: nextStyle });
  }

  function openMeshPalette(mesh: (typeof editableMeshes)[number]) {
    const descriptor = mesh.palette === "fabric" ? "openfrabricpalette" : "openwoodpalette";
    setActiveJourney("Customize");
    setSelectedMesh(mesh.label);
    emit(descriptor);
    handleResponse(descriptor);
  }

  function selectMaterial(materialId: string) {
    const nextMaterial = visibleMaterials.find((item) => item.id === materialId);
    setSelectedMaterialId(materialId);

    if (nextMaterial) {
      emit({
        dbt: "materialpared",
        material: nextMaterial.unrealMaterial,
        index: oldMaterialWallPalette.indexOf(nextMaterial.unrealMaterial),
        mesh: selectedMesh,
        palette: activePalette,
      });
    }
  }

  function saveLook() {
    emit({
      SaveLook: {
        mood,
        style,
        mesh: selectedMesh,
        materialId: selectedMaterialId,
        palette: activePalette,
      },
    });
  }

  function applyToSpace() {
    emit("gameresume");
    emit({
      ApplyToSpace: {
        mesh: selectedMesh,
        materialId: selectedMaterialId,
        palette: activePalette,
      },
    });
  }

  function emitMobileMovement(x: number, y: number) {
    emit({
      MoveForward: Number((-y).toFixed(2)),
      MoveRight: Number(x.toFixed(2)),
      MobileJoystick: {
        x: Number(x.toFixed(2)),
        y: Number(y.toFixed(2)),
      },
    });
  }

  function updateJoystick(clientX: number, clientY: number) {
    const joystick = joystickRef.current;
    if (!joystick) return;

    const bounds = joystick.getBoundingClientRect();
    const radius = Math.min(bounds.width, bounds.height) / 2;
    const centerX = bounds.left + bounds.width / 2;
    const centerY = bounds.top + bounds.height / 2;
    const rawX = (clientX - centerX) / radius;
    const rawY = (clientY - centerY) / radius;
    const length = Math.hypot(rawX, rawY);
    const x = length > 1 ? rawX / length : rawX;
    const y = length > 1 ? rawY / length : rawY;

    setJoystickPosition({ x, y });
    emitMobileMovement(x, y);
  }

  function stopJoystick() {
    setJoystickPosition({ x: 0, y: 0 });
    emitMobileMovement(0, 0);
  }

  function toggleMobileZoom() {
    const nextZoom = !isZoomed;
    setIsZoomed(nextZoom);
    emit({ Zoom: nextZoom, MobileZoom: nextZoom });
  }

  function toggleNumberFilter(key: "bathrooms" | "bedrooms", value: number) {
    setUnitFilters((current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value].sort();

      return { ...current, [key]: nextValues.length ? nextValues : currentValues };
    });
  }

  function toggleAvailability(value: UnitAvailabilityFilter) {
    setUnitFilters((current) => {
      const nextValues = current.availability.includes(value)
        ? current.availability.filter((item) => item !== value)
        : [...current.availability, value];

      return { ...current, availability: nextValues.length ? nextValues : current.availability };
    });
  }

  function resetUnitFilters() {
    setUnitFilters(initialUnitFilters);
  }

  function selectUnit(unit: UnitRecord) {
    setSelectedUnit(unit);
    setSelectedUnitStatus("ready");
    setDismissedUnitResponse(null);
    setUnitPanelMode("detail");
    emit({ Unittoselect: unit.id });
  }

  function backToUnitFilters() {
    setSelectedUnit(null);
    setSelectedUnitStatus("idle");
    setDismissedUnitResponse(tourState.selectedUnit ?? null);
    setUnitPanelMode("filters");
    emit({ topcall: "1103" });
  }

  useEffect(() => {
    window.homwShowUnitInfo = (unit = {}) => {
      setActiveSection("Units");
      setUnitPanelMode("detail");
      setSelectedUnitStatus("ready");
      setDismissedUnitResponse(null);
      setSelectedUnit({
        availability: unit.availability ?? "Available",
        bathrooms: unit.bathrooms ?? 2,
        bedrooms: unit.bedrooms ?? 3,
        budget: unit.budget ?? 420000,
        id: unit.id ?? "mock-unit-101",
        raw: unit.raw ?? {},
        surface: unit.surface ?? 120,
        title: unit.title ?? "Unit 101",
      });
    };

    window.homwShowLegacyUnitInfo = () => {
      setActiveSection("Units");
      setSelectedUnit(null);
      setSelectedUnitStatus("idle");
      setDismissedUnitResponse(null);
      setUnitPanelMode("detail");
      handleResponse("Unit 101");
      handleResponse(
        "<b>Surface</b><br>120m2<br><b>Price</b><br>$420,000<br><b>Bedroom Count</b><br>3<br><b>Bathroom Count</b><br>2<br><b>Availability</b><br>Available<br>",
      );
    };

    return () => {
      delete window.homwShowUnitInfo;
      delete window.homwShowLegacyUnitInfo;
    };
  }, [handleResponse]);

  return (
    <div
      className={`tour-page ${currentScreen === "explorer" ? "is-explorer" : "is-tour"}`}
      style={{ "--scene-image": `url(${interiorImage})` } as CSSProperties}
    >
      <div className="tour-scene" aria-hidden="true" />
      <div className="mobile-orientation-notice" role="status">
        <div className="phone-rotate-icon" aria-hidden="true" />
        <strong>Rotate your phone</strong>
        <span>HOMW Explorer works best in landscape mode.</span>
      </div>
      {currentScreen === "explorer" ? (
        <TourTopbar activeSection={activeSection} onNavigate={navigateTour} />
      ) : null}

      <div className={`preview-settings ${isPreviewOpen ? "is-open" : ""}`}>
        <div className="top-action-row">
          {isTourScreen ? (
            <button
              className="back-explorer-button"
              onClick={() => {
                emit("explorer");
                handleResponse("explorer");
              }}
              type="button"
            >
              Back to Explorer
            </button>
          ) : null}
          <button
            aria-expanded={isPreviewOpen}
            aria-label="Toggle preview settings"
            className="settings-button"
            onClick={() => setIsPreviewOpen((current) => !current)}
            type="button"
          >
            <span />
          </button>
        </div>
        {isPreviewOpen ? (
          <GlassPanel kicker="Real-Time Preview" title="Live Layers">
            <div className="toggle-list">
              {previewToggles.map((label) => (
                <ToggleSwitch
                  checked={enabledPreview.has(label)}
                  key={label}
                  label={label}
                  onToggle={() => {
                    togglePreview(label);
                    emit({ [`${label}Toggle`]: !enabledPreview.has(label) });
                  }}
                />
              ))}
            </div>
          </GlassPanel>
        ) : null}
      </div>

      {isTourScreen ? (
        <div className="tour-journey-switch" aria-label="Tour mode">
          {journeySteps.map((step, index) => (
            <button
              className={`journey-step ${step === activeJourney ? "is-active" : ""}`}
              key={step}
              onClick={() => {
                setActiveJourney(step);
                emit(step === "Explore" ? "gameresume" : "gamepause");
                if (step === "Explore") {
                  handleResponse("gameresume");
                }
              }}
              type="button"
            >
              {String(index + 1).padStart(2, "0")} {step}
            </button>
          ))}
        </div>
      ) : null}

      <button
        className={`mobile-panel-toggle ${isMobilePanelOpen ? "is-open" : ""}`}
        onClick={() => setIsMobilePanelOpen((current) => !current)}
        type="button"
      >
        {isMobilePanelOpen ? "Hide" : "Controls"}
      </button>

      <div className={`hud-grid ${isMobilePanelOpen ? "is-mobile-open" : ""}`}>
        {currentScreen === "explorer" ? (
          <div className="hud-column">
            {unitPanelMode === "overview" ? (
              <GlassPanel
                kicker="Explorer"
                title="View available units before entering the apartment tour."
                copy="Use the top navigation to review home view, amenities, surroundings and live unit availability."
              />
            ) : null}

            {unitPanelMode === "filters" ? (
              <GlassPanel kicker="Unit Search" title="Filter Units" className="unit-filter-panel">
                <div className="filter-control">
                  <div className="filter-label">
                    <span>Surface</span>
                    <strong>Min {unitFilters.surface}m2</strong>
                  </div>
                  <input
                    aria-label="Minimum surface"
                    className="time-slider"
                    max="500"
                    min="20"
                    onChange={(event) =>
                      setUnitFilters((current) => ({ ...current, surface: Number(event.target.value) }))
                    }
                    step="20"
                    type="range"
                    value={unitFilters.surface}
                  />
                </div>

                <div className="filter-control">
                  <div className="filter-label">
                    <span>Budget</span>
                    <strong>Max ${Math.round(unitFilters.budget / 1000)}k</strong>
                  </div>
                  <input
                    aria-label="Maximum budget"
                    className="time-slider"
                    max="500000"
                    min="50000"
                    onChange={(event) =>
                      setUnitFilters((current) => ({ ...current, budget: Number(event.target.value) }))
                    }
                    step="50000"
                    type="range"
                    value={unitFilters.budget}
                  />
                </div>

                <div className="filter-control">
                  <div className="filter-label">
                    <span>Availability</span>
                  </div>
                  <div className="filter-pill-grid">
                    {(["Available", "Reserved", "Sold"] as const).map((option) => (
                      <button
                        className={`filter-pill ${unitFilters.availability.includes(option) ? "is-selected" : ""}`}
                        key={option}
                        onClick={() => toggleAvailability(option)}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-control">
                  <div className="filter-label">
                    <span>Bathrooms</span>
                  </div>
                  <div className="filter-pill-grid compact">
                    {[1, 2, 3].map((value) => (
                      <button
                        className={`filter-pill ${unitFilters.bathrooms.includes(value) ? "is-selected" : ""}`}
                        key={value}
                        onClick={() => toggleNumberFilter("bathrooms", value)}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="filter-control">
                  <div className="filter-label">
                    <span>Bedrooms</span>
                  </div>
                  <div className="filter-pill-grid compact">
                    {[1, 2, 3].map((value) => (
                      <button
                        className={`filter-pill ${unitFilters.bedrooms.includes(value) ? "is-selected" : ""}`}
                        key={value}
                        onClick={() => toggleNumberFilter("bedrooms", value)}
                        type="button"
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="unit-filter-actions">
                  <button className="text-action-button" onClick={resetUnitFilters} type="button">
                    Reset Filters
                  </button>
                  <span>{filteredUnits.length} matches</span>
                </div>

                <div className="unit-result-list">
                  {unitsStatus === "loading" ? <p className="panel-copy">Loading units...</p> : null}
                  {unitsStatus === "error" ? (
                    <p className="panel-copy">{unitsError}</p>
                  ) : null}
                  {unitsStatus === "ready" && filteredUnits.length === 0 ? (
                    <p className="panel-copy">No units match the current filters.</p>
                  ) : null}
                  {filteredUnits.slice(0, 6).map((unit) => (
                    <button className="unit-result-button" key={unit.id} onClick={() => selectUnit(unit)} type="button">
                      <span>
                        <strong>{unit.title}</strong>
                        <small>
                          {unit.surface || "--"}m2 / {unit.bedrooms || "--"} bed / {unit.bathrooms || "--"} bath
                        </small>
                      </span>
                      <em className={`unit-status ${unit.availability.toLowerCase()}`}>{unit.availability}</em>
                    </button>
                  ))}
                </div>
              </GlassPanel>
            ) : null}

            {unitPanelMode === "detail" && (selectedUnit || tourState.selectedUnit || tourState.unitDetailsHtml) ? (
              <GlassPanel
                kicker="Selected Unit"
                title={selectedUnit?.title ?? tourState.selectedUnit ?? "Unit details"}
                className="unit-detail-panel"
              >
                {selectedUnitStatus === "loading" ? (
                  <p className="panel-copy">Loading full unit details...</p>
                ) : null}
                {selectedUnitStatus === "error" && tourState.selectedUnit ? (
                  <p className="panel-copy">
                    Could not load full Supabase details for {tourState.selectedUnit}. Check the Supabase token.
                  </p>
                ) : null}
                {selectedUnit ? (
                  <div className="unit-detail-grid">
                    {selectedUnitRows.map(([label, value], index) => (
                      <div className="unit-detail-row" key={`${label}-${index}`}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
                {!selectedUnit && tourState.unitDetailsHtml ? (
                  <div className="unit-detail-html" dangerouslySetInnerHTML={{ __html: tourState.unitDetailsHtml }} />
                ) : null}
                <div className="unit-filter-actions">
                  <button className="text-action-button" onClick={backToUnitFilters} type="button">
                    Back to Filters
                  </button>
                  <button
                    className="text-action-button primary"
                    onClick={() => {
                      emit("tour");
                      handleResponse("tour");
                    }}
                    type="button"
                  >
                    Go to Live It
                  </button>
                </div>
              </GlassPanel>
            ) : null}

            <GlassPanel kicker="Space Mood" title={mood}>
              <div className="mood-grid">
                {moods.map((option) => (
                  <button
                    className={`mood-button ${mood === option ? "is-selected" : ""}`}
                    key={option}
                    onClick={() => selectMood(option)}
                    type="button"
                  >
                    <span className={`mood-icon ${moodIcons[option]}`} aria-hidden="true" />
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              <div className="time-slider-wrap">
                <input
                  aria-label="Time of day"
                  className="time-slider"
                  max={unrealTimeRange.max}
                  min={unrealTimeRange.min}
                  onChange={(event) => changeDayTime(Number(event.target.value))}
                  type="range"
                  value={dayTime}
                />
                <div className="time-slider-meta">
                  <span>Morning</span>
                  <strong>{formatDayTime(dayTime)}</strong>
                  <span>Night</span>
                </div>
              </div>
            </GlassPanel>

            {unitPanelMode === "overview" ? (
              <GlassPanel kicker="Available Units" title="Live Snapshot">
                <div className="unit-snapshot">
                  <span><strong>18</strong> Available</span>
                  <span><strong>7</strong> Reserved</span>
                  <span><strong>4</strong> Sold</span>
                </div>
              </GlassPanel>
            ) : null}
          </div>
        ) : (
          <div className="hud-column">
            <GlassPanel kicker="Space Mood" title={mood}>
              <div className="mood-grid">
                {moods.map((option) => (
                  <button
                    className={`mood-button ${mood === option ? "is-selected" : ""}`}
                    key={option}
                    onClick={() => selectMood(option)}
                    type="button"
                  >
                    <span className={`mood-icon ${moodIcons[option]}`} aria-hidden="true" />
                    <span>{option}</span>
                  </button>
                ))}
              </div>
              <div className="time-slider-wrap">
                <input
                  aria-label="Time of day"
                  className="time-slider"
                  max={unrealTimeRange.max}
                  min={unrealTimeRange.min}
                  onChange={(event) => changeDayTime(Number(event.target.value))}
                  type="range"
                  value={dayTime}
                />
                <div className="time-slider-meta">
                  <span>Morning</span>
                  <strong>{formatDayTime(dayTime)}</strong>
                  <span>Night</span>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel kicker="Interior Confidence" title="92%">
              <div className="confidence">
                <ScoreRing score={92} />
                <p className="panel-copy">
                  Perfect match for your lifestyle based on selected mood and selected material finish.
                </p>
              </div>
            </GlassPanel>

            {activeJourney === "Customize" ? (
              <>
                <GlassPanel
                  kicker="Tour Status"
                  title={tourState.mode === "material-editor" ? "Material palette active" : "Apartment tour"}
                  copy={tourState.canInteract ? "Interactive surface detected." : "Viewport ready for guided customization."}
                />

              <GlassPanel kicker="Customize Furniture" title={selectedMesh}>
                <div className="mesh-list">
                  {editableMeshes.map((mesh) => (
                    <button
                        className={`mesh-button ${selectedMesh === mesh.label ? "is-selected" : ""}`}
                        key={mesh.label}
                        onClick={() => openMeshPalette(mesh)}
                        type="button"
                      >
                        {mesh.label}
                      </button>
                  ))}
                </div>
              </GlassPanel>

              {activePalette ? (
                <GlassPanel kicker="Material Palette" title={activePalette === "wood" ? "Wood" : "Fabric"}>
                  <div className="swatch-grid">
                    {visibleMaterials.map((item) => (
                      <MaterialSwatch
                        color={item.color}
                        key={item.id}
                        onSelect={() => selectMaterial(item.id)}
                        selected={selectedMaterialId === item.id}
                      />
                    ))}
                  </div>
                </GlassPanel>
              ) : null}
            </>
          ) : null}
          </div>
        )}

        <div className="center-stage" />

        <div className="hud-column right">
          {activeSection !== "Units" && (tourState.selectedUnit || tourState.unitDetailsHtml) ? (
            <GlassPanel
              kicker="Selected Unit"
              title={tourState.selectedUnit ?? "Unit details"}
              copy={`Status: ${tourState.availability}`}
            />
          ) : null}
        </div>
      </div>

      {isTourScreen ? (
        <aside className="movement-guide" aria-label="Movement guide">
          <div className="key-cluster" aria-hidden="true">
            <span>W</span>
            <span>A</span>
            <span>S</span>
            <span>D</span>
          </div>
          <div>
            <strong>Walk</strong>
            <span>Mouse to look</span>
          </div>
          <span className="mouse-guide" aria-hidden="true" />
        </aside>
      ) : null}

      {isTourScreen ? (
        <>
          <aside className={`look-action-panel ${isPreviewOpen || isMobilePanelOpen ? "is-mobile-hidden" : ""}`} aria-label="Look actions">
            <button className="save-look-button" onClick={saveLook} type="button">
              <span>Save Look</span>
              <span className="bookmark-icon" aria-hidden="true" />
            </button>
            <button className="apply-space-button" onClick={applyToSpace} type="button">
              <span>Reserve</span>
              <span className="arrow-icon" aria-hidden="true">›</span>
            </button>
          </aside>

          <div className={`mobile-tour-controls ${isMobilePanelOpen ? "is-hidden" : ""}`} aria-label="Mobile tour controls">
            <div
              className="mobile-joystick"
              onPointerCancel={stopJoystick}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                updateJoystick(event.clientX, event.clientY);
              }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                updateJoystick(event.clientX, event.clientY);
              }}
              onPointerUp={(event) => {
                event.currentTarget.releasePointerCapture(event.pointerId);
                stopJoystick();
              }}
              ref={joystickRef}
              role="application"
            >
              <span
                className="mobile-joystick-thumb"
                style={{
                  transform: `translate(${joystickPosition.x * 24}px, ${joystickPosition.y * 24}px)`,
                }}
              />
            </div>
            <button
              aria-pressed={isZoomed}
              aria-label="Toggle zoom"
              className={`mobile-zoom-button ${isZoomed ? "is-active" : ""}`}
              onClick={toggleMobileZoom}
              type="button"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m16.5 16.5 4.5 4.5" />
                <path d="M11 7v8" />
                <path d="M7 11h8" />
              </svg>
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
