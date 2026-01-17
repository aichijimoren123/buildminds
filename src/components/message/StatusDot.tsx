export type StatusVariant = "accent" | "success" | "error";

interface StatusDotProps {
  variant?: StatusVariant;
  isActive?: boolean;
  isVisible?: boolean;
}

export function StatusDot({
  variant = "accent",
  isActive = false,
  isVisible = true,
}: StatusDotProps) {
  if (!isVisible) {
    return null;
  }

  const colorClass =
    variant === "success"
      ? "bg-success"
      : variant === "error"
        ? "bg-error"
        : "bg-accent";

  return (
    <span className="relative flex h-2 w-2">
      {isActive && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${colorClass} opacity-75`}
        />
      )}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${colorClass}`}
      />
    </span>
  );
}
