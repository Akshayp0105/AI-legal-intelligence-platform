/** Props for the base Skeleton loading component. */
interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string;
  height?: string;
  lines?: number;
}

/** Reusable skeleton loading placeholder with text, circular, and rectangular variants. */
export function Skeleton({
  className = "",
  variant = "text",
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const baseClasses = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 rounded";

  const variantClasses = {
    text: "h-4 w-full",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  if (variant === "text" && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${variantClasses[variant]}`}
            style={{
              width: i === lines - 1 ? "70%" : width || "100%",
              height: height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
}

/** Skeleton layout for chat message placeholders. */
export function ChatSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-start gap-3">
        <Skeleton variant="circular" width="32px" height="32px" />
        <div className="flex-1 space-y-2">
          <Skeleton lines={3} />
        </div>
      </div>
      <div className="flex items-start gap-3 justify-end">
        <div className="flex-1 space-y-2">
          <Skeleton lines={2} />
        </div>
        <Skeleton variant="circular" width="32px" height="32px" />
      </div>
    </div>
  );
}

/** Skeleton layout for a single card placeholder. */
export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <Skeleton width="60%" height="20px" />
      <Skeleton lines={2} />
      <div className="flex gap-2">
        <Skeleton width="80px" height="24px" variant="rectangular" />
        <Skeleton width="60px" height="24px" variant="rectangular" />
      </div>
    </div>
  );
}

/** Skeleton grid layout for the dashboard with multiple card placeholders. */
export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
