import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldCheck,
  Users,
  Shield,
  CreditCard,
  BarChart3,
  Ban,
  CheckCircle,
  XCircle,
  Crown,
  ArrowUpCircle,
  ArrowDownCircle,
} from "lucide-react";

interface AdminMetrics {
  totalUsers: number;
  totalGuilds: number;
  activeSubscriptions: number;
  pendingPayments: number;
}

interface AdminUser {
  id: number;
  discordId: string;
  username: string;
  avatar: string | null;
  globalRole: string;
  blocked: boolean;
  createdAt: string;
}

interface AdminGuild {
  id: number;
  name: string;
  server: string;
  subscriptionStatus: string;
  subscriptionExpiresAt: string | null;
  ownerId: number | null;
  verified: boolean;
}

interface AdminPayment {
  id: number;
  guildId: number;
  userId: number;
  amountTibiaCoins: number;
  characterNameUsedForPayment: string;
  status: string;
  createdAt: string;
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (user?.globalRole !== "ADMIN") {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="bg-card/50 border-destructive/30 max-w-md">
          <CardContent className="pt-6 text-center">
            <ShieldCheck className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold text-destructive">Access Denied</h2>
            <p className="text-muted-foreground mt-2">You need admin privileges to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-admin-title">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, guilds, payments, and platform metrics.</p>
      </div>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList className="bg-card/50 border border-border/50">
          <TabsTrigger value="metrics" data-testid="tab-metrics">
            <BarChart3 className="h-4 w-4 mr-2" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="users" data-testid="tab-users">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="guilds" data-testid="tab-guilds">
            <Shield className="h-4 w-4 mr-2" />
            Guilds
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="tab-payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="metrics">
          <MetricsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="guilds">
          <GuildsTab />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricsTab() {
  const { data: metrics } = useQuery<AdminMetrics>({
    queryKey: ["/api/admin/metrics"],
  });

  const cards = [
    { label: "Total Users", value: metrics?.totalUsers ?? 0, icon: Users, color: "text-blue-400" },
    { label: "Total Guilds", value: metrics?.totalGuilds ?? 0, icon: Shield, color: "text-emerald-400" },
    { label: "Active Subscriptions", value: metrics?.activeSubscriptions ?? 0, icon: Crown, color: "text-yellow-400" },
    { label: "Pending Payments", value: metrics?.pendingPayments ?? 0, icon: CreditCard, color: "text-orange-400" },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.label} className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="text-3xl font-bold mt-1" data-testid={`metric-${card.label.toLowerCase().replace(/\s/g, "-")}`}>
                  {card.value}
                </p>
              </div>
              <card.icon className={`h-8 w-8 ${card.color} opacity-50`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: users = [] } = useQuery<AdminUser[]>({ queryKey: ["/api/admin/users"] });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, blocked }: { userId: number; blocked: boolean }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/block`, { blocked });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated" });
    },
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated" });
    },
  });

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>All Users</CardTitle>
        <CardDescription>{users.length} registered users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-white/5" data-testid={`row-user-${u.id}`}>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  {u.username[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{u.username}</div>
                  <div className="text-xs text-muted-foreground">Discord: {u.discordId}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{u.globalRole}</Badge>
                {u.blocked && <Badge variant="destructive" className="text-[10px]">Blocked</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Select
                  defaultValue={u.globalRole}
                  onValueChange={(role) => roleMutation.mutate({ userId: u.id, role })}
                >
                  <SelectTrigger className="w-28 h-8 text-xs" data-testid={`select-role-${u.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant={u.blocked ? "default" : "destructive"}
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => blockMutation.mutate({ userId: u.id, blocked: !u.blocked })}
                  data-testid={`button-block-${u.id}`}
                >
                  {u.blocked ? "Unblock" : "Block"}
                </Button>
              </div>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No users found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GuildsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: adminGuilds = [] } = useQuery<AdminGuild[]>({ queryKey: ["/api/admin/guilds"] });
  const [durationDays, setDurationDays] = useState("30");

