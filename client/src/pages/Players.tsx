import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RefreshCw, Eye, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Player, type Guild } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Players() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  
  const { data: guilds } = useQuery<Guild[]>({ queryKey: ["/api/guilds"] });
  const mainGuild = guilds?.find(g => !g.isEnemy);
  
  const { data: players, isLoading } = useQuery<Player[]>({ 
    queryKey: [`/api/players?guildId=${mainGuild?.id}`],
    enabled: !!mainGuild?.id
  });

  const scanAllMutation = useMutation({
    mutationFn: async (guildId: number) => {
      return apiRequest("POST", `/api/guilds/${guildId}/scan-members`, {});
    },
    onSuccess: async (response) => {
      const results = await response.json();
      queryClient.invalidateQueries({ queryKey: [`/api/players?guildId=${mainGuild?.id}`] });
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

  const handleScanAll = () => {
    if (!mainGuild?.id) {
      toast({ title: "No Guild", description: "Please add a guild first.", variant: "destructive" });
      return;
    }
    toast({ title: "Scanning...", description: `Fetching all members for ${mainGuild.name} from TibiaData...` });
    scanAllMutation.mutate(mainGuild.id);
  };

  const filteredPlayers = players?.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.vocation?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onlineCount = players?.filter(p => p.online).length || 0;

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Player Roster</h1>
          <p className="text-muted-foreground">Monitor {mainGuild?.name || 'guild'} members via TibiaData API.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary">
                <Filter className="h-4 w-4" />
                Filter
            </Button>
            <Button 
              className="gap-2" 
              onClick={handleScanAll}
              disabled={scanAllMutation.isPending || !mainGuild}
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
                    ) : filteredPlayers.length === 0 ? (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-muted-foreground">No players yet</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">Click "Scan All Members" to import guild members</p>
                      </div>
                    ) : (
                      <Table>
                          <TableHeader>
                          <TableRow className="border-white/5 hover:bg-transparent">
                              <TableHead>Name</TableHead>
                              <TableHead>Rank</TableHead>
                              <TableHead>Vocation</TableHead>
                              <TableHead>Level</TableHead>
                              <TableHead className="text-right">Status</TableHead>
                          </TableRow>
                          </TableHeader>
                          <TableBody>
                          {filteredPlayers.map((p, i) => (
                              <TableRow key={i} className="border-white/5 hover:bg-white/5 group cursor-pointer" data-testid={`row-player-${p.id}`}>
                                  <TableCell className="font-medium text-primary group-hover:text-accent transition-colors">
                                      <div className="flex flex-col">
                                          <span>{p.name}</span>
                                          <span className="text-[10px] text-muted-foreground">{mainGuild?.name}</span>
                                      </div>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">{p.rank || "Member"}</TableCell>
                                  <TableCell className="text-muted-foreground">{p.vocation}</TableCell>
                                  <TableCell className="font-mono">
                                      {p.level} 
                                      {p.levelsGained && p.levelsGained > 0 && <span className="text-emerald-500 text-xs ml-1">+{p.levelsGained}</span>}
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
