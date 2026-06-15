type SegmentedControlProps<T extends string> = {
  options: readonly T[];
  selected: T;
  columns?: "two" | "three";
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  options,
  selected,
  columns = "three",
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div className={`segmented ${columns}`}>
      {options.map((option) => (
        <button
          className={`segmented-button ${selected === option ? "is-selected" : ""}`}
          key={option}
          onClick={() => onChange(option)}
          type="button"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
