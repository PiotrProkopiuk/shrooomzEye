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
import ActivityHistory from "@/pages/ActivityHistory";
import Templates from "@/pages/Templates";
import Verification from "@/pages/Verification";
import GuildStats from "@/pages/GuildStats";
import Login from "@/pages/Login";
import OnlineActivity from "@/pages/OnlineActivity";
import LevelProgress from "@/pages/LevelProgress";
import CharacterProfile from "@/pages/CharacterProfile";
import GuildChanges from "@/pages/GuildChanges";
import { useEffect, useState } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("mock_auth") === "true");

  useEffect(() => {
    const checkAuth = () => {
      const auth = localStorage.getItem("mock_auth") === "true";
      setIsAuthenticated(auth);
    };
    
    // Check auth on every location change
    checkAuth();
    
    window.addEventListener('storage', checkAuth);
    const interval = setInterval(checkAuth, 1000);
    
    return () => {
      window.removeEventListener('storage', checkAuth);
      clearInterval(interval);
    };
  }, [location]);

  useEffect(() => {
    if (!isAuthenticated && location !== "/login") {
      setLocation("/login");
    }
  }, [isAuthenticated, location, setLocation]);

  if (!isAuthenticated && location !== "/login") {
    return null; // Prevent flicker
  }

  if (location === "/login") {
    return <Login />;
  }

  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/verification" component={Verification} />
        <Route path="/stats" component={GuildStats} />
        <Route path="/guilds" component={Guilds} />
        <Route path="/players" component={Players} />
        <Route path="/events" component={Events} />
        <Route path="/templates" component={Templates} />
        <Route path="/history" component={ActivityHistory} />
        <Route path="/settings" component={Settings} />
        <Route path="/online" component={OnlineActivity} />
        <Route path="/levels" component={LevelProgress} />
        <Route path="/guild-changes" component={GuildChanges} />
        <Route path="/character/:name" component={CharacterProfile} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
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
