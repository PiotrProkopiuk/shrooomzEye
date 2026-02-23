import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Save,
  ShieldAlert,
  Bell,
  Server,
  Webhook,
  TestTube2,
  CheckCircle,
  XCircle,
  Link2,
  Copy,
  Trash2,
  Crown,
  CreditCard,
  UserCog,
  Users,
} from "lucide-react";

interface Guild {
  id: number;
  name: string;
  isEnemy: boolean;
  subscriptionStatus?: string;
  subscriptionExpiresAt?: string;
}

interface DeathTrackerConfig {
  id?: number;
  guildId: number;
  discordServerId: string;
  mainGuildWebhookUrl: string | null;
  enemyGuildWebhookUrl: string | null;
  membershipWebhookUrl: string | null;
  enabled: boolean;
  notifyMainGuildDeaths: boolean;
  notifyEnemyGuildDeaths: boolean;
}

interface GuildInvite {
  id: number;
  token: string;
  guildId: number;
  role: string;
  expiresAt: string | null;
  createdAt: string;
}

interface GuildMember {
  id: number;
  guildId: number;
  userId: number;
  role: string;
  user?: { id: number; username: string; discordId: string };
}

interface PaymentData {
  id: number;
  amountTibiaCoins: number;
  characterNameUsedForPayment: string;
  status: string;
  createdAt: string;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, activeGuild } = useAuth();
  
  const [selectedGuildId, setSelectedGuildId] = useState<number | null>(null);
  const [mainWebhookUrl, setMainWebhookUrl] = useState("");
  const [enemyWebhookUrl, setEnemyWebhookUrl] = useState("");
  const [membershipWebhookUrl, setMembershipWebhookUrl] = useState("");
  const [notifyMainDeaths, setNotifyMainDeaths] = useState(true);
  const [notifyEnemyDeaths, setNotifyEnemyDeaths] = useState(true);
  const [enabled, setEnabled] = useState(true);

  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentCharName, setPaymentCharName] = useState("");
  const [transferUserId, setTransferUserId] = useState("");
  
  const { data: guilds = [] } = useQuery<Guild[]>({
    queryKey: ["/api/guilds"],
  });
  
  const mainGuild = guilds.find(g => !g.isEnemy);
  const currentGuildId = selectedGuildId || activeGuild?.guildId || mainGuild?.id;
  const currentGuild = guilds.find(g => g.id === currentGuildId);
  
  const { data: config } = useQuery<DeathTrackerConfig | null>({
    queryKey: ["/api/death-tracker/config", currentGuildId],
    queryFn: async () => {
      if (!currentGuildId) return null;
      const res = await apiRequest("GET", `/api/death-tracker/config/${currentGuildId}`);
      return res.json();
    },
    enabled: !!currentGuildId,
  });

  const { data: invites = [] } = useQuery<GuildInvite[]>({
    queryKey: ["/api/guilds", currentGuildId, "invites"],
    queryFn: async () => {
      if (!currentGuildId) return [];
      const res = await apiRequest("GET", `/api/guilds/${currentGuildId}/invites`);
      return res.json();
    },
    enabled: !!currentGuildId,
  });

  const { data: payments = [] } = useQuery<PaymentData[]>({
    queryKey: ["/api/guilds", currentGuildId, "payments"],
    queryFn: async () => {
      if (!currentGuildId) return [];
      const res = await apiRequest("GET", `/api/guilds/${currentGuildId}/payments`);
      return res.json();
    },
    enabled: !!currentGuildId,
  });
  
  useEffect(() => {
    if (activeGuild && !selectedGuildId) {
      setSelectedGuildId(activeGuild.guildId);
    } else if (mainGuild && !selectedGuildId) {
      setSelectedGuildId(mainGuild.id);
    }
  }, [mainGuild, activeGuild, selectedGuildId]);
  
  useEffect(() => {
    if (config) {
      setMainWebhookUrl(config.mainGuildWebhookUrl || "");
      setEnemyWebhookUrl(config.enemyGuildWebhookUrl || "");
      setMembershipWebhookUrl(config.membershipWebhookUrl || "");
      setNotifyMainDeaths(config.notifyMainGuildDeaths ?? true);
      setNotifyEnemyDeaths(config.notifyEnemyGuildDeaths ?? true);
      setEnabled(config.enabled ?? true);
    }
  }, [config]);
  
  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/death-tracker/config/${currentGuildId}`, {
        mainGuildWebhookUrl: mainWebhookUrl || null,
        enemyGuildWebhookUrl: enemyWebhookUrl || null,
        membershipWebhookUrl: membershipWebhookUrl || null,
        notifyMainGuildDeaths: notifyMainDeaths,
        notifyEnemyGuildDeaths: notifyEnemyDeaths,
        enabled,
        discordServerId: "default",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/death-tracker/config"] });
      toast({ title: "Saved", description: "Webhook configuration has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save configuration.", variant: "destructive" });
    },
  });
  
  const testWebhookMutation = useMutation({
    mutationFn: async ({ webhookUrl, isMain }: { webhookUrl: string; isMain: boolean }) => {
      const res = await apiRequest("POST", "/api/death-tracker/test-webhook", { webhookUrl });
      return { ...(await res.json()), isMain };
    },
    onSuccess: async (data) => {
      if (data.success) {
        await apiRequest("POST", `/api/death-tracker/config/${currentGuildId}`, {
          mainGuildWebhookUrl: mainWebhookUrl || null,
          enemyGuildWebhookUrl: enemyWebhookUrl || null,
          membershipWebhookUrl: membershipWebhookUrl || null,
          notifyMainGuildDeaths: notifyMainDeaths,
          notifyEnemyGuildDeaths: notifyEnemyDeaths,
          enabled,
          discordServerId: "default",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/death-tracker/config"] });
        toast({ title: "Test successful", description: "Webhook tested and configuration saved." });
      } else {
        toast({ title: "Test failed", description: data.message || "Failed to send message.", variant: "destructive" });
      }
    },
  });

  const createInviteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/guilds/${currentGuildId}/invites`, { role: inviteRole });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", currentGuildId, "invites"] });
      toast({ title: "Invite created", description: "Share the invite link with your team." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (inviteId: number) => {
      await apiRequest("DELETE", `/api/guilds/${currentGuildId}/invites/${inviteId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", currentGuildId, "invites"] });
      toast({ title: "Invite deleted" });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/guilds/${currentGuildId}/payment-request`, {
        amountTibiaCoins: parseInt(paymentAmount),
        characterNameUsedForPayment: paymentCharName,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guilds", currentGuildId, "payments"] });
      setPaymentAmount("");
      setPaymentCharName("");
      toast({ title: "Payment request submitted", description: "An admin will review your payment." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const transferMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/guilds/${currentGuildId}/transfer`, { newOwnerId: parseInt(transferUserId) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Ownership transferred", description: "You are now Vice Leader." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const copyInviteLink = (token: string) => {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Copied!", description: "Invite link copied to clipboard." });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Server Configuration</h1>
          <p className="text-muted-foreground">Manage guild settings, invites, and Discord notifications.</p>
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

          <Card className="bg-card/50 border-blue-500/20 border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-blue-400">
                  <Link2 className="h-5 w-5" />
                  Guild Invites
                </CardTitle>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                  {invites.length} active
                </Badge>
              </div>
              <CardDescription>
                Create invite links to let others join your guild dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-40" data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="OFFICER">Officer</SelectItem>
                    <SelectItem value="VICE_LEADER">Vice Leader</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => createInviteMutation.mutate()}
                  disabled={createInviteMutation.isPending}
                  className="gap-2"
                  data-testid="button-create-invite"
                >
                  <Link2 className="h-4 w-4" />
                  Create Invite
                </Button>
              </div>

              {invites.length > 0 && (
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-3 rounded bg-background/30 border border-white/5" data-testid={`row-invite-${invite.id}`}>
                      <div className="flex items-center gap-3">
                        <code className="text-xs text-muted-foreground font-mono">{invite.token.substring(0, 12)}...</code>
                        <Badge variant="outline" className="text-[10px]">{invite.role}</Badge>
                        {invite.expiresAt && (
                          <span className="text-[10px] text-muted-foreground">
                            Expires: {new Date(invite.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyInviteLink(invite.token)} data-testid={`button-copy-invite-${invite.id}`}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteInviteMutation.mutate(invite.id)} data-testid={`button-delete-invite-${invite.id}`}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-yellow-500/20 border">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-yellow-400">
                  <Crown className="h-5 w-5" />
                  Subscription & Payment
                </CardTitle>
                <Badge className={`${currentGuild?.subscriptionStatus === "PREMIUM" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" : "bg-muted text-muted-foreground"}`}>
                  {currentGuild?.subscriptionStatus || "FREE"}
                </Badge>
              </div>
              <CardDescription>
                Manage your guild's subscription plan. Pay with Tibia Coins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentGuild?.subscriptionExpiresAt && (
                <div className="p-3 rounded bg-background/30 border border-white/5">
                  <span className="text-xs text-muted-foreground">
                    Expires: {new Date(currentGuild.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              <div className="space-y-3 p-4 rounded bg-background/30 border border-white/5">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-yellow-400" />
                  Request Subscription
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (TC)</Label>
                    <Input
                      type="number"
                      placeholder="250"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="bg-background/50 border-white/10"
                      data-testid="input-payment-amount"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Character Name</Label>
                    <Input
                      placeholder="Your character"
                      value={paymentCharName}
                      onChange={(e) => setPaymentCharName(e.target.value)}
                      className="bg-background/50 border-white/10"
                      data-testid="input-payment-char"
                    />
                  </div>
                </div>
                <Button
                  onClick={() => paymentMutation.mutate()}
                  disabled={!paymentAmount || !paymentCharName || paymentMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-submit-payment"
                >
                  <CreditCard className="h-4 w-4" />
                  {paymentMutation.isPending ? "Submitting..." : "Submit Payment Request"}
                </Button>
              </div>

              {payments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">Payment History</h4>
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded bg-background/20 border border-white/5" data-testid={`row-payment-history-${p.id}`}>
                      <div className="text-xs">
                        <span className="font-medium">{p.amountTibiaCoins} TC</span>
                        <span className="text-muted-foreground ml-2">via {p.characterNameUsedForPayment}</span>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${
                        p.status === "PENDING" ? "border-yellow-500 text-yellow-400" :
                        p.status === "CONFIRMED" ? "border-emerald-500 text-emerald-400" :
                        "border-red-500 text-red-400"
                      }`}>
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
                      onClick={() => mainWebhookUrl && testWebhookMutation.mutate({ webhookUrl: mainWebhookUrl, isMain: true })}
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
                      onClick={() => enemyWebhookUrl && testWebhookMutation.mutate({ webhookUrl: enemyWebhookUrl, isMain: false })}
                      disabled={!enemyWebhookUrl || testWebhookMutation.isPending}
                      data-testid="button-test-enemy-webhook"
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
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <Label className="text-sm font-medium text-blue-400">Guild Membership Changes</Label>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Get notified when players join or leave tracked guilds. Leave empty to use the guild deaths webhook instead.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="membership-webhook" className="text-xs text-muted-foreground">
                    Webhook URL for join/leave notifications
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      id="membership-webhook"
                      type="password"
                      placeholder="https://discord.com/api/webhooks/... (optional)"
                      value={membershipWebhookUrl}
                      onChange={(e) => setMembershipWebhookUrl(e.target.value)}
                      className="bg-background/50 border-white/10 font-mono text-xs flex-1"
                      data-testid="input-membership-webhook"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => membershipWebhookUrl && testWebhookMutation.mutate({ webhookUrl: membershipWebhookUrl, isMain: false })}
                      disabled={!membershipWebhookUrl || testWebhookMutation.isPending}
                      data-testid="button-test-membership-webhook"
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
              <div className="flex items-center justify-between">
                <span className="text-xs">Membership Webhook</span>
                {membershipWebhookUrl ? (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Configured</Badge>
                ) : (
                  <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Using Death Webhook</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-orange-500/20 border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base text-orange-400">
                <UserCog className="h-4 w-4" />
                Ownership Transfer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Transfer guild ownership to another member. You will become Vice Leader.
              </p>
              <div className="space-y-2">
                <Label className="text-xs">New Owner User ID</Label>
                <Input
                  type="number"
                  placeholder="User ID"
                  value={transferUserId}
                  onChange={(e) => setTransferUserId(e.target.value)}
                  className="bg-background/50 border-white/10 text-xs"
                  data-testid="input-transfer-user-id"
                />
              </div>
              <Button
                variant="outline"
                className="w-full text-xs border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                size="sm"
                disabled={!transferUserId || transferMutation.isPending}
                onClick={() => transferMutation.mutate()}
                data-testid="button-transfer-ownership"
              >
                Transfer Ownership
              </Button>
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
