import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  HeartCrack
} from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

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

export default function ActivityHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("deaths");
  const [filterType, setFilterType] = useState<"all" | "friend" | "enemy">("all");
  const queryClient = useQueryClient();

  const { data: deaths = [], isLoading: deathsLoading } = useQuery<Death[]>({
    queryKey: ["/api/death-tracker/recent"],
  });

  const { data: guilds = [] } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });

  const guildMap = guilds.reduce((acc, g) => {
    acc[g.id] = g.name;
    return acc;
  }, {} as Record<number, string>);

  const sortedDeaths = [...deaths].sort((a, b) => {
    const dateA = new Date(a.occurredAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.occurredAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const filteredDeaths = sortedDeaths
    .filter(death => {
      if (filterType === "friend") return death.victimGuildType === "main";
      if (filterType === "enemy") return death.victimGuildType === "enemy";
      return true;
    })
    .filter(death => 
      death.characterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (death.killerName && death.killerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const friendDeaths = deaths.filter(d => d.victimGuildType === "main").length;
  const enemyDeaths = deaths.filter(d => d.victimGuildType === "enemy").length;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-muted/50 flex items-center justify-center">
              <Skull className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{deaths.length}</p>
              <p className="text-sm text-muted-foreground">Total Deaths</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-400">{enemyDeaths}</p>
              <p className="text-sm text-emerald-400/70">Enemy Deaths (Frags!)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center">
              <HeartCrack className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-400">{friendDeaths}</p>
              <p className="text-sm text-red-400/70">Guild Deaths</p>
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
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search deaths by character or killer..." 
                    className="pl-10 bg-background/50 border-white/10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    data-testid="input-search-deaths"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={filterType === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("all")}
                    data-testid="filter-all"
                  >
                    All
                  </Button>
                  <Button
                    variant={filterType === "enemy" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("enemy")}
                    className={filterType === "enemy" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                    data-testid="filter-enemy"
                  >
                    <Trophy className="h-4 w-4 mr-1" />
                    Enemy
                  </Button>
                  <Button
                    variant={filterType === "friend" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilterType("friend")}
                    className={filterType === "friend" ? "bg-red-600 hover:bg-red-700" : ""}
                    data-testid="filter-friend"
                  >
                    <HeartCrack className="h-4 w-4 mr-1" />
                    Guild
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/death-tracker/recent"] })}
                  data-testid="button-refresh-deaths"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
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
