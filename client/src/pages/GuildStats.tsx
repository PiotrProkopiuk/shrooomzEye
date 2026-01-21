import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { TrendingUp, Activity, Zap, Eye, ShieldAlert, Swords } from "lucide-react";
import { ANTICA_DATA } from "@/lib/mockData";

export default function GuildStats() {
  const guildData = ANTICA_DATA.mainGuild;
  const enemyData = ANTICA_DATA.enemyGuild;
  const pvpLogs = ANTICA_DATA.pvpLogs;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Advanced Guild Statistics</h1>
          <p className="text-muted-foreground">Performance analytics for {guildData.name} on Antica.</p>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border border-primary/20">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">TibSpy API: Active</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-lg border border-white/5">
                <Activity className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">Next cyclic scan: 03:00 CET</span>
            </div>
        </div>
      </div>

      <Tabs defaultValue="experience" className="space-y-6">
        <TabsList className="bg-card/50 border border-white/5">
          <TabsTrigger value="experience">Experience & Levels</TabsTrigger>
          <TabsTrigger value="enemies">Enemy Analytics</TabsTrigger>
          <TabsTrigger value="pvp">PvP Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="experience" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-500" />
                  Experience Trends (Last 7 Days)
                </CardTitle>
                <CardDescription>Daily kill totals and experience snapshot trends.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={pvpLogs}>
                    <defs>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #2a2e39', borderRadius: '8px' }}
                      itemStyle={{ color: '#eab308' }}
                    />
                    <Area type="monotone" dataKey="codexKills" stroke="#eab308" fillOpacity={1} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {guildData.members.slice(0, 5).map((player, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.expGained} gained</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        +{player.levelsGained} Lvl
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="enemies" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Enemy Guild Intelligence
              </CardTitle>
              <CardDescription>Aggregate statistics for {enemyData.name} updated via TibSpy.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-background/50 border border-white/5 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Avg Level</p>
                    <p className="text-2xl font-display text-foreground">{enemyData.stats.avgLevel}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-white/5 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Common Voc</p>
                    <p className="text-sm font-display text-primary mt-1">{enemyData.stats.commonVocation}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-white/5 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Online</p>
                    <p className="text-2xl font-display text-emerald-500">{enemyData.stats.membersOnline}</p>
                </div>
                <div className="p-4 rounded-lg bg-background/50 border border-white/5 text-center">
                    <p className="text-xs text-muted-foreground uppercase font-bold">Total Exp</p>
                    <p className="text-2xl font-display text-foreground">{enemyData.totalExp}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pvp" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-destructive" />
                PVP History vs {enemyData.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>{guildData.name} Kills</TableHead>
                    <TableHead>{enemyData.name} Kills</TableHead>
                    <TableHead className="text-right">Total Deaths</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pvpLogs.map((log, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-muted-foreground text-xs">{log.date}</TableCell>
                      <TableCell className="font-medium text-emerald-500">{log.codexKills}</TableCell>
                      <TableCell className="font-medium text-destructive">{log.enemyKills}</TableCell>
                      <TableCell className="text-right font-mono">{log.totalDeaths}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
