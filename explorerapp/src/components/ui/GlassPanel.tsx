import type { ReactNode } from "react";

type GlassPanelProps = {
  kicker?: string;
  title?: string;
  copy?: string;
  children?: ReactNode;
  className?: string;
};

export function GlassPanel({ kicker, title, copy, children, className = "" }: GlassPanelProps) {
  return (
    <section className={`glass-panel ${className}`.trim()}>
      <div className="panel-inner">
        {kicker ? <p className="panel-kicker">{kicker}</p> : null}
        {title ? <h2 className="panel-title">{title}</h2> : null}
        {copy ? <p className="panel-copy">{copy}</p> : null}
        {children}
      </div>
    </section>
  );
}
