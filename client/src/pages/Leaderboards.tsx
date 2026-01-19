import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from "recharts";
import { Trophy, Clock, Skull, Swords } from "lucide-react";

const LEVEL_DATA = [
  { name: "Kharsek", level: 1200 },
  { name: "Bobeek", level: 2200 },
  { name: "Goraca", level: 2150 },
  { name: "Moonzinn", level: 1150 },
  { name: "Dev Onica", level: 1120 },
];

const ACTIVITY_DATA = [
  { day: "Mon", hours: 120 },
  { day: "Tue", hours: 150 },
  { day: "Wed", hours: 180 },
  { day: "Thu", hours: 140 },
  { day: "Fri", hours: 210 },
  { day: "Sat", hours: 300 },
  { day: "Sun", hours: 280 },
];

export default function Leaderboards() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Global Leaderboards</h1>
          <p className="text-muted-foreground">Rankings across all tracked guilds and servers.</p>
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
              <BarChart data={LEVEL_DATA}>
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
              Total Online Time (Combined Guilds)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ACTIVITY_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2e39" />
                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1d24', border: '1px solid #2a2e39' }}
                />
                <Line type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Top PvP Performers (Weekly)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Guild</TableHead>
                <TableHead>Kills</TableHead>
                <TableHead>Deaths</TableHead>
                <TableHead className="text-right">K/D Ratio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { rank: 1, name: "Eternal Oblivion", guild: "Dark Alliance", kills: 45, deaths: 2, kd: "22.5" },
                { rank: 2, name: "Mateusz Dragon Wielki", guild: "Dark Alliance", kills: 38, deaths: 4, kd: "9.5" },
                { rank: 3, name: "Cachero", guild: "Enemy", kills: 35, deaths: 15, kd: "2.3" },
                { rank: 4, name: "Bubble", guild: "Red Rose", kills: 30, deaths: 8, kd: "3.75" },
              ].map((p, i) => (
                <TableRow key={i} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-mono text-muted-foreground">#{p.rank}</TableCell>
                  <TableCell className="font-medium text-primary">{p.name}</TableCell>
                  <TableCell>{p.guild}</TableCell>
                  <TableCell className="text-emerald-500">+{p.kills}</TableCell>
                  <TableCell className="text-destructive">-{p.deaths}</TableCell>
                  <TableCell className="text-right font-mono">{p.kd}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
