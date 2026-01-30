import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, ShieldAlert, Bell, Server, Webhook, TestTube2, CheckCircle, XCircle } from "lucide-react";

interface Guild {
  id: number;
  name: string;
  isEnemy: boolean;
}

interface DeathTrackerConfig {
  id?: number;
  guildId: number;
  discordServerId: string;
  mainGuildWebhookUrl: string | null;
  enemyGuildWebhookUrl: string | null;
  enabled: boolean;
  notifyMainGuildDeaths: boolean;
  notifyEnemyGuildDeaths: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedGuildId, setSelectedGuildId] = useState<number | null>(null);
  const [mainWebhookUrl, setMainWebhookUrl] = useState("");
  const [enemyWebhookUrl, setEnemyWebhookUrl] = useState("");
  const [notifyMainDeaths, setNotifyMainDeaths] = useState(true);
  const [notifyEnemyDeaths, setNotifyEnemyDeaths] = useState(true);
  const [enabled, setEnabled] = useState(true);
  
  const { data: guilds = [] } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });
  
  const mainGuild = guilds.find(g => !g.isEnemy);
  
  const { data: config } = useQuery<DeathTrackerConfig | null>({
    queryKey: ["/api/death-tracker/config", selectedGuildId],
    queryFn: async () => {
      if (!selectedGuildId) return null;
      const res = await fetch(`/api/death-tracker/config/${selectedGuildId}`);
      return res.json();
    },
    enabled: !!selectedGuildId,
  });
  
  useEffect(() => {
    if (mainGuild && !selectedGuildId) {
      setSelectedGuildId(mainGuild.id);
    }
  }, [mainGuild, selectedGuildId]);
  
  useEffect(() => {
    if (config) {
      setMainWebhookUrl(config.mainGuildWebhookUrl || "");
      setEnemyWebhookUrl(config.enemyGuildWebhookUrl || "");
      setNotifyMainDeaths(config.notifyMainGuildDeaths ?? true);
      setNotifyEnemyDeaths(config.notifyEnemyGuildDeaths ?? true);
      setEnabled(config.enabled ?? true);
    }
  }, [config]);
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/death-tracker/config/${selectedGuildId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mainGuildWebhookUrl: mainWebhookUrl || null,
          enemyGuildWebhookUrl: enemyWebhookUrl || null,
          notifyMainGuildDeaths: notifyMainDeaths,
          notifyEnemyGuildDeaths: notifyEnemyDeaths,
          enabled,
          discordServerId: "default",
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/death-tracker/config"] });
      toast({
        title: "Saved",
        description: "Webhook configuration has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save configuration.",
        variant: "destructive",
      });
    },
  });
  
  const testWebhookMutation = useMutation({
    mutationFn: async (webhookUrl: string) => {
      const res = await apiRequest("POST", "/api/death-tracker/test-webhook", { webhookUrl });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Test successful",
          description: "Test message was sent to Discord.",
        });
      } else {
        toast({
          title: "Test failed",
          description: "Failed to send message. Check the webhook URL.",
          variant: "destructive",
        });
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Server Configuration</h1>
          <p className="text-muted-foreground">Manage guild settings and Discord notifications.</p>
        </div>
        <Button 
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          data-testid="button-save-config"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? "Saving..." : "Save Configuration"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          
          <Card className="bg-card/50 border-indigo-500/20 border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-indigo-400">
                  <Webhook className="h-5 w-5" />
                  Discord Notifications - Webhooks
                </CardTitle>
                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                  Death Tracker
                </Badge>
              </div>
              <CardDescription>
                Configure Discord webhooks to receive player death notifications.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded bg-background/30 border border-white/5">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Notifications Enabled</Label>
                  <p className="text-xs text-muted-foreground">Enable/disable all death notifications.</p>
                </div>
                <Switch 
                  checked={enabled} 
                  onCheckedChange={setEnabled}
                  data-testid="switch-notifications-enabled"
                />
              </div>
              
              <Separator className="bg-white/5" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <Label className="text-sm font-medium text-red-400">Guild Deaths (Losses)</Label>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded bg-background/20 border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Notify on guild member deaths</Label>
                  </div>
                  <Switch 
                    checked={notifyMainDeaths} 
                    onCheckedChange={setNotifyMainDeaths}
                    data-testid="switch-notify-main-deaths"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="main-webhook" className="text-xs text-muted-foreground">
                    Webhook URL for guild deaths
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="main-webhook"
                      type="password"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={mainWebhookUrl}
                      onChange={(e) => setMainWebhookUrl(e.target.value)}
                      className="bg-background/50 border-white/10 font-mono text-xs flex-1"
                      data-testid="input-main-webhook"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => mainWebhookUrl && testWebhookMutation.mutate(mainWebhookUrl)}
                      disabled={!mainWebhookUrl || testWebhookMutation.isPending}
                      data-testid="button-test-main-webhook"
                    >
                      <TestTube2 className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                  </div>
                </div>
              </div>
              
              <Separator className="bg-white/5" />
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                  <Label className="text-sm font-medium text-emerald-400">Enemy Deaths (Frags!)</Label>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded bg-background/20 border border-white/5">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Notify on enemy deaths</Label>
                  </div>
                  <Switch 
                    checked={notifyEnemyDeaths} 
                    onCheckedChange={setNotifyEnemyDeaths}
                    data-testid="switch-notify-enemy-deaths"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="enemy-webhook" className="text-xs text-muted-foreground">
                    Webhook URL for enemy deaths
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="enemy-webhook"
                      type="password"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={enemyWebhookUrl}
                      onChange={(e) => setEnemyWebhookUrl(e.target.value)}
                      className="bg-background/50 border-white/10 font-mono text-xs flex-1"
                      data-testid="input-enemy-webhook"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => enemyWebhookUrl && testWebhookMutation.mutate(enemyWebhookUrl)}
                      disabled={!enemyWebhookUrl || testWebhookMutation.isPending}
                      data-testid="button-test-enemy-webhook"
                    >
                      <TestTube2 className="h-4 w-4 mr-1" />
                      Test
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mt-4">
                <h4 className="text-sm font-medium text-indigo-400 mb-2">How to create a Discord Webhook</h4>
                <p className="text-xs text-amber-400 mb-2">Note: Webhooks can only be created using Discord web or desktop app (not mobile).</p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>Open <strong>Discord</strong> in your browser or desktop app</li>
                  <li>Go to your server and right-click the channel where you want notifications</li>
                  <li>Select <strong>"Edit Channel"</strong> → <strong>"Integrations"</strong> tab</li>
                  <li>Click <strong>"Webhooks"</strong> → <strong>"New Webhook"</strong></li>
                  <li>Give it a name (e.g., "ShrooomzEye Deaths") and optionally set an avatar</li>
                  <li>Click <strong>"Copy Webhook URL"</strong></li>
                  <li>Paste the URL in the field above and click <strong>"Save Configuration"</strong></li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2">
                  Tip: You can use two different channels - one for your guild deaths and another for enemy kills.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Guild Identity
              </CardTitle>
              <CardDescription>Basic guild tracking settings.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guild-name">Tracked Guild</Label>
                  <Input 
                    id="guild-name" 
                    defaultValue={mainGuild?.name || "None"} 
                    disabled 
                    className="bg-background/10 border-white/5 opacity-50" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server-id">Discord Server ID</Label>
                  <Input 
                    id="server-id" 
                    defaultValue="Default" 
                    disabled 
                    className="bg-background/10 border-white/5 opacity-50 font-mono" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card/50 border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-emerald-500" />
                Notification Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs">Notifications</span>
                {enabled ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/10 text-red-400 border-red-500/20 gap-1">
                    <XCircle className="h-3 w-3" />
                    Disabled
                  </Badge>
                )}
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-xs">Guild Webhook</span>
                {mainWebhookUrl ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Configured</Badge>
                ) : (
                  <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Not Set</Badge>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs">Enemy Webhook</span>
                {enemyWebhookUrl ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Configured</Badge>
                ) : (
                  <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Not Set</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/10 border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-destructive">
                <ShieldAlert className="h-4 w-4" />
                Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="destructive" 
                className="w-full text-xs" 
                size="sm"
                disabled
                title="Contact support to clear server data"
                data-testid="button-clear-server-data"
              >
                Clear Server Data
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Contact support to clear all data
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
