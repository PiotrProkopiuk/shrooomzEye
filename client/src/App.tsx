import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Guilds from "@/pages/Guilds";
import Players from "@/pages/Players";
import Events from "@/pages/Events";
import Settings from "@/pages/Settings";
import Leaderboards from "@/pages/Leaderboards";
import ActivityHistory from "@/pages/ActivityHistory";
import Templates from "@/pages/Templates";
import Verification from "@/pages/Verification";
import GuildStats from "@/pages/GuildStats";
import Login from "@/pages/Login";
import { useEffect, useState } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("mock_auth") === "true");

  useEffect(() => {
    // Listen for storage changes to update auth state
    const checkAuth = () => {
      setIsAuthenticated(localStorage.getItem("mock_auth") === "true");
    };
    
    window.addEventListener('storage', checkAuth);
    // Poll for changes since storage event only fires on other windows
    const interval = setInterval(checkAuth, 500);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, location, setLocation]);

  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/:rest*">
        {isAuthenticated ? (
          <Layout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/verification" component={Verification} />
              <Route path="/stats" component={GuildStats} />
              <Route path="/guilds" component={Guilds} />
              <Route path="/players" component={Players} />
              <Route path="/leaderboards" component={Leaderboards} />
              <Route path="/events" component={Events} />
              <Route path="/templates" component={Templates} />
              <Route path="/history" component={ActivityHistory} />
              <Route path="/settings" component={Settings} />
              <Route component={NotFound} />
            </Switch>
          </Layout>
        ) : (
          <Route component={Login} />
        )}
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
