import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Shield, CheckCircle, Copy, RefreshCw, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Guild } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Guilds() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedGuild, setSelectedGuild] = useState<Guild | null>(null);
  const [formData, setFormData] = useState({ name: "", server: "Antica", isEnemy: false });

  const { data: guilds, isLoading } = useQuery<Guild[]>({ 
    queryKey: ["/api/guilds"] 
  });

  const createGuildMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/guilds", data);
    },
    onSuccess: async (response) => {
      const guild = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
      toast({ title: "Guild Added", description: `${guild.name} has been added. Verify ownership to unlock features.` });
      setDialogOpen(false);
      setFormData({ name: "", server: "Antica", isEnemy: false });
      setSelectedGuild(guild);
      setVerifyDialogOpen(true);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add guild.", variant: "destructive" });
    }
  });

  const verifyGuildMutation = useMutation({
    mutationFn: async (guildId: number) => {
      return apiRequest("POST", `/api/guilds/${guildId}/verify`, {});
    },
    onSuccess: async (response) => {
      const result = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
      if (result.verified) {
        toast({ title: "Verified!", description: "Guild ownership confirmed." });
        setVerifyDialogOpen(false);
      } else {
        toast({ title: "Not Found", description: "Verification code not found in guild description. Please add it and try again.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Error", description: "Verification failed.", variant: "destructive" });
    }
  });

  const syncGuildMutation = useMutation({
    mutationFn: async (guildId: number) => {
      return apiRequest("POST", `/api/guilds/${guildId}/sync`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/players"] });
      toast({ title: "Synced", description: "Guild members updated from TibiaData." });
    },
    onError: () => {
      toast({ title: "Error", description: "Sync failed.", variant: "destructive" });
    }
  });

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Guild name is required.", variant: "destructive" });
      return;
    }
    createGuildMutation.mutate(formData);
  };

  const copyCode = () => {
    if (selectedGuild?.verificationCode) {
      navigator.clipboard.writeText(selectedGuild.verificationCode);
      toast({ title: "Copied", description: "Verification code copied to clipboard." });
    }
  };

  const filteredGuilds = guilds?.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.server?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getGuildType = (guild: Guild) => {
    if (guild.isEnemy) return "Enemy";
    if (guild.verified) return "Main";
    return "Pending";
  };

  const getStatusBadge = (guild: Guild) => {
    if (guild.verified) return { text: "Verified", color: "bg-emerald-500" };
    return { text: "Unverified", color: "bg-orange-500" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Guild Management</h1>
          <p className="text-muted-foreground">Manage tracked guilds and verify ownership.</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-guild">
              <Plus className="h-4 w-4" />
              Add Guild
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Add New Guild</DialogTitle>
              <DialogDescription>
                Enter the guild details. You'll need to verify ownership afterward.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="guildName">Guild Name (exact match)</Label>
                <Input 
                  id="guildName" 
                  placeholder="e.g. Dark Alliance"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="bg-background/50 border-white/10"
                  data-testid="input-guild-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="server">Server</Label>
                <Select value={formData.server} onValueChange={v => setFormData({...formData, server: v})}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Antica", "Secura", "Harmonia", "Premia", "Refugia", "Vunira", "Peloria", "Wintera", "Pacera", "Gladera"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="isEnemy"
                  checked={formData.isEnemy}
                  onChange={e => setFormData({...formData, isEnemy: e.target.checked})}
                  className="h-4 w-4"
                />
                <Label htmlFor="isEnemy" className="text-sm">Mark as Enemy Guild</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white/10" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createGuildMutation.isPending} data-testid="button-submit-guild">
                {createGuildMutation.isPending ? "Adding..." : "Add Guild"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="bg-card border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Verify Guild Ownership
            </DialogTitle>
            <DialogDescription>
              To prove you're a guild leader, add this code to your guild description on tibia.com
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-background/50 rounded-lg border border-primary/30">
              <p className="text-xs text-muted-foreground mb-2">Verification Code:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-lg font-mono text-primary bg-black/30 px-3 py-2 rounded">
                  {selectedGuild?.verificationCode || "Loading..."}
                </code>
                <Button variant="outline" size="icon" onClick={copyCode} className="border-white/10">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Steps:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to tibia.com and log in as guild leader</li>
                <li>Edit your guild description</li>
                <li>Paste the code anywhere in the description</li>
                <li>Save and click "Verify" below</li>
              </ol>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-white/10" onClick={() => setVerifyDialogOpen(false)}>Later</Button>
            <Button 
              onClick={() => selectedGuild && verifyGuildMutation.mutate(selectedGuild.id)} 
              disabled={verifyGuildMutation.isPending}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {verifyGuildMutation.isPending ? "Checking..." : "Verify Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Tracked Guilds</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search guilds..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-white/10" 
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Guild Name</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Power</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : filteredGuilds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">No guilds added yet</TableCell>
                </TableRow>
              ) : filteredGuilds.map((guild) => {
                const status = getStatusBadge(guild);
                const type = getGuildType(guild);
                return (
                  <TableRow key={guild.id} className="border-white/5 hover:bg-white/5">
                    <TableCell className="font-medium flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-background border border-white/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      {guild.name}
                    </TableCell>
                    <TableCell>{guild.server}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={type === 'Enemy' ? 'destructive' : type === 'Main' ? 'default' : 'secondary'}
                        className={type === 'Main' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20' : ''}
                      >
                        {type}
                      </Badge>
                    </TableCell>
                    <TableCell>{guild.guildPower?.toLocaleString() || "—"}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-xs">
                        <span className={`h-1.5 w-1.5 rounded-full ${status.color}`}></span>
                        {status.text}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-white/10">
                          {!guild.verified && (
                            <DropdownMenuItem onClick={() => { setSelectedGuild(guild); setVerifyDialogOpen(true); }}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Verify Ownership
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => syncGuildMutation.mutate(guild.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Members
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
