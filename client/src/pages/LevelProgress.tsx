import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Award, Users, Target } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { type Player, type Guild } from "@shared/schema";

export default function LevelProgress() {
  const { data: players } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: guilds } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });

  const mainGuild = guilds?.find(g => !g.isEnemy);
  const enemyGuild = guilds?.find(g => g.isEnemy);

  const mainGuildPlayers = players?.filter(p => {
    const guild = guilds?.find(g => g.id === p.guildId);
    return guild && !guild.isEnemy;
  }) || [];

  const enemyGuildPlayers = players?.filter(p => {
    const guild = guilds?.find(g => g.id === p.guildId);
    return guild && guild.isEnemy;
  }) || [];

  const totalMainLevels = mainGuildPlayers.reduce((sum, p) => sum + (p.levelsGained || 0), 0);
  const totalEnemyLevels = enemyGuildPlayers.reduce((sum, p) => sum + (p.levelsGained || 0), 0);

  const topGainers = [...(players || [])]
    .filter(p => (p.levelsGained || 0) > 0)
    .sort((a, b) => (b.levelsGained || 0) - (a.levelsGained || 0))
    .slice(0, 10);

  const avgMainLevel = mainGuildPlayers.length > 0
    ? Math.round(mainGuildPlayers.reduce((sum, p) => sum + p.level, 0) / mainGuildPlayers.length)
    : 0;

  const avgEnemyLevel = enemyGuildPlayers.length > 0
    ? Math.round(enemyGuildPlayers.reduce((sum, p) => sum + p.level, 0) / enemyGuildPlayers.length)
    : 0;

  const progressData = generateProgressData(players || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Level Progress</h1>
        <p className="text-muted-foreground">Track level gains across tracked guilds</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Guild Levels Gained"
          value={totalMainLevels}
          icon={TrendingUp}
          color="text-primary"
          subtitle={mainGuild?.name}
        />
        <StatCard
          title="Enemy Levels Gained"
          value={totalEnemyLevels}
          icon={Target}
          color="text-orange-500"
          subtitle={enemyGuild?.name}
        />
        <StatCard
          title="Avg Guild Level"
          value={avgMainLevel}
          icon={Users}
          color="text-emerald-500"
        />
        <StatCard
          title="Avg Enemy Level"
          value={avgEnemyLevel}
          icon={Users}
          color="text-destructive"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Level Distribution</CardTitle>
            <CardDescription>Players by level range</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={progressData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="range" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="main" name="Guild" stroke="#d4af37" strokeWidth={2} />
                  <Line type="monotone" dataKey="enemy" name="Enemy" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Level Gainers
            </CardTitle>
            <CardDescription>Highest level gains since tracking started</CardDescription>
          </CardHeader>
          <CardContent>
            {topGainers.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No level gains recorded yet</p>
            ) : (
              <div className="space-y-3">
                {topGainers.map((player, index) => {
                  const guild = guilds?.find(g => g.id === player.guildId);
                  return (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-bold text-lg ${index < 3 ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                          #{index + 1}
                        </span>
                        <div>
                          <a 
                            href={`https://www.tibia.com/community/?name=${encodeURIComponent(player.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium hover:text-primary transition-colors"
                          >
                            {player.name}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            Level {player.level} {player.vocation}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-500">+{player.levelsGained}</span>
                        <Badge 
                          variant={guild?.isEnemy ? "destructive" : "default"} 
                          className="ml-2 text-xs"
                        >
                          {guild?.isEnemy ? "Enemy" : "Guild"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>All Tracked Players - Level Progress</CardTitle>
          <CardDescription>Complete list with level tracking data</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Character</TableHead>
                <TableHead>Guild</TableHead>
                <TableHead>Vocation</TableHead>
                <TableHead>Current Level</TableHead>
                <TableHead>Start Level</TableHead>
                <TableHead>Levels Gained</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players?.slice(0, 20).map((player) => {
                const guild = guilds?.find(g => g.id === player.guildId);
                return (
                  <TableRow key={player.id} data-testid={`row-player-${player.id}`}>
                    <TableCell className="font-medium">
                      <a 
                        href={`https://www.tibia.com/community/?name=${encodeURIComponent(player.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {player.name}
                      </a>
                    </TableCell>
                    <TableCell>
                      <Badge variant={guild?.isEnemy ? "destructive" : "default"}>
                        {guild?.name || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>{player.vocation}</TableCell>
                    <TableCell>{player.level}</TableCell>
                    <TableCell className="text-muted-foreground">{player.startLevel || player.level}</TableCell>
                    <TableCell>
                      <span className={`font-bold ${(player.levelsGained || 0) > 0 ? 'text-emerald-500' : 'text-muted-foreground'}`}>
                        {(player.levelsGained || 0) > 0 ? `+${player.levelsGained}` : '0'}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
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
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold font-display text-foreground">{value}</h3>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg bg-background/50 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function generateProgressData(players: Player[]): { range: string; main: number; enemy: number }[] {
  const ranges = [
    { min: 1, max: 100, label: "1-100" },
    { min: 101, max: 200, label: "101-200" },
    { min: 201, max: 300, label: "201-300" },
    { min: 301, max: 400, label: "301-400" },
    { min: 401, max: 500, label: "401-500" },
    { min: 501, max: 1000, label: "501+" },
  ];

  return ranges.map(range => ({
    range: range.label,
    main: players.filter(p => p.level >= range.min && p.level <= range.max && p.guildType !== "enemy").length,
    enemy: players.filter(p => p.level >= range.min && p.level <= range.max && p.guildType === "enemy").length,
  }));
}
