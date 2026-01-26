import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Skull, Clock, TrendingUp, Calendar, ExternalLink } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { type Player, type Death, type Guild } from "@shared/schema";

interface OnlineSession {
  id: number;
  characterName: string;
  sessionStart: string;
  sessionEnd: string | null;
  durationMinutes: number | null;
}

export default function CharacterProfile() {
  const [, params] = useRoute("/character/:name");
  const characterName = params?.name ? decodeURIComponent(params.name) : "";

  const { data: players } = useQuery<Player[]>({
    queryKey: ["/api/players"],
  });

  const { data: guilds } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });

  const { data: deathsData } = useQuery<{ deaths: Death[] }>({
    queryKey: ["/api/death-tracker/recent?pageSize=100"],
  });

  const { data: sessions } = useQuery<OnlineSession[]>({
    queryKey: [`/api/online/sessions?character=${encodeURIComponent(characterName)}&limit=50`],
    enabled: !!characterName,
  });

  const player = players?.find(p => p.name.toLowerCase() === characterName.toLowerCase());
  const guild = player?.guildId ? guilds?.find(g => g.id === player.guildId) : null;
  const characterDeaths = deathsData?.deaths?.filter(d => 
    d.characterName.toLowerCase() === characterName.toLowerCase()
  ) || [];

  const characterKills = deathsData?.deaths?.filter(d => 
    d.killerName?.toLowerCase() === characterName.toLowerCase() && d.isPvp
  ) || [];

  const pvpDeaths = characterDeaths.filter(d => d.isPvp);
  const pveDeaths = characterDeaths.filter(d => !d.isPvp);

  const sessionData = sessions?.map(s => ({
    date: new Date(s.sessionStart).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    duration: s.durationMinutes || 0
  })).reverse() || [];

  if (!characterName) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No character specified</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
            <User className="h-6 w-6 text-primary" />
            {characterName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {player ? (
              <>Level {player.level} {player.vocation}</>
            ) : (
              "Character not tracked"
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a 
            href={`https://www.tibia.com/community/?name=${encodeURIComponent(characterName)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View on Tibia.com
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Current Level"
          value={player?.level || "?"}
          icon={TrendingUp}
          description={player?.levelsGained ? `+${player.levelsGained} gained` : "Not tracked"}
        />
        <StatCard
          title="Total Deaths"
          value={characterDeaths.length}
          icon={Skull}
          description={`${pvpDeaths.length} PvP, ${pveDeaths.length} PvE`}
        />
        <StatCard
          title="PvP Kills"
          value={characterKills.length}
          icon={Skull}
          description="As recorded killer"
        />
        <StatCard
          title="Sessions"
          value={sessions?.length || 0}
          icon={Clock}
          description="Recorded login sessions"
        />
      </div>

      {player && guild && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Guild Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Badge variant={guild.isEnemy ? "destructive" : "default"} className="text-sm">
                {guild.isEnemy ? "Enemy Guild" : "Main Guild"}
              </Badge>
              <span className="font-medium">{guild.name}</span>
              {player.rank && <span className="text-muted-foreground">- {player.rank}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle>Session History</CardTitle>
            <CardDescription>Play time per session (minutes)</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionData.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No sessions recorded</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sessionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis dataKey="date" stroke="#888" fontSize={12} />
                    <YAxis stroke="#888" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333' }}
                      labelStyle={{ color: '#fff' }}
                    />
                    <Line type="monotone" dataKey="duration" stroke="#d4af37" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skull className="h-5 w-5 text-destructive" />
              Death History
            </CardTitle>
            <CardDescription>Recent deaths for this character</CardDescription>
          </CardHeader>
          <CardContent>
            {characterDeaths.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No deaths recorded</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {characterDeaths.slice(0, 10).map((death) => (
                  <div 
                    key={death.id} 
                    className="p-3 rounded-lg bg-background/50 border border-white/5"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm">
                          Killed by <span className="font-medium">{death.killerName}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Level {death.level} • {death.occurredAt ? formatDateTime(new Date(death.occurredAt)) : "Unknown"}
                        </p>
                      </div>
                      <Badge variant={death.isPvp ? "destructive" : "secondary"}>
                        {death.isPvp ? "PvP" : "PvE"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!sessions || sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sessions recorded</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session Start</TableHead>
                  <TableHead>Session End</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.slice(0, 15).map((session) => (
                  <TableRow key={session.id}>
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
          )}
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

function formatDateTime(date: Date): string {
  return date.toLocaleString("en-US", { 
    month: "short", 
    day: "numeric", 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}
