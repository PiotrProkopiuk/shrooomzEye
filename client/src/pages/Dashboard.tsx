import { 
  Users, 
  Swords, 
  Skull, 
  Activity, 
  ShieldAlert,
  CalendarCheck,
  MessageSquare,
  Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Dashboard() {
  const [cmd, setCmd] = useState("");
  const [botOutput, setBotOutput] = useState<any[]>([]);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cmd) return;

    let response = { text: "Unknown command. Try /quest list", type: "error" };
    if (cmd === "/quest list") {
        response = { text: "Upcoming Quests: [1] Soul War (12/15) [2] Heart of Destruction (15/15)", type: "success" };
    } else if (cmd.startsWith("/quest join")) {
        response = { text: "✅ Joined Quest! You've been assigned the @Quest Participant role.", type: "success" };
    } else if (cmd === "/pvp_action") {
        response = { text: "⚔️ PVP ACTION: Moving 14 players from [General] and [Hunt-1] to [WAR ROOM]. 3 users in AFK were excluded.", type: "success" };
    } else if (cmd.startsWith("/scan")) {
        const name = cmd.split(" ")[1] || "Player";
        response = { text: `🔍 TibSpy SCAN: Fetched level 350, Vocation Elite Knight, and online status for ${name}. Character data synced.`, type: "success" };
    } else if (cmd.startsWith("/boss list")) {
        response = { text: "Boss Events: [1] Gaz'haragoth (Today 20:00)", type: "success" };
    }

    setBotOutput([...botOutput, { cmd, response }]);
    setCmd("");
  };

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
        <div className="lg:col-span-2 space-y-6">
          {/* Discord Bot Simulator */}
          <Card className="bg-card/50 border-primary/20 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-2">
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">NEW: Interaction Simulator</Badge>
             </div>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Discord Command Simulator
              </CardTitle>
              <CardDescription>Test how users interact with the bot using slash commands.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="bg-black/40 rounded-lg p-4 h-48 overflow-y-auto mb-4 font-mono text-sm space-y-3 border border-white/5">
                    {botOutput.length === 0 && <div className="text-muted-foreground italic">Type a command like "/quest list" below...</div>}
                    {botOutput.map((item, i) => (
                        <div key={i} className="space-y-1">
                            <div className="text-blue-400 flex items-center gap-2">
                                <span className="text-muted-foreground opacity-50">User:</span> {item.cmd}
                            </div>
                            <div className={`pl-4 flex items-center gap-2 ${item.response.type === 'error' ? 'text-destructive' : 'text-emerald-400'}`}>
                                <BotIcon className="h-3 w-3" /> {item.response.text}
                            </div>
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSimulate} className="flex gap-2">
                    <Input 
                        value={cmd} 
                        onChange={e => setCmd(e.target.value)}
                        placeholder="/quest join 1" 
                        className="bg-background/50 border-white/10 font-mono"
                    />
                    <Button type="submit" size="icon">
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </CardContent>
          </Card>

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
        </div>

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
        </div>
      </div>
    </div>
  );
}

function BotIcon({ className }: { className?: string }) {
    return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>;
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
