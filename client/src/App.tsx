import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Router as WouterRouter, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";

const Home = lazy(() => import("./pages/Home"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Approvals = lazy(() => import("./pages/Approvals"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Agents = lazy(() => import("./pages/Agents"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SitesPage = lazy(() => import("./pages/SitesPage"));

function PageShell({ children }: { children: React.ReactNode }) {
  return <DashboardLayout><Suspense fallback={<div className="grid min-h-[55vh] place-items-center text-sm text-[#718076]">Loading workspace…</div>}>{children}</Suspense></DashboardLayout>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <WouterRouter hook={useHashLocation}>
      <Switch>
        <Route path={"/"}>{() => <PageShell><Home /></PageShell>}</Route>
        <Route path={"/pipeline"}>{() => <PageShell><Pipeline /></PageShell>}</Route>
        <Route path={"/approvals"}>{() => <PageShell><Approvals /></PageShell>}</Route>
        <Route path={"/projects"}>{() => <PageShell><Projects /></PageShell>}</Route>
        <Route path={"/projects/:publicId"}>{() => <PageShell><ProjectDetail /></PageShell>}</Route>
        <Route path={"/agents"}>{() => <PageShell><Agents /></PageShell>}</Route>
        <Route path={"/activity"}>{() => <PageShell><ActivityPage /></PageShell>}</Route>
        <Route path={"/notifications"}>{() => <PageShell><NotificationsPage /></PageShell>}</Route>
        <Route path={"/sites"}>{() => <PageShell><SitesPage /></PageShell>}</Route>
        <Route path={"/settings"}>{() => <PageShell><SettingsPage /></PageShell>}</Route>
        <Route path={"/404"} component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </WouterRouter>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
