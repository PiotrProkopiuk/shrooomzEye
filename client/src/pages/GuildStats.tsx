import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { TrendingUp, TrendingDown, Swords, UserMinus, Activity, Zap, Eye, ShieldAlert } from "lucide-react";

const GAIN_DATA = [
  { name: "Eternal Oblivion", exp: 45000000, levels: 4 },
  { name: "Bubble", exp: 32000000, levels: 2 },
  { name: "Mateusz Wielki", exp: 28000000, levels: 1 },
  { name: "Kharsek", exp: 12000000, levels: 0 },
  { name: "Moonzinn", exp: 8000000, levels: 1 },
];

const ENEMY_STATS = [
  { guild: "Hill", members: 89, active: 42, avgLvl: 450, totalExp: "1.2B" },
  { guild: "Mercenarys", members: 12, active: 8, avgLvl: 380, totalExp: "450M" },
];

const PVP_LOGS = [
  { time: "14:20", victim: "Cachero", guild: "Enemy", killer: "Eternal Oblivion", loc: "Thais", type: "Guild War" },
  { time: "11:05", victim: "Mateusz Wielki", guild: "Dark Alliance", killer: "Hill Member", loc: "Roshamuul", type: "PK" },
  { time: "08:45", victim: "Enemy Mage", guild: "Enemy", killer: "Bubble", loc: "Venore", type: "Guild War" },
];

export default function GuildStats() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Advanced Guild Statistics</h1>
          <p className="text-muted-foreground">Experience tracking, level gains, and PvP impact analysis powered by TibSpy.</p>
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
                  Top Experience Gains (Last 24h)
                </CardTitle>
                <CardDescription>Approximated experience based on TibSpy character snapshots.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={GAIN_DATA}>
                    <defs>
                      <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000000}M`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #2a2e39', borderRadius: '8px' }}
                      itemStyle={{ color: '#eab308' }}
                    />
                    <Area type="monotone" dataKey="exp" stroke="#eab308" fillOpacity={1} fill="url(#colorExp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Level Milestones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {GAIN_DATA.map((player, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{player.name}</p>
                        <p className="text-xs text-muted-foreground">{player.exp.toLocaleString()} EXP gained</p>
                      </div>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                        +{player.levels} Levels
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
              <CardDescription>Aggregate statistics updated nightly via TibSpy cyclic scans.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead>Guild</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Active Today</TableHead>
                    <TableHead>Avg. Level</TableHead>
                    <TableHead className="text-right">Estimated Worth</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ENEMY_STATS.map((enemy, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                      <TableCell className="font-bold text-destructive">{enemy.guild}</TableCell>
                      <TableCell>{enemy.members}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-full max-w-[60px] bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-destructive" style={{ width: `${(enemy.active/enemy.members)*100}%` }}></div>
                          </div>
                          <span className="text-xs">{enemy.active}</span>
                        </div>
                      </TableCell>
                      <TableCell>{enemy.avgLvl}</TableCell>
                      <TableCell className="text-right font-mono">{enemy.totalExp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pvp" className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-5 w-5 text-destructive" />
                Daily PvP Impact Summary
              </CardTitle>
              <CardDescription>Confirmed kills and deaths verified via TibSpy activity logs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-xs text-emerald-500 uppercase font-bold">Kills</p>
                  <p className="text-2xl font-display text-emerald-500">24</p>
                </div>
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                  <p className="text-xs text-destructive uppercase font-bold">Deaths</p>
                  <p className="text-2xl font-display text-destructive">5</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 text-center">
                  <p className="text-xs text-primary uppercase font-bold">KD Ratio</p>
                  <p className="text-2xl font-display text-primary">4.8</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead>Time</TableHead>
                    <TableHead>Victim</TableHead>
                    <TableHead>Killer</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-right">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PVP_LOGS.map((log, i) => (
                    <TableRow key={i} className="border-white/5 hover:bg-white/5">
                      <TableCell className="text-muted-foreground text-xs">{log.time}</TableCell>
                      <TableCell className="font-medium text-destructive">{log.victim} <span className="text-[10px] text-muted-foreground font-normal">({log.guild})</span></TableCell>
                      <TableCell className="font-medium text-emerald-500">{log.killer}</TableCell>
                      <TableCell className="text-xs">{log.loc}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className="text-[10px] border-white/10 uppercase">{log.type}</Badge>
                      </TableCell>
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
