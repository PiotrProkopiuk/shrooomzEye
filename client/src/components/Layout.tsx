import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  Swords, 
  Calendar, 
  Settings, 
  Menu,
  Shield,
  Ghost,
  Trophy,
  History,
  ChevronDown,
  LayoutGrid
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
import { useState } from "react";
import bgTexture from "@assets/generated_images/dark_stone_rpg_texture_background.png";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Guilds", icon: Shield, href: "/guilds" },
  { label: "Players", icon: Users, href: "/players" },
  { label: "Leaderboards", icon: Trophy, href: "/leaderboards" },
  { label: "Events & Quests", icon: Swords, href: "/events" },
  { label: "Event Templates", icon: LayoutGrid, href: "/templates" },
  { label: "Audit Log", icon: History, href: "/history" },
  { label: "Bot Settings", icon: Settings, href: "/settings" },
];

const SERVERS = [
  { id: "1", name: "Dark Alliance (Antica)" },
  { id: "2", name: "Red Rose (Antica)" },
  { id: "3", name: "Hill (Vunira)" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeServer, setActiveServer] = useState(SERVERS[0]);

  const Sidebar = () => (
    <div className="h-full flex flex-col bg-sidebar border-r border-border relative overflow-hidden">
        <div 
            className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay"
            style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: 'cover' }}
        />
        
      <div className="p-6 border-b border-sidebar-border z-10">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
                <Ghost className="h-6 w-6 text-primary" />
            </div>
          <div>
            <h1 className="font-display font-bold text-xl leading-none text-foreground">TibiaBot</h1>
            <span className="text-xs text-muted-foreground">Admin Panel</span>
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
         <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">A</div>
            <div>
                <div className="text-sm font-medium">Administrator</div>
                <Badge variant="outline" className="text-[10px] h-4 border-primary/30 text-primary">Leader Role</Badge>
            </div>
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

  return (
    <div className="min-h-screen bg-background flex text-foreground font-sans">
      <aside className="hidden md:block w-64 fixed inset-y-0 z-50">
        <Sidebar />
      </aside>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-sidebar border-r border-sidebar-border">
          <Sidebar />
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
                            {activeServer.name}
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64 bg-sidebar border-sidebar-border text-foreground">
                        <DropdownMenuLabel>Switch Guild Context</DropdownMenuLabel>
                        <DropdownMenuSeparator className="bg-white/5" />
                        {SERVERS.map(server => (
                            <DropdownMenuItem 
                                key={server.id} 
                                onClick={() => setActiveServer(server)}
                                className="hover:bg-sidebar-accent cursor-pointer"
                            >
                                {server.name}
                            </DropdownMenuItem>
                        ))}
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
      </main>
    </div>
  );
}
