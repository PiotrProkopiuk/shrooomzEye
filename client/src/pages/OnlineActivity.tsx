import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Eye, Users, Clock, TrendingUp, Activity } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

interface OnlinePlayer {
  id: number;
  characterName: string;
  level: number;
  vocation: string;
  isTrackedGuild: boolean;
  guildName: string | null;
  lastSeen: string;
}

interface OnlineSession {
  id: number;
  characterName: string;
  sessionStart: string;
  sessionEnd: string | null;
  durationMinutes: number | null;
}

interface OnlineStatus {
  running: boolean;
  lastScrape: string | null;
  lastPlayerCount: number;
}

export default function OnlineActivity() {
  const { data: onlineStatus } = useQuery<OnlineStatus>({
    queryKey: ["/api/online/status"],
    refetchInterval: 30000,
  });

  const { data: onlinePlayers } = useQuery<OnlinePlayer[]>({
    queryKey: ["/api/online/players"],
    refetchInterval: 30000,
  });

  const { data: sessions } = useQuery<OnlineSession[]>({
    queryKey: ["/api/online/sessions?limit=100"],
  });

  const trackedPlayers = onlinePlayers?.filter(p => p.isTrackedGuild) || [];
  const otherPlayers = onlinePlayers?.filter(p => !p.isTrackedGuild) || [];

  const hourlyData = generateHourlyData(sessions || []);
  const peakHoursData = generatePeakHoursData(sessions || []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Online Activity</h1>
          <p className="text-muted-foreground">Real-time monitoring of player activity on Antica</p>
        </div>
        <Badge variant={onlineStatus?.running ? "default" : "destructive"} className="text-sm">
          {onlineStatus?.running ? "Scraper Active" : "Scraper Inactive"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Total Online"
          value={onlineStatus?.lastPlayerCount || 0}
          icon={Users}
          description="Currently online on Antica"
        />
        <StatCard
          title="Tracked Online"
          value={trackedPlayers.length}
          icon={Eye}
          description="Guild members online"
        />
        <StatCard
          title="Last Update"
          value={onlineStatus?.lastScrape ? formatTime(new Date(onlineStatus.lastScrape)) : "N/A"}
          icon={Clock}
          description="Scraper refresh time"
        />
        <StatCard
          title="Sessions Today"
          value={sessions?.filter(s => isToday(new Date(s.sessionStart))).length || 0}
          icon={Activity}
          description="Login sessions recorded"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Online Count Over Time</CardTitle>
            <CardDescription>Players online per hour (last 24h)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#888" 
                    fontSize={11}
                    interval={2}
                    tickFormatter={(value) => value}
                  />
                  <YAxis 
                    stroke="#888" 
                    fontSize={12} 
                    domain={[0, 1050]}
                    tickCount={6}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#d4af37" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Peak Activity Hours</CardTitle>
            <CardDescription>Average sessions by hour of day</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#888" 
                    fontSize={10}
                    interval={2}
                    angle={-45}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="sessions" fill="#d4af37" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Currently Online - Tracked Players ({trackedPlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trackedPlayers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tracked guild members currently online</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Character</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Vocation</TableHead>
                  <TableHead>Guild</TableHead>
                  <TableHead>Last Seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trackedPlayers.slice(0, 20).map((player) => (
                  <TableRow key={player.id} data-testid={`row-player-${player.id}`}>
                    <TableCell className="font-medium">
                      <a 
                        href={`https://www.tibia.com/community/?name=${encodeURIComponent(player.characterName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors"
                      >
                        {player.characterName}
                      </a>
                    </TableCell>
                    <TableCell>{player.level}</TableCell>
                    <TableCell>{player.vocation}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{player.guildName || "Unknown"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {player.lastSeen ? formatTime(new Date(player.lastSeen)) : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
          <CardDescription>Latest login/logout activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Character</TableHead>
                <TableHead>Session Start</TableHead>
                <TableHead>Session End</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions?.slice(0, 15).map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">{session.characterName}</TableCell>
                  <TableCell>{formatDateTime(new Date(session.sessionStart))}</TableCell>
                  <TableCell>
                    {session.sessionEnd 
                      ? formatDateTime(new Date(session.sessionEnd))
                      : <Badge variant="secondary">Active</Badge>
                    }
                  </TableCell>
                  <TableCell>
                    {session.durationMinutes 
                      ? `${Math.floor(session.durationMinutes / 60)}h ${session.durationMinutes % 60}m`
                      : "-"
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, description }: { 
  title: string; 
  value: string | number; 
  icon: any; 
  description: string 
}) {
  return (
    <Card className="bg-card/50 border-border/50">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <h3 className="text-2xl font-bold font-display text-foreground">{value}</h3>
          </div>
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", { 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}

function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function generateHourlyData(sessions: OnlineSession[]): { hour: string; count: number }[] {
  const hours = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 3600000);
    const hourNum = hour.getHours();
    const hourStr = `${hourNum.toString().padStart(2, '0')}:00`;
    const count = sessions.filter(s => {
      const start = new Date(s.sessionStart);
      return start.getHours() === hour.getHours() && 
             start.toDateString() === hour.toDateString();
    }).length;
    hours.push({ hour: hourStr, count });
  }
  return hours;
}

function generatePeakHoursData(sessions: OnlineSession[]): { hour: string; sessions: number }[] {
  const hourCounts: Record<number, number> = {};
  for (let i = 0; i < 24; i++) hourCounts[i] = 0;
  
  sessions.forEach(s => {
    const hour = new Date(s.sessionStart).getHours();
    hourCounts[hour]++;
  });
  
  return Object.entries(hourCounts).map(([hour, count]) => ({
    hour: `${hour.padStart(2, '0')}:00`,
    sessions: count
  }));
}
