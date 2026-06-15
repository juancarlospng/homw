import type { CSSProperties } from "react";

type ScoreRingProps = {
  score: number;
};

export function ScoreRing({ score }: ScoreRingProps) {
  return (
    <div className="score-ring" style={{ "--score": score } as CSSProperties}>
      <span>{score}%</span>
    </div>
  );
}
