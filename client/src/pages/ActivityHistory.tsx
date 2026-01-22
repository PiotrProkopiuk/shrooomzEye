import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  History, 
  Shield, 
  User, 
  Calendar, 
  AlertTriangle,
  Bot,
  Skull,
  Swords,
  RefreshCw,
  Clock,
  Trophy,
  HeartCrack,
  Filter,
  X
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow, format, subDays } from "date-fns";

interface Death {
  id: number;
  characterName: string;
  level: number;
  killerName: string | null;
  killerGuild: string | null;
  victimGuildId: number | null;
  victimGuildType: string | null;
  vocation: string | null;
  isPvp: boolean;
  occurredAt: string | null;
  createdAt: string | null;
  notified: boolean;
  deathHash: string | null;
}

interface Guild {
  id: number;
  name: string;
}

const STATIC_LOGS = [
  { id: 1, type: "guild", msg: "Guild 'Red Rose' status changed to Ally", user: "Admin", time: "5 mins ago", color: "text-emerald-500" },
  { id: 2, type: "player", msg: "Player 'Bubble' reached Level 251", user: "System", time: "12 mins ago", color: "text-primary" },
  { id: 3, type: "event", msg: "Soul War Service signup closed (Max Participants)", user: "System", time: "25 mins ago", color: "text-orange-500" },
  { id: 4, type: "bot", msg: "Automated Daily Report generated & sent to Discord", user: "Bot", time: "1 hour ago", color: "text-blue-400" },
  { id: 5, type: "settings", msg: "PVP Alert role changed to @WarTeam", user: "Admin", time: "5 hours ago", color: "text-muted-foreground" },
];

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

interface DeathsResponse {
  deaths: Death[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface DeathStats {
  total: number;
  mainGuildDeaths: number;
  enemyGuildDeaths: number;
  pvpDeaths: number;
  pveDeaths: number;
}

export default function ActivityHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("deaths");
  const [filterType, setFilterType] = useState<"all" | "friend" | "enemy">("all");
  const [deathType, setDeathType] = useState<"all" | "pvp" | "pve">("all");
  const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build query params for API
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("page", currentPage.toString());
    params.set("pageSize", pageSize.toString());
    
    // Date filters
    if (dateRange !== "all") {
      const now = new Date();
      let fromDate: Date;
      switch (dateRange) {
        case "today":
          fromDate = subDays(now, 1);
          break;
        case "week":
          fromDate = subDays(now, 7);
          break;
        case "month":
          fromDate = subDays(now, 30);
          break;
        default:
          fromDate = now;
      }
      params.set("dateFrom", fromDate.toISOString());
    }
    
    // Death type filter (PvP/PvE) - applied via API
    if (deathType === "pvp") {
      params.set("isPvp", "true");
    } else if (deathType === "pve") {
      params.set("isPvp", "false");
    }
    
    // Guild type filter - applied via API
    if (filterType === "friend") {
      params.set("victimGuildType", "main");
    } else if (filterType === "enemy") {
      params.set("victimGuildType", "enemy");
    }
    
    return params.toString();
  };

  const { data: deathsData, isLoading: deathsLoading } = useQuery<DeathsResponse>({
    queryKey: ["/api/death-tracker/recent", currentPage, pageSize, filterType, deathType, dateRange],
    queryFn: async () => {
      const res = await fetch(`/api/death-tracker/recent?${buildQueryParams()}`);
      return res.json();
    },
    refetchInterval: 30000,
  });

