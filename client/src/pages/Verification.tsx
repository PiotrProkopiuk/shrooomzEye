import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  ExternalLink, 
  Lock,
  CheckCircle2,
  Copy,
  AlertCircle
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Verification() {
  const [isVerified, setIsVerified] = useState(false);
  const [code, setCode] = useState("TIBIABOT-7829-DA");
  const { toast } = useToast();

  const handleGenerate = () => {
    const newCode = `TIBIABOT-${Math.floor(1000 + Math.random() * 9000)}-DA`;
    setCode(newCode);
    toast({
      title: "New code generated",
      description: "Code updated and will expire in 24 hours.",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    toast({
        title: "Copied to clipboard",
        description: "Paste this into your Tibia guild description.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Guild Verification</h1>
          <p className="text-muted-foreground">Secure your guild's ownership via the official Tibia website.</p>
        </div>
        <Badge variant={isVerified ? "default" : "destructive"} className={isVerified ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
          {isVerified ? "Verified Guild" : "Action Required"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/50 border-border/50 relative overflow-hidden">
            {!isVerified && (
                <div className="absolute top-0 right-0 p-4">
                    <Badge variant="outline" className="text-orange-500 border-orange-500/30 bg-orange-500/5 animate-pulse">
                        Restricted Mode Active
                    </Badge>
                </div>
            )}
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Verification Workflow
                </CardTitle>
                <CardDescription>Follow these steps to unlock all bot features for your Discord server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 mt-1">1</div>
                    <div className="space-y-4 flex-1">
                        <div>
                            <p className="font-medium">Generate Verification Code</p>
                            <p className="text-sm text-muted-foreground">This code is unique to your Discord Server ID.</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-background/50 border border-white/10 rounded-md px-4 py-2 font-mono text-primary flex items-center justify-between">
                                {code}
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
                                    <Copy className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            <Button variant="outline" size="icon" onClick={handleGenerate}>
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 mt-1">2</div>
                    <div className="space-y-2">
                        <p className="font-medium">Update Tibia Guild Page</p>
                        <p className="text-sm text-muted-foreground">Log in to Tibia.com and paste the code into your Guild Description. It must be visible to the public.</p>
                        <Button variant="link" className="text-primary p-0 h-auto gap-1">
                            Go to Tibia Guild Management <ExternalLink className="h-3 w-3" />
                        </Button>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold shrink-0 mt-1">3</div>
                    <div className="space-y-4">
                        <p className="font-medium">Finalize Verification</p>
                        <p className="text-sm text-muted-foreground">Once the code is live, click the button below. Our bot will scrape the official page to verify.</p>
                        <Button 
                            className="w-full sm:w-auto gap-2" 
                            disabled={isVerified}
                            onClick={() => {
                                setIsVerified(true);
                                toast({
                                    title: "Verification Successful!",
                                    description: "All bot features are now unlocked for this server.",
                                });
                            }}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Verify Now
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4 text-orange-500" />
                        Feature Locks
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {[
                            { name: "Quest/Boss Management", locked: !isVerified },
                            { name: "/pvp_action Command", locked: !isVerified },
                            { name: "Leaderboards & Analytics", locked: !isVerified },
                            { name: "Automated Role Assignment", locked: !isVerified },
                        ].map((feature, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className={feature.locked ? "text-muted-foreground" : "text-foreground"}>{feature.name}</span>
                                {feature.locked ? (
                                    <Badge variant="outline" className="text-[10px] border-orange-500/20 text-orange-500">Locked</Badge>
                                ) : (
                                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
                <CardFooter className="border-t border-white/5 pt-4">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <p className="text-[10px] text-muted-foreground">
                            Verification codes expire after 24 hours. If verification fails, please regenerate a new code and try again.
                        </p>
                    </div>
                </CardFooter>
            </Card>
            
            <Card className="bg-secondary/30 border-white/5">
                <CardHeader>
                    <CardTitle className="text-sm">Verification History</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-1">
                        {[
                            { time: "Today, 10:24", status: "Failed", reason: "Code not found" },
                            { time: "Yesterday, 14:15", status: "Expired", reason: "24h limit reached" },
                        ].map((h, i) => (
                            <div key={i} className="px-4 py-2 border-b border-white/5 last:border-0 flex justify-between items-center">
                                <div>
                                    <p className="text-xs font-medium">{h.time}</p>
                                    <p className="text-[10px] text-muted-foreground">{h.reason}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase">{h.status}</Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
