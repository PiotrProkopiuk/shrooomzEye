import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
} from "recharts";
import { Trophy, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { type Guild, type Player } from "@shared/schema";

export default function Leaderboards() {
  const { data: guilds } = useQuery<Guild[]>({ queryKey: ["/api/guilds"] });
  const mainGuild = guilds?.find(g => !g.isEnemy);

  const { data: players } = useQuery<Player[]>({ 
    queryKey: [`/api/players?guildId=${mainGuild?.id}`],
    enabled: !!mainGuild?.id
  });

  const levelData = players?.slice(0, 5).map(p => ({ name: p.name, level: p.level })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Guild Leaderboards</h1>
          <p className="text-muted-foreground">Rankings for {mainGuild?.name || 'your guild'}.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-4 w-4 text-primary" />
              Highest Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #2a2e39' }}
                  itemStyle={{ color: '#eab308' }}
                />
                <Bar dataKey="level" fill="#eab308" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-emerald-500" />
              Top Level Gainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead>Rank</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead className="text-right">Gained</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players?.slice(0, 10).map((p, i) => (
                  <TableRow key={i} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-mono text-muted-foreground">#{i + 1}</TableCell>
                    <TableCell className="font-medium text-primary">{p.name}</TableCell>
                    <TableCell>{p.level}</TableCell>
                    <TableCell className="text-right text-emerald-500">+{p.levelsGained || 0}</TableCell>
                  </TableRow>
                ))}
                {(!players || players.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No players yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
