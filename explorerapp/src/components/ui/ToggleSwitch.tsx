type ToggleSwitchProps = {
  label: string;
  checked: boolean;
  onToggle: () => void;
};

export function ToggleSwitch({ label, checked, onToggle }: ToggleSwitchProps) {
  return (
    <button
      aria-pressed={checked}
      className={`toggle-row ${checked ? "is-on" : ""}`}
      onClick={onToggle}
      type="button"
    >
      <span>{label}</span>
      <span className="toggle-switch" />
    </button>
  );
}
