import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
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
import Admin from "@/pages/Admin";
import InviteAccept from "@/pages/InviteAccept";
import { useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && location !== "/login" && !location.startsWith("/invite/")) {
      setLocation("/login");
    }
  }, [isAuthenticated, isLoading, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (location.startsWith("/invite/")) {
    return (
      <Switch>
        <Route path="/invite/:token" component={InviteAccept} />
      </Switch>
    );
  }

  if (!isAuthenticated) {
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
        <Route path="/admin" component={Admin} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
