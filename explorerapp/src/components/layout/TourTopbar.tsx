const tabs = [
  { label: "Home", descriptor: "1100" },
  { label: "Amenities", descriptor: "1102" },
  { label: "Surroundings", descriptor: "1101" },
  { label: "Units", descriptor: "1103" },
] as const;

type TourTopbarProps = {
  activeSection?: string;
  onNavigate?: (descriptor: string, label: string) => void;
};

export function TourTopbar({ activeSection = "Home", onNavigate }: TourTopbarProps) {
  return (
    <header className="tour-topbar">
      <div className="brand-lockup">
        <div className="brand-mark">H</div>
        <div>
          <strong>HOMW</strong>
          <span>Real Estate Decision Infrastructure</span>
        </div>
      </div>
      <nav aria-label="Tour sections" className="tour-tabs">
        {tabs.map((tab) => (
          <button
            className={`tour-tab ${tab.label === activeSection ? "is-active" : ""}`}
            key={tab.label}
            onClick={() => onNavigate?.(tab.descriptor, tab.label)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
