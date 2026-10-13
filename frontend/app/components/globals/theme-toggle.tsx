import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";

export function ThemeToggle({ showLabel = false }: { showLabel?: boolean }) {
  const { isDark, toggleTheme } = useTheme();
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon-sm"}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      {isDark ? <Sun data-icon={showLabel ? "inline-start" : undefined} /> : <Moon data-icon={showLabel ? "inline-start" : undefined} />}
      {showLabel && (isDark ? "Light mode" : "Dark mode")}
    </Button>
  );
}