  // Stats filtered by same criteria as deaths list
  const { data: stats } = useQuery<DeathStats>({
    queryKey: ["/api/death-tracker/stats", filterType, deathType, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      // Date range filter
      if (dateRange !== "all") {
        const now = new Date();
        let dateFrom: Date;
        switch (dateRange) {
          case "today":
            dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case "week":
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case "month":
            dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            dateFrom = new Date(0);
        }
        params.set("dateFrom", dateFrom.toISOString());
      }
      
      // Death type filter (PvP/PvE)
      if (deathType === "pvp") {
        params.set("isPvp", "true");
      } else if (deathType === "pve") {
        params.set("isPvp", "false");
      }
      
      // Guild type filter
      if (filterType === "friend") {
        params.set("victimGuildType", "main");
      } else if (filterType === "enemy") {
        params.set("victimGuildType", "enemy");
      }
      
      const url = `/api/death-tracker/stats${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      return res.json();
    },
    refetchInterval: 30000,
  });

  const deaths = deathsData?.deaths || [];
  const totalPages = deathsData?.totalPages || 1;
  const totalDeaths = deathsData?.total || 0;

  const { data: guilds = [] } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/death-tracker/scan-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 1 }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentPage(1);
      queryClient.invalidateQueries({ queryKey: ["/api/death-tracker/recent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/death-tracker/stats"] });
      toast({
        title: "Skanowanie zakończone",
        description: `Znaleziono ${data.totalNewDeaths || 0} nowych śmierci`,
      });
    },
    onError: () => {
      toast({
        title: "Błąd skanowania",
        description: "Nie udało się przeskanować śmierci",
        variant: "destructive",
      });
    },
  });

  const guildMap = guilds.reduce((acc, g) => {
    acc[g.id] = g.name;
    return acc;
  }, {} as Record<number, string>);

  // Only local filter by search term (API handles other filters)
  const filteredDeaths = deaths.filter(death => 
    death.characterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (death.killerName && death.killerName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Reset page when filters change
  const handleFilterChange = (type: "all" | "friend" | "enemy") => {
    setFilterType(type);
    setCurrentPage(1);
  };

  const handleDeathTypeChange = (type: "all" | "pvp" | "pve") => {
    setDeathType(type);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (range: "all" | "today" | "week" | "month") => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilterType("all");
    setDeathType("all");
    setDateRange("all");
    setCurrentPage(1);
  };

  const hasActiveFilters = filterType !== "all" || deathType !== "all" || dateRange !== "all";

  const filteredLogs = STATIC_LOGS.filter(log =>
    log.msg.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isEnemy = (death: Death) => death.victimGuildType === "enemy";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Activity History</h1>
          <p className="text-muted-foreground">Audit log of deaths, guild events, and bot actions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
              <Skull className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.total || 0}</p>
              <p className="text-sm text-muted-foreground">Wszystkie</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{stats?.enemyGuildDeaths || 0}</p>
              <p className="text-sm text-emerald-400/70">Fragi (Enemy)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <HeartCrack className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{stats?.mainGuildDeaths || 0}</p>
              <p className="text-sm text-red-400/70">Straty (Guild)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <Swords className="h-6 w-6 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-400">{stats?.pvpDeaths || 0}</p>
              <p className="text-sm text-orange-400/70">PvP</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Skull className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">{stats?.pveDeaths || 0}</p>
              <p className="text-sm text-blue-400/70">PvE</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-background/50 border border-white/10">
          <TabsTrigger value="deaths" className="data-[state=active]:bg-primary/20">
            <Skull className="h-4 w-4 mr-2" />
            Death Log
          </TabsTrigger>
          <TabsTrigger value="activity" className="data-[state=active]:bg-primary/20">
            <History className="h-4 w-4 mr-2" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="deaths" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex flex-col gap-4">
                {/* First row: Search and Scan */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Szukaj po nazwie postaci lub zabójcy..." 
                      className="pl-10 bg-background/50 border-white/10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      data-testid="input-search-deaths"
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => scanMutation.mutate()}
                    disabled={scanMutation.isPending}
                    data-testid="button-refresh-deaths"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
                    {scanMutation.isPending ? 'Skanowanie...' : 'Skanuj teraz'}
                  </Button>
                </div>
                
                {/* Second row: Filters */}
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Filtry:</span>
                  </div>
                  
                  {/* Guild type filter */}
                  <div className="flex gap-1">
                    <Button
                      variant={filterType === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange("all")}
                      data-testid="filter-all"
                    >
                      Wszyscy
                    </Button>
                    <Button
                      variant={filterType === "enemy" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange("enemy")}
                      className={filterType === "enemy" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                      data-testid="filter-enemy"
                    >
                      <Trophy className="h-4 w-4 mr-1" />
                      Enemy
                    </Button>
                    <Button
                      variant={filterType === "friend" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange("friend")}
                      className={filterType === "friend" ? "bg-red-600 hover:bg-red-700" : ""}
                      data-testid="filter-friend"
                    >
                      <HeartCrack className="h-4 w-4 mr-1" />
                      Gildia
                    </Button>
                  </div>
                  
                  {/* Death type filter (PvP/PvE) */}
                  <Select value={deathType} onValueChange={(v) => handleDeathTypeChange(v as "all" | "pvp" | "pve")}>
                    <SelectTrigger className="w-[130px] bg-background/50 border-white/10" data-testid="filter-death-type">
                      <SelectValue placeholder="Rodzaj" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Wszystkie</SelectItem>
                      <SelectItem value="pvp">Tylko PvP</SelectItem>
                      <SelectItem value="pve">Tylko PvE</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Date range filter */}
                  <Select value={dateRange} onValueChange={(v) => handleDateRangeChange(v as "all" | "today" | "week" | "month")}>
                    <SelectTrigger className="w-[150px] bg-background/50 border-white/10" data-testid="filter-date-range">
                      <Calendar className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Okres" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Cała historia</SelectItem>
                      <SelectItem value="today">Ostatnie 24h</SelectItem>
                      <SelectItem value="week">Ostatni tydzień</SelectItem>
                      <SelectItem value="month">Ostatni miesiąc</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Clear filters button */}
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="text-muted-foreground hover:text-foreground"
                      data-testid="button-clear-filters"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Wyczyść filtry
                    </Button>
                  )}
                </div>
                
                {/* Active filters indicator */}
                {hasActiveFilters && (
                  <div className="text-sm text-muted-foreground">
                    Wyświetlono {totalDeaths} wyników z filtrami
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {deathsLoading ? (
                <div className="p-8 text-center text-muted-foreground">Loading deaths...</div>
              ) : filteredDeaths.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Skull className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No deaths recorded yet.</p>
                  <p className="text-sm mt-2">Deaths will appear here as they are detected.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredDeaths.map((death) => {
                    const enemy = isEnemy(death);
                    return (
                      <div 
                        key={death.id} 
                        className={`p-4 flex items-center justify-between transition-colors group ${
                          enemy 
                            ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-l-4 border-l-emerald-500' 
                            : 'bg-red-500/5 hover:bg-red-500/10 border-l-4 border-l-red-500'
                        }`}
                        data-testid={`death-log-${death.id}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-lg border-2 flex items-center justify-center ${
                            enemy 
                              ? 'bg-emerald-500/20 border-emerald-500/50' 
                              : 'bg-red-500/20 border-red-500/50'
                          }`}>
                            {enemy ? (
                              <Trophy className="h-6 w-6 text-emerald-500" />
                            ) : death.isPvp ? (
                              <Swords className="h-6 w-6 text-red-500" />
                            ) : (
                              <Skull className="h-6 w-6 text-red-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                className={`text-xs font-bold ${
                                  enemy 
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}
                              >
                                {enemy ? 'ENEMY FRAG' : 'GUILD LOSS'}
                              </Badge>
                              <span className={`text-base font-bold ${enemy ? 'text-emerald-300' : 'text-red-300'}`}>
                                {death.characterName}
                              </span>
                              <span className="text-sm text-muted-foreground">Level {death.level}</span>
                              {death.vocation && (
                                <Badge variant="outline" className="text-xs">
                                  {death.vocation}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <span>Killed by:</span>
                              <span className={`font-medium ${enemy ? 'text-emerald-200' : 'text-red-200'}`}>
                                {death.killerName || "Unknown"}
                              </span>
                              {death.killerGuild && (
                                <Badge variant="secondary" className="text-xs">
                                  {death.killerGuild}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              {death.victimGuildId && guildMap[death.victimGuildId] && (
                                <span className="text-xs text-muted-foreground">
                                  Guild: {guildMap[death.victimGuildId]}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTime(death.occurredAt || death.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-col">
                          {death.isPvp && (
                            <Badge variant="destructive" className="text-xs">
                              PVP
                            </Badge>
                          )}
                          {death.notified ? (
                            <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-400/30">
                              Notified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-white/5">
                  <span className="text-sm text-muted-foreground">
                    Strona {currentPage} z {totalPages} ({totalDeaths} śmierci)
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage <= 1}
                      data-testid="button-prev-page"
                    >
                      Poprzednia
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage >= totalPages}
                      data-testid="button-next-page"
                    >
                      Następna
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card className="bg-card/50 border-border/50">
            <CardHeader className="pb-3 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Filter audit logs..." 
                    className="pl-10 bg-background/50 border-white/10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-activity"
                  />
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-white/5">Guilds</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-white/5">Players</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-white/5">Bot</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-background border border-white/10 flex items-center justify-center">
                        {log.type === 'guild' && <Shield className="h-5 w-5 text-emerald-500" />}
                        {log.type === 'player' && <User className="h-5 w-5 text-primary" />}
                        {log.type === 'event' && <Calendar className="h-5 w-5 text-orange-500" />}
                        {log.type === 'bot' && <Bot className="h-5 w-5 text-blue-400" />}
                        {log.type === 'death' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                        {log.type === 'settings' && <History className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${log.color}`}>{log.msg}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">User: {log.user}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">{log.time}</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      View Details
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
