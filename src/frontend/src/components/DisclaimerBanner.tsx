import { useState } from "react";

export default function DisclaimerBanner() {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem("disclaimer_collapsed") === "true",
  );

  const handleCollapse = () => {
    localStorage.setItem("disclaimer_collapsed", "true");
    setCollapsed(true);
  };

  const handleExpand = () => {
    localStorage.setItem("disclaimer_collapsed", "false");
    setCollapsed(false);
  };

  if (collapsed) {
    return (
      <div
        className="fixed bottom-28 right-4 z-50 flex items-center justify-center"
        data-ocid="disclaimer.collapsed.pill"
      >
        <button
          type="button"
          onClick={handleExpand}
          className="text-[10px] text-muted-foreground bg-card/95 hover:text-foreground transition-colors px-3 py-1.5 rounded-full shadow-card border border-border backdrop-blur-sm"
          aria-label="Show disclaimer"
          data-ocid="disclaimer.expand.button"
        >
          ⚠ Not financial advice
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-20 bg-muted/90 border-t border-border/60 backdrop-blur-sm"
      data-ocid="disclaimer.banner"
    >
      <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between gap-3">
        <p className="text-[10px] text-muted-foreground leading-tight flex-1">
          <span className="font-semibold text-foreground/70">
            ⚠ Not Financial Advice:
          </span>{" "}
          This app is for trip and earnings tracking only. Nothing here
          constitutes financial advice. Consult a qualified financial
          professional for guidance.
        </p>
        <button
          type="button"
          onClick={handleCollapse}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          aria-label="Dismiss disclaimer"
          data-ocid="disclaimer.collapse.button"
        >
          <svg
            viewBox="0 0 16 16"
            className="w-3.5 h-3.5"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
