import type { Route } from "./+types/home";
import { Dashboard } from "../dashboard/dashboard";
import { ThemeProvider } from "~/lib/theme-provider";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "HeriSure Dashboard" },
    { name: "description", content: "A Dashboard MVP displaying IoT Data" },
  ];
}

export default function Home() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Dashboard />
    </ThemeProvider>
  );
}
