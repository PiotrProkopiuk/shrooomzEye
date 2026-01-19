import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  History, 
  Shield, 
  User, 
  Calendar, 
  AlertTriangle,
  Bot
} from "lucide-react";

const LOGS = [
  { id: 1, type: "guild", msg: "Guild 'Red Rose' status changed to Ally", user: "Admin", time: "5 mins ago", color: "text-emerald-500" },
  { id: 2, type: "player", msg: "Player 'Bubble' reached Level 251", user: "System", time: "12 mins ago", color: "text-primary" },
  { id: 3, type: "event", msg: "Soul War Service signup closed (Max Participants)", user: "System", time: "25 mins ago", color: "text-orange-500" },
  { id: 4, type: "bot", msg: "Automated Daily Report generated & sent to Discord", user: "Bot", time: "1 hour ago", color: "text-blue-400" },
  { id: 5, type: "death", msg: "Enemy Player 'Cachero' died (Frag recorded)", user: "System", time: "3 hours ago", color: "text-destructive" },
  { id: 6, type: "settings", msg: "PVP Alert role changed to @WarTeam", user: "Admin", time: "5 hours ago", color: "text-muted-foreground" },
];

export default function ActivityHistory() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Activity History</h1>
          <p className="text-muted-foreground">Audit log of all guild, bot, and player events.</p>
        </div>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Filter audit logs..." className="pl-10 bg-background/50 border-white/10" />
            </div>
            <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer hover:bg-white/5">Guilds</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-white/5">Players</Badge>
                <Badge variant="outline" className="cursor-pointer hover:bg-white/5">Bot</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-white/5">
            {LOGS.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-background border border-white/10 flex items-center justify-center">
                    {log.type === 'guild' && <Shield className="h-5 w-5 text-emerald-500" />}
                    {log.type === 'player' && <User className="h-5 w-5 text-primary" />}
                    {log.type === 'event' && <Calendar className="h-5 w-5 text-orange-500" />}
                    {log.type === 'bot' && <Bot className="h-5 w-5 text-blue-400" />}
                    {log.type === 'death' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                    {log.type === 'settings' && <History className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${log.color}`}>{log.msg}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">User: {log.user}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{log.time}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
