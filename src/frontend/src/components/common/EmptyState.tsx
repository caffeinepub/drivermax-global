import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  onCta,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground/50">
        {icon}
      </div>
      <h3 className="font-display font-bold text-foreground text-base mb-1.5">
        {title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-5">
        {description}
      </p>
      {ctaLabel && onCta && (
        <Button
          onClick={onCta}
          size="sm"
          className="gap-2 rounded-xl px-5 min-h-[44px]"
        >
          {ctaLabel}
        </Button>
      )}
    </div>
  );
}
