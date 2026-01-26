import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skull, Swords, Shield, TrendingDown, Filter } from "lucide-react";
import { type Death, type Guild } from "@shared/schema";

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

export default function DeathsDashboard() {
  const [pvpOnly, setPvpOnly] = useState(false);
  const [page, setPage] = useState(1);

  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: "20",
    ...(pvpOnly && { isPvp: "true" })
  });

  const { data: deathsData, isLoading } = useQuery<DeathsResponse>({
    queryKey: [`/api/death-tracker/recent?${queryParams.toString()}`],
  });

  const { data: deathStats } = useQuery<DeathStats>({
    queryKey: ["/api/death-tracker/stats"],
  });

  const { data: guilds } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });

  const mainGuild = guilds?.find(g => !g.isEnemy);
  const enemyGuild = guilds?.find(g => g.isEnemy);

  const deaths = deathsData?.deaths || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Deaths & PvP Dashboard</h1>
          <p className="text-muted-foreground">Track deaths and PvP activity across guilds</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Deaths"
          value={deathStats?.total || 0}
          icon={Skull}
          color="text-muted-foreground"
        />
        <StatCard
          title="Guild Deaths"
          value={deathStats?.mainGuildDeaths || 0}
          icon={Shield}
          color="text-destructive"
          subtitle={mainGuild?.name}
        />
        <StatCard
          title="Enemy Deaths"
          value={deathStats?.enemyGuildDeaths || 0}
          icon={Swords}
          color="text-emerald-500"
          subtitle={enemyGuild?.name}
        />
        <StatCard
          title="PvP Deaths"
          value={deathStats?.pvpDeaths || 0}
          icon={Swords}
          color="text-orange-500"
        />
        <StatCard
          title="PvE Deaths"
          value={deathStats?.pveDeaths || 0}
          icon={TrendingDown}
          color="text-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/50 border-border/50">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Recent Deaths</CardTitle>
                <CardDescription>Last recorded deaths (Page {page}/{deathsData?.totalPages || 1})</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">PvP Only</span>
                  <Switch 
                    checked={pvpOnly} 
                    onCheckedChange={(checked) => {
                      setPvpOnly(checked);
                      setPage(1);
                    }}
                    data-testid="switch-pvp-filter"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading deaths...</p>
            ) : deaths.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deaths recorded yet</p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Victim</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead>Killed By</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Guild</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deaths.map((death) => (
                      <TableRow key={death.id} data-testid={`row-death-${death.id}`}>
                        <TableCell className="text-muted-foreground text-sm">
                          {death.occurredAt ? formatDateTime(new Date(death.occurredAt)) : "Unknown"}
                        </TableCell>
                        <TableCell className="font-medium">
                          <a 
                            href={`https://www.tibia.com/community/?name=${encodeURIComponent(death.characterName)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-primary transition-colors"
                          >
                            {death.characterName}
                          </a>
                        </TableCell>
                        <TableCell>{death.level}</TableCell>
                        <TableCell>
                          {death.killerName}
                          {death.killerGuild && (
                            <span className="text-muted-foreground text-xs ml-1">({death.killerGuild})</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={death.isPvp ? "destructive" : "secondary"}>
                            {death.isPvp ? "PvP" : "PvE"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={death.victimGuildType === "main" ? "default" : "outline"}>
                            {death.victimGuildType || "Unknown"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {deaths.length} of {deathsData?.total || 0} deaths
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setPage(p => p + 1)}
                      disabled={page >= (deathsData?.totalPages || 1)}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>PvP Summary</CardTitle>
            <CardDescription>Guild vs Enemy statistics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-background/50 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-primary">{mainGuild?.name || "Main Guild"}</span>
                <span className="text-2xl font-bold text-destructive">{deathStats?.mainGuildDeaths || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Deaths suffered</p>
            </div>

            <div className="text-center text-muted-foreground font-bold">VS</div>

            <div className="p-4 rounded-lg bg-background/50 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-orange-500">{enemyGuild?.name || "Enemy Guild"}</span>
                <span className="text-2xl font-bold text-emerald-500">{deathStats?.enemyGuildDeaths || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Deaths suffered</p>
            </div>

            <div className="pt-4 border-t border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">PvP Deaths</span>
                <span className="font-bold">{deathStats?.pvpDeaths || 0}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">PvE Deaths</span>
                <span className="font-bold">{deathStats?.pveDeaths || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, subtitle }: { 
  title: string; 
  value: number; 
  icon: any; 
  color: string;
  subtitle?: string;
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-xl font-bold font-display text-foreground">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-background/50 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", { 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}
