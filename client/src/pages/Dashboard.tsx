import { 
  Users, 
  Swords, 
  Skull, 
  Activity, 
  ShieldAlert,
  CalendarCheck
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Tracked Guilds" 
          value="3" 
          icon={ShieldAlert}
          trend="+1 this week"
          color="text-primary"
        />
        <StatsCard 
          title="Online Players" 
          value="142" 
          icon={Users}
          trend="85% activity"
          color="text-emerald-500"
        />
        <StatsCard 
          title="Recent Deaths" 
          value="12" 
          icon={Skull}
          trend="-2 vs yesterday"
          color="text-destructive"
        />
        <StatsCard 
          title="Active Events" 
          value="2" 
          icon={CalendarCheck}
          trend="Next: Soul War"
          color="text-blue-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Live Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { time: "2 mins ago", msg: "Player 'Eternal Oblivion' logged in.", type: "login" },
                  { time: "15 mins ago", msg: "War Event: Battle for Thais started.", type: "event" },
                  { time: "23 mins ago", msg: "Player 'Bubble' died at level 250 by Dragon Lord.", type: "death" },
                  { time: "1 hour ago", msg: "New Guild Ally added: 'Red Rose'.", type: "system" },
                ].map((log, i) => (
                  <div key={i} className="flex gap-4 items-start pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <span className="text-xs text-muted-foreground whitespace-nowrap mt-1 min-w-[80px]">{log.time}</span>
                    <div className="flex-1">
                      <p className={`text-sm ${log.type === 'death' ? 'text-destructive' : 'text-foreground'}`}>
                        {log.msg}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
           <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle>Top Online Levels</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead>Name</TableHead>
                            <TableHead>Vocation</TableHead>
                            <TableHead className="text-right">Level</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[
                            { name: "Kharsek", voc: "Elite Knight", lvl: 1200 },
                            { name: "Moonzinn", voc: "Master Sorcerer", lvl: 1150 },
                            { name: "Dev Onica", voc: "Elder Druid", lvl: 1120 },
                            { name: "Bobeek", voc: "Elder Druid", lvl: 2200 },
                        ].map((p, i) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5">
                                <TableCell className="font-medium text-primary">{p.name}</TableCell>
                                <TableCell className="text-muted-foreground">{p.voc}</TableCell>
                                <TableCell className="text-right font-mono">{p.lvl}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6">
          <Card className="bg-secondary/30 border-primary/20">
            <CardHeader>
              <CardTitle className="text-base">Upcoming Bosses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { name: "Gaz'haragoth", time: "14:00 Today", status: "Confirmed" },
                { name: "Ferumbras", time: "20:00 Tomorrow", status: "Predicted" },
              ].map((boss, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded bg-background/50 border border-white/5">
                  <div>
                    <div className="font-medium text-foreground">{boss.name}</div>
                    <div className="text-xs text-muted-foreground">{boss.time}</div>
                  </div>
                  <Badge variant={boss.status === "Confirmed" ? "destructive" : "secondary"}>
                    {boss.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="bg-card/50 border-border/50">
             <CardHeader>
              <CardTitle className="text-base">System Load</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">API Requests</span>
                            <span>85%</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-[85%]"></div>
                        </div>
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Discord Gateway</span>
                            <span>Stable</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 w-[98%]"></div>
                        </div>
                    </div>
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, trend, color }: any) {
  return (
    <Card className="bg-card/50 border-border/50 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold font-display tracking-tight text-foreground">{value}</h3>
          </div>
          <div className={`p-2 rounded-lg bg-background/50 border border-white/5 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {trend}
        </p>
      </CardContent>
    </Card>
  );
}
