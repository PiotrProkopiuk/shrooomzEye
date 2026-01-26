import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Swords, 
  Settings, 
  Menu,
  Shield,
  Ghost,
  ChevronDown,
  LayoutGrid,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  LogIn,
  Eye,
  Skull,
  TrendingUp
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import bgTexture from "@assets/generated_images/dark_stone_rpg_texture_background.png";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Online Activity", icon: Eye, href: "/online" },
  { label: "Combat & Activity", icon: Skull, href: "/history" },
  { label: "Progress & Rankings", icon: TrendingUp, href: "/levels" },
  { label: "Verification", icon: ShieldCheck, href: "/verification" },
  { label: "Guild Stats", icon: BarChart3, href: "/stats" },
  { label: "Guilds", icon: Shield, href: "/guilds" },
  { label: "Players", icon: Users, href: "/players" },
  { label: "Events & Quests", icon: Swords, href: "/events" },
  { label: "Event Templates", icon: LayoutGrid, href: "/templates" },
  { label: "Bot Settings", icon: Settings, href: "/settings" },
];

interface Guild {
  id: number;
  name: string;
  server: string;
  isEnemy: boolean;
  verified: boolean;
}

function Sidebar({ location }: { location: string }) {
  return (
    <div className="h-full flex flex-col bg-sidebar border-r border-border relative overflow-hidden">
        <div 
            className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: 'cover' }}
        />
        
      <div className="p-6 border-b border-sidebar-border z-10">
        <div className="flex items-center gap-3" title="your guild intelligence dashboard">
            <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
                <Eye className="h-6 w-6 text-primary" />
            </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none text-foreground" data-testid="brand-name">ShrooomzEye</h1>
            <span className="text-xs text-muted-foreground">Intelligence Dashboard</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 z-10 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 cursor-pointer group ${
                  isActive
                    ? "bg-sidebar-primary/10 text-primary border border-sidebar-primary/20 shadow-[0_0_15px_-3px_rgba(234,179,8,0.15)]"
                    : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border z-10">
         <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">A</div>
                <div>
                    <div className="text-sm font-medium">Administrator</div>
                    <Badge variant="outline" className="text-[10px] h-4 border-primary/30 text-primary">Leader Role</Badge>
                </div>
            </div>
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => {
                    localStorage.removeItem("mock_auth");
                    window.location.href = "/login";
                }}
            >
                <LogIn className="h-4 w-4 rotate-180" />
            </Button>
         </div>
        <div className="bg-card/50 p-3 rounded border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">System Status</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span>
          </div>
          <div className="text-xs text-muted-foreground">
            Bot Online<br/>
            Last checked: 2m ago
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  const { data: guilds = [] } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
    queryFn: async () => {
      const response = await fetch("/api/guilds");
      if (!response.ok) throw new Error("Failed to fetch guilds");
      return response.json();
    },
  });

  const mainGuild = guilds.find(g => !g.isEnemy) || guilds[0];
  const [activeGuild, setActiveGuild] = useState<Guild | null>(null);
  
  useEffect(() => {
    if (guilds.length > 0 && !activeGuild) {
      setActiveGuild(mainGuild || guilds[0]);
    }
  }, [guilds, activeGuild, mainGuild]);

  const currentGuild = activeGuild || mainGuild;

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans">
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <Sidebar location={location} />
      </aside>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-sidebar-border">
          <Sidebar location={location} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
         <div 
            className="fixed inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay z-0"
            style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: 'cover' }}
        />

        <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsOpen(true)}>
                    <Menu className="h-5 w-5" />
                </Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="h-10 px-4 py-2 border-white/10 hover:bg-white/5 gap-2 text-foreground font-display font-semibold">
                            <Shield className="h-4 w-4 text-primary" />
                            {currentGuild ? `${currentGuild.name} (${currentGuild.server})` : "Select Guild"}
                            {currentGuild && !currentGuild.verified && <Badge variant="destructive" className="h-4 text-[8px] px-1 uppercase ml-1 animate-pulse">Unverified</Badge>}
                            {currentGuild?.isEnemy && <Badge variant="outline" className="h-4 text-[8px] px-1 uppercase ml-1 border-red-500 text-red-400">Enemy</Badge>}
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-72 bg-sidebar border border-sidebar-border text-foreground shadow-2xl z-50">
                        <DropdownMenuLabel>Switch Guild Context</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/5" />
                        {guilds.filter(g => !g.isEnemy).length > 0 && (
                          <>
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Your Guilds</DropdownMenuLabel>
                            {guilds.filter(g => !g.isEnemy).map(guild => (
                              <DropdownMenuItem 
                                key={guild.id} 
                                onClick={() => setActiveGuild(guild)}
                                className="hover:bg-sidebar-accent cursor-pointer flex justify-between items-center"
                              >
                                <span>{guild.name} ({guild.server})</span>
                                {guild.verified ? <ShieldCheck className="h-3 w-3 text-emerald-500" /> : <ShieldAlert className="h-3 w-3 text-amber-500" />}
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                        {guilds.filter(g => g.isEnemy).length > 0 && (
                          <>
                            <DropdownMenuSeparator className="bg-white/5" />
                            <DropdownMenuLabel className="text-xs text-red-400">Enemy Guilds</DropdownMenuLabel>
                            {guilds.filter(g => g.isEnemy).map(guild => (
                              <DropdownMenuItem 
                                key={guild.id} 
                                onClick={() => setActiveGuild(guild)}
                                className="hover:bg-sidebar-accent cursor-pointer flex justify-between items-center"
                              >
                                <span className="text-red-400/80">{guild.name} ({guild.server})</span>
                                <Skull className="h-3 w-3 text-red-500" />
                              </DropdownMenuItem>
                            ))}
                          </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-white/5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-muted-foreground">TibiaData API: Connected</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold font-display">
                    A
                </div>
            </div>
        </header>

        <div className="flex-1 p-6 relative z-10 overflow-y-auto">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </div>

        <footer className="border-t border-border bg-background/50 backdrop-blur-sm py-3 px-6 z-10">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div 
              className="flex items-center gap-2 cursor-default" 
              title="your guild intelligence dashboard"
              data-testid="footer-brand"
            >
              <Eye className="h-4 w-4 text-primary/70" />
              <span className="text-sm font-display font-semibold text-muted-foreground">ShrooomzEye</span>
            </div>
            <span className="text-xs text-muted-foreground/70 italic" data-testid="footer-tagline">
              your guild intelligence dashboard
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
