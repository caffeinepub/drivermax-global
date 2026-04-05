interface SkeletonCardProps {
  lines?: number;
  className?: string;
  showHeader?: boolean;
}

const SKELETON_WIDTHS = ["85%", "73%", "61%", "49%", "37%"];

export default function SkeletonCard({
  lines = 3,
  className = "",
  showHeader = true,
}: SkeletonCardProps) {
  return (
    <div
      className={`bg-card rounded-2xl shadow-card p-5 animate-pulse ${className}`}
      data-ocid="skeleton.card"
    >
      {showHeader && (
        <div className="mb-4">
          <div className="skeleton-loader h-4 w-2/5 rounded-full mb-2" />
          <div className="skeleton-loader h-8 w-3/5 rounded-full" />
        </div>
      )}
      <div className="space-y-2.5">
        {SKELETON_WIDTHS.slice(0, lines).map((w) => (
          <div
            key={w}
            className="skeleton-loader h-3 rounded-full"
            style={{ width: w }}
          />
        ))}
      </div>
    </div>
  );
}
