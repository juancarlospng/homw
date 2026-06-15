import type { CSSProperties } from "react";

type MaterialSwatchProps = {
  color: string;
  selected: boolean;
  onSelect: () => void;
};

export function MaterialSwatch({ color, selected, onSelect }: MaterialSwatchProps) {
  return (
    <button
      aria-label="Select material"
      className={`material-swatch ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      style={{ "--swatch": color } as CSSProperties}
      type="button"
    >
      <span className="swatch-color" />
    </button>
  );
}
