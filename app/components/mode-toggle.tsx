import { Moon, Sun } from "lucide-react";
import { useTheme } from "../lib/theme-provider";

import { Button } from "./ui/button";

export function ModeToggle() {
  const { theme, setTheme } = useTheme(); // Get both theme and setTheme

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button variant="outline" size="icon" onClick={toggleTheme}>
      <Sun
        className={`h-[1.2rem] w-[1.2rem] ${
          theme === "light" ? "rotate-0 scale-100" : "-rotate-90 scale-0"
        } transition-all`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] ${
          theme === "light" ? "rotate-90 scale-0" : "rotate-0 scale-100"
        } transition-all`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
