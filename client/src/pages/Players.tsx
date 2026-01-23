import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RefreshCw, Eye, Users, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, RotateCcw, TrendingUp } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Player, type Guild } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type SortField = "name" | "rank" | "vocation" | "level" | "online" | "levelsGained";
type SortDirection = "asc" | "desc";

export default function Players() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGuildId, setSelectedGuildId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>("level");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  
  const { data: guilds } = useQuery<Guild[]>({ queryKey: ["/api/guilds"] });
  
  useEffect(() => {
    if (guilds?.length && !selectedGuildId) {
      const mainGuild = guilds.find(g => !g.isEnemy);
      if (mainGuild) setSelectedGuildId(mainGuild.id);
    }
  }, [guilds, selectedGuildId]);

  const selectedGuild = guilds?.find(g => g.id === selectedGuildId);
  
  const { data: players, isLoading } = useQuery<Player[]>({ 
    queryKey: [`/api/players?guildId=${selectedGuildId}`],
    enabled: !!selectedGuildId
  });

  const scanAllMutation = useMutation({
    mutationFn: async (guildId: number) => {
      return apiRequest("POST", `/api/guilds/${guildId}/scan-members`, {});
    },
    onSuccess: async (response) => {
      const results = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/players?guildId=${selectedGuildId}`] });
      toast({
        title: "Scan Complete",
        description: `Found ${results.total} members. Created ${results.created}, updated ${results.updated}.`,
      });
    },
    onError: () => {
      toast({
        title: "Scan Failed",
        description: "Could not fetch guild members from TibiaData.",
        variant: "destructive",
      });
    }
  });

  const resetTrackingMutation = useMutation({
    mutationFn: async (guildId: number) => {
      return apiRequest("POST", `/api/guilds/${guildId}/reset-tracking`, {});
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: [`/api/players?guildId=${selectedGuildId}`] });
      toast({
        title: "Tracking Reset",
        description: "Level tracking has been reset. Current levels are now the baseline.",
      });
    },
    onError: () => {
      toast({
        title: "Reset Failed",
        description: "Could not reset level tracking.",
        variant: "destructive",
      });
    }
  });

  const handleScanAll = () => {
    if (!selectedGuildId || !selectedGuild) {
      toast({ title: "No Guild", description: "Please select a guild first.", variant: "destructive" });
      return;
    }
    toast({ title: "Scanning...", description: `Fetching all members for ${selectedGuild.name} from TibiaData...` });
    scanAllMutation.mutate(selectedGuildId);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection(field === "level" ? "desc" : "asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4 ml-1 opacity-30" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="h-4 w-4 ml-1 text-primary" /> 
      : <ArrowDown className="h-4 w-4 ml-1 text-primary" />;
  };

  const getTibiaLink = (name: string) => {
    return `https://www.tibia.com/community/?name=${encodeURIComponent(name)}`;
  };

  const sortedAndFilteredPlayers = useMemo(() => {
    let result = players?.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.vocation?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "rank":
          comparison = (a.rank || "Member").localeCompare(b.rank || "Member");
          break;
        case "vocation":
          comparison = (a.vocation || "").localeCompare(b.vocation || "");
          break;
        case "level":
          comparison = (a.level || 0) - (b.level || 0);
          break;
        case "online":
          comparison = (a.online ? 1 : 0) - (b.online ? 1 : 0);
          break;
        case "levelsGained":
          comparison = (a.levelsGained || 0) - (b.levelsGained || 0);
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [players, searchTerm, sortField, sortDirection]);

  const onlineCount = players?.filter(p => p.online).length || 0;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Player Roster</h1>
          <p className="text-muted-foreground">Monitor guild members via TibiaData API.</p>
        </div>
        <div className="flex gap-2">
            <Select value={selectedGuildId?.toString() || ""} onValueChange={v => setSelectedGuildId(parseInt(v))}>
              <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
                <SelectValue placeholder="Select guild..." />
              </SelectTrigger>
              <SelectContent>
                {guilds?.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    {g.name} {g.isEnemy ? "(Enemy)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              className="gap-2" 
              onClick={handleScanAll}
              disabled={scanAllMutation.isPending || !selectedGuildId}
              data-testid="button-scan-all"
            >
                <RefreshCw className={`h-4 w-4 ${scanAllMutation.isPending ? 'animate-spin' : ''}`} />
                {scanAllMutation.isPending ? "Scanning..." : "Scan All Members"}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
            <Card className="bg-card/50 border-border/50 sticky top-24">
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Guild Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Members</span>
                        <span className="font-mono">{players?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Online Now</span>
                        <span className="font-mono text-emerald-500">{onlineCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Lvl Gained</span>
                        <span className="font-mono text-emerald-500">
                          +{players?.reduce((sum, p) => sum + (p.levelsGained || 0), 0) || 0}
                        </span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Players Leveled</span>
                        <span className="font-mono">
                          {players?.filter(p => (p.levelsGained || 0) > 0).length || 0}
                        </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 text-xs"
                      onClick={() => selectedGuildId && resetTrackingMutation.mutate(selectedGuildId)}
                      disabled={resetTrackingMutation.isPending || !selectedGuildId}
                      data-testid="button-reset-tracking"
                    >
                      <RotateCcw className={`h-3 w-3 mr-1 ${resetTrackingMutation.isPending ? 'animate-spin' : ''}`} />
                      Reset Level Tracking
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20 border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                        <Eye className="h-3 w-3 text-primary" />
                        TibiaData Integration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                        Click "Scan All Members" to fetch the latest data for all guild members from the official TibiaData API.
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                        API Connected
                    </Badge>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-3">
             <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                     <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Search player by name or vocation..." 
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          className="pl-9 bg-background/50 border-white/10" 
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">Loading players...</div>
                    ) : sortedAndFilteredPlayers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No players yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Click "Scan All Members" to import guild members</p>
                      </div>
                    ) : (
                      <Table>
                          <TableHeader>
                          <TableRow className="border-white/5 hover:bg-transparent">
                              <TableHead 
                                className="cursor-pointer select-none hover:text-foreground transition-colors"
                                onClick={() => handleSort("name")}
                              >
                                <div className="flex items-center">
                                  Name {getSortIcon("name")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:text-foreground transition-colors"
                                onClick={() => handleSort("rank")}
                              >
                                <div className="flex items-center">
                                  Rank {getSortIcon("rank")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:text-foreground transition-colors"
                                onClick={() => handleSort("vocation")}
                              >
                                <div className="flex items-center">
                                  Vocation {getSortIcon("vocation")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:text-foreground transition-colors"
                                onClick={() => handleSort("level")}
                              >
                                <div className="flex items-center">
                                  Level {getSortIcon("level")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="cursor-pointer select-none hover:text-foreground transition-colors"
                                onClick={() => handleSort("levelsGained")}
                              >
                                <div className="flex items-center">
                                  <TrendingUp className="h-4 w-4 mr-1" />
                                  Gained {getSortIcon("levelsGained")}
                                </div>
                              </TableHead>
                              <TableHead 
                                className="text-right cursor-pointer select-none hover:text-foreground transition-colors"
                                onClick={() => handleSort("online")}
                              >
                                <div className="flex items-center justify-end">
                                  Status {getSortIcon("online")}
                                </div>
                              </TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                          {sortedAndFilteredPlayers.map((p, i) => (
                              <TableRow key={i} className="border-white/5 hover:bg-white/5 group" data-testid={`row-player-${p.id}`}>
                                  <TableCell className="font-medium">
                                      <div className="flex flex-col">
                                          <a 
                                            href={getTibiaLink(p.name)} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-primary hover:text-accent hover:underline transition-colors flex items-center gap-1"
                                            data-testid={`link-player-${p.id}`}
                                          >
                                            {p.name}
                                            <ExternalLink className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                                          </a>
                                          <span className="text-[10px] text-muted-foreground">{selectedGuild?.name}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{p.rank || "Member"}</TableCell>
                                  <TableCell className="text-muted-foreground">{p.vocation}</TableCell>
                                  <TableCell className="font-mono">
                                      {p.level}
                                  </TableCell>
                                  <TableCell className="font-mono">
                                      {(p.levelsGained || 0) > 0 ? (
                                        <span className="text-emerald-500 font-bold">+{p.levelsGained}</span>
                                      ) : (
                                        <span className="text-muted-foreground">-</span>
                                      )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                      <Badge variant="outline" className={`border-0 ${p.online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                                          {p.online ? 'Online' : 'Offline'}
                                      </Badge>
                                  </TableCell>
                              </TableRow>
                          ))}
                          </TableBody>
                      </Table>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
