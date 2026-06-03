interface EmptyStateProps {
  icon?: string;
  heading: string;
  children?: React.ReactNode;
}

/** Centered empty-state block: icon + heading + optional CTA/body. */
export function EmptyState({ icon = "📭", heading, children }: EmptyStateProps) {
  return (
    <div className="empty-state stack" style={{ alignItems: "center" }}>
      <div className="icon" aria-hidden="true">
        {icon}
      </div>
      <h2 style={{ margin: 0 }}>{heading}</h2>
      {children}
    </div>
  );
}
