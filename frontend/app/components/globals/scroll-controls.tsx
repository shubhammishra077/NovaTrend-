import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScrollControls() {
  const [progress, setProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let frame = 0;

    function updateScrollState() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const nextProgress = maxScroll > 0 ? (window.scrollY / maxScroll) * 100 : 0;
        setProgress(Math.min(100, Math.max(0, nextProgress)));
        setShowBackToTop(window.scrollY > 400);
      });
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  function scrollToTop() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  return (
    <>
      <div
        role="progressbar"
        aria-label="Page scroll progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        className="fixed inset-x-0 top-0 z-50 h-1 bg-transparent"
      >
        <div
          className="h-full origin-left bg-primary"
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>
      {showBackToTop && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Back to top"
          onClick={scrollToTop}
          className="fixed bottom-20 right-5 z-40 rounded-full bg-card shadow-lg"
        >
          <ArrowUp />
        </Button>
      )}
    </>
  );
}