  const activateMutation = useMutation({
    mutationFn: async ({ guildId, plan }: { guildId: number; plan: string }) => {
      await apiRequest("POST", `/api/admin/guilds/${guildId}/activate`, { plan, durationDays: parseInt(durationDays) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guilds"] });
      toast({ title: "Subscription activated" });
    },
  });

  const downgradeMutation = useMutation({
    mutationFn: async (guildId: number) => {
      await apiRequest("POST", `/api/admin/guilds/${guildId}/downgrade`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/guilds"] });
      toast({ title: "Guild downgraded to FREE" });
    },
  });

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>All Guilds</CardTitle>
        <CardDescription>{adminGuilds.length} registered guilds</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <label className="text-xs text-muted-foreground">Duration (days):</label>
          <Input
            type="number"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className="w-20 h-8 text-xs"
            data-testid="input-duration-days"
          />
        </div>
        <div className="space-y-3">
          {adminGuilds.map((g) => (
            <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-white/5" data-testid={`row-guild-${g.id}`}>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-sm font-medium">{g.name}</div>
                  <div className="text-xs text-muted-foreground">{g.server}</div>
                </div>
                <Badge variant="outline" className={`text-[10px] ${g.subscriptionStatus === "PREMIUM" ? "border-yellow-500 text-yellow-400" : ""}`}>
                  {g.subscriptionStatus || "FREE"}
                </Badge>
                {g.verified && <Badge className="bg-emerald-500/10 text-emerald-400 text-[10px]">Verified</Badge>}
                {g.subscriptionExpiresAt && (
                  <span className="text-[10px] text-muted-foreground">
                    Expires: {new Date(g.subscriptionExpiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => activateMutation.mutate({ guildId: g.id, plan: "PREMIUM" })}
                  data-testid={`button-activate-${g.id}`}
                >
                  <ArrowUpCircle className="h-3 w-3" />
                  Premium
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1"
                  onClick={() => downgradeMutation.mutate(g.id)}
                  data-testid={`button-downgrade-${g.id}`}
                >
                  <ArrowDownCircle className="h-3 w-3" />
                  Free
                </Button>
              </div>
            </div>
          ))}
          {adminGuilds.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No guilds found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: payments = [] } = useQuery<AdminPayment[]>({ queryKey: ["/api/admin/payments"] });

  const confirmMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/payments/${id}/confirm`, { plan: "PREMIUM", durationDays: 30 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
      toast({ title: "Payment confirmed" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/admin/payments/${id}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
      toast({ title: "Payment rejected" });
    },
  });

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader>
        <CardTitle>Payment Requests</CardTitle>
        <CardDescription>{payments.length} payment requests</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-background/30 border border-white/5" data-testid={`row-payment-${p.id}`}>
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-yellow-400" />
                <div>
                  <div className="text-sm font-medium">{p.amountTibiaCoins} TC</div>
                  <div className="text-xs text-muted-foreground">Char: {p.characterNameUsedForPayment}</div>
                  <div className="text-xs text-muted-foreground">Guild #{p.guildId} · {new Date(p.createdAt).toLocaleDateString()}</div>
                </div>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    p.status === "PENDING" ? "border-yellow-500 text-yellow-400" :
                    p.status === "CONFIRMED" ? "border-emerald-500 text-emerald-400" :
                    "border-red-500 text-red-400"
                  }`}
                >
                  {p.status}
                </Badge>
              </div>
              {p.status === "PENDING" && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => confirmMutation.mutate(p.id)}
                    data-testid={`button-confirm-payment-${p.id}`}
                  >
                    <CheckCircle className="h-3 w-3" />
                    Confirm
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => rejectMutation.mutate(p.id)}
                    data-testid={`button-reject-payment-${p.id}`}
                  >
                    <XCircle className="h-3 w-3" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
          {payments.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No payment requests</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
