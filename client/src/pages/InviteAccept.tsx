import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Shield, UserPlus, Clock, AlertTriangle, CheckCircle, LogIn } from "lucide-react";
import bgTexture from "@assets/generated_images/dark_stone_rpg_texture_background.png";

interface InviteData {
  invite: {
    id: number;
    token: string;
    guildId: number;
    role: string;
    expiresAt: string | null;
  };
  guild: {
    id: number;
    name: string;
    server: string;
    subscriptionStatus: string;
  };
}

export default function InviteAccept({ params }: { params: { token: string } }) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const token = params.token;

  const { data, isLoading, error } = useQuery<InviteData>({
    queryKey: ["/api/invites", token],
    queryFn: async () => {
      const res = await fetch(`/api/invites/${token}`, { credentials: "include" });
      if (res.status === 404) throw new Error("Invite not found");
      if (res.status === 410) throw new Error("Invite has expired");
      if (!res.ok) throw new Error("Failed to load invite");
      return res.json();
    },
    retry: false,
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/invites/${token}/accept`);
    },
    onSuccess: () => {
      toast({ title: "Welcome!", description: `You've joined ${data?.guild.name}!` });
      setLocation("/");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const errorMessage = error instanceof Error ? error.message : "Unknown error";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden p-6">
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay z-0"
        style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: "cover" }}
      />

      <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-500">
        <Card className="bg-card/50 border-border/50 backdrop-blur-md shadow-2xl">
          <CardHeader className="text-center">
            {error ? (
              <>
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-2" />
                <CardTitle className="text-xl text-destructive">Invalid Invite</CardTitle>
                <CardDescription>{errorMessage}</CardDescription>
              </>
            ) : (
              <>
                <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 mx-auto mb-2">
                  <UserPlus className="h-10 w-10 text-primary" />
                </div>
                <CardTitle className="text-xl">Guild Invitation</CardTitle>
                <CardDescription>You've been invited to join a guild</CardDescription>
              </>
            )}
          </CardHeader>

          {data && !error && (
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-background/30 border border-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-primary" />
                  <div>
                    <div className="font-bold text-lg" data-testid="text-invite-guild-name">{data.guild.name}</div>
                    <div className="text-sm text-muted-foreground">{data.guild.server}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Your role:</span>
                  <Badge variant="outline" className="text-xs" data-testid="text-invite-role">{data.invite.role}</Badge>
                </div>

                {data.guild.subscriptionStatus && data.guild.subscriptionStatus !== "FREE" && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Plan:</span>
                    <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">{data.guild.subscriptionStatus}</Badge>
                  </div>
                )}

                {data.invite.expiresAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Expires: {new Date(data.invite.expiresAt).toLocaleString()}
                  </div>
                )}
              </div>

              {isAuthenticated ? (
                <Button
                  className="w-full h-12 gap-2 text-lg font-semibold"
                  onClick={() => acceptMutation.mutate()}
                  disabled={acceptMutation.isPending}
                  data-testid="button-accept-invite"
                >
                  <CheckCircle className="h-5 w-5" />
                  {acceptMutation.isPending ? "Joining..." : "Accept Invitation"}
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-center text-muted-foreground">Please log in to accept this invitation</p>
                  <Button
                    className="w-full h-12 bg-[#5865F2] hover:bg-[#4752C4] text-white gap-3 text-lg font-semibold"
                    onClick={() => { window.location.href = "/api/auth/discord"; }}
                    data-testid="button-login-to-accept"
                  >
                    <LogIn className="h-5 w-5" />
                    Login with Discord
                  </Button>
                </div>
              )}
            </CardContent>
          )}

          {error && (
            <CardFooter className="justify-center">
              <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
                Go to Dashboard
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
