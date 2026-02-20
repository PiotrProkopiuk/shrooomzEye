import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, UserMinus, RefreshCw, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { type Guild } from "@shared/schema";

interface MembershipEvent {
  id: number;
  guildId: number;
  characterName: string;
  eventType: string;
  detectedAt: string;
  notified: boolean;
}

interface EventsResponse {
  events: MembershipEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface SyncStatus {
  running: boolean;
  lastSyncTime: string | null;
  lastSyncDurationMs: number;
}

export default function GuildChanges() {
  const [page, setPage] = useState(1);
  const [guildFilter, setGuildFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pageSize = 50;

  const { data: guilds = [] } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });

  const guildMap = new Map(guilds.map((g: Guild) => [g.id, g]));

  const queryParams = new URLSearchParams();
  queryParams.set("page", String(page));
  queryParams.set("pageSize", String(pageSize));
  if (guildFilter !== "all") queryParams.set("guildId", guildFilter);
  if (typeFilter !== "all") queryParams.set("eventType", typeFilter);

  const { data, isLoading } = useQuery<EventsResponse>({
    queryKey: ["/api/guild-changes", page, guildFilter, typeFilter],
    queryFn: () => fetch(`/api/guild-changes?${queryParams.toString()}`).then(r => r.json()),
  });

  const { data: syncStatus } = useQuery<SyncStatus>({
    queryKey: ["/api/guild-sync/status"],
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: () => fetch("/api/guild-sync/run", { method: "POST", headers: { "Content-Type": "application/json" } }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Guild sync started" });
      queryClient.invalidateQueries({ queryKey: ["/api/guild-changes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guild-sync/status"] });
    },
    onError: () => {
      toast({ title: "Sync failed", variant: "destructive" });
    },
  });

  const events = data?.events || [];
  const totalPages = data?.totalPages || 1;

  const joinedCount = events.filter(e => e.eventType === "JOINED").length;
  const leftCount = events.filter(e => e.eventType === "LEFT").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-cinzel" data-testid="text-page-title">Guild Changes</h1>
          <p className="text-muted-foreground text-sm">Track members joining and leaving tracked guilds</p>
        </div>
        <div className="flex items-center gap-3">
          {syncStatus?.lastSyncTime && (
            <span className="text-xs text-muted-foreground">
              Last sync: {formatDistanceToNow(new Date(syncStatus.lastSyncTime), { addSuffix: true })}
              {syncStatus.lastSyncDurationMs > 0 && ` (${(syncStatus.lastSyncDurationMs / 1000).toFixed(1)}s)`}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || syncStatus?.running}
            data-testid="button-manual-sync"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${syncStatus?.running ? "animate-spin" : ""}`} />
            {syncStatus?.running ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-events">{data?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Total Events</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-2xl font-bold text-emerald-400" data-testid="text-joined-count">{joinedCount}</p>
                <p className="text-xs text-muted-foreground">Joined (this page)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <UserMinus className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-400" data-testid="text-left-count">{leftCount}</p>
                <p className="text-xs text-muted-foreground">Left (this page)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Membership Events
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={guildFilter} onValueChange={(v) => { setGuildFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[180px] h-8 text-xs" data-testid="select-guild-filter">
                  <SelectValue placeholder="All Guilds" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Guilds</SelectItem>
                  {guilds.map((g: Guild) => (
                    <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[130px] h-8 text-xs" data-testid="select-type-filter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="JOINED">Joined</SelectItem>
                  <SelectItem value="LEFT">Left</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No membership events detected yet</p>
              <p className="text-xs mt-1">Guild sync runs every 15 minutes to detect changes</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Type</TableHead>
                    <TableHead>Character</TableHead>
                    <TableHead>Guild</TableHead>
                    <TableHead className="text-right">Detected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => {
                    const guild = guildMap.get(event.guildId);
                    return (
                      <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                        <TableCell>
                          {event.eventType === "JOINED" ? (
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Joined
                            </Badge>
                          ) : (
                            <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                              <UserMinus className="h-3 w-3 mr-1" />
                              Left
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium" data-testid={`text-character-${event.id}`}>
                          {event.characterName}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground text-sm">{guild?.name || `Guild #${event.guildId}`}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {event.detectedAt ? formatDistanceToNow(new Date(event.detectedAt), { addSuffix: true }) : "Unknown"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({data?.total} events)
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
