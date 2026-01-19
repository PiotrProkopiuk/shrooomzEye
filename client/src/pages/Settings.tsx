import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, Bot, MessageSquare, ShieldAlert } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Bot Configuration</h1>
          <p className="text-muted-foreground">Configure Discord integration and TibiaData polling.</p>
        </div>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-border/50 md:col-span-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    General Settings
                </CardTitle>
                <CardDescription>
                    Core configuration for the Tibia Discord Bot.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="prefix">Command Prefix</Label>
                    <Input id="prefix" defaultValue="!" className="bg-background/50 border-white/10" />
                    <p className="text-xs text-muted-foreground">The character used to trigger bot commands (e.g. !guild)</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="world">Default Game World</Label>
                        <Input id="world" defaultValue="Antica" className="bg-background/50 border-white/10" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="interval">Poll Interval (seconds)</Label>
                        <Input id="interval" type="number" defaultValue="60" className="bg-background/50 border-white/10" />
                    </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-4">
                    <h3 className="text-sm font-medium">Feature Toggles</h3>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Death Notifications</Label>
                            <p className="text-xs text-muted-foreground">Post player deaths to the specified channel.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Level Up Tracking</Label>
                            <p className="text-xs text-muted-foreground">Announce significant level milestones.</p>
                        </div>
                        <Switch defaultChecked />
                    </div>
                     <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label>Boss Predictions</Label>
                            <p className="text-xs text-muted-foreground">Enable boss prediction logic based on kill stats.</p>
                        </div>
                        <Switch />
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="h-4 w-4 text-emerald-500" />
                        Channel Mapping
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Main Log Channel ID</Label>
                        <Input defaultValue="9876543210123456" className="bg-background/50 border-white/10 font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Deaths Channel ID</Label>
                        <Input defaultValue="9876543210123457" className="bg-background/50 border-white/10 font-mono text-xs" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">War Announcements ID</Label>
                        <Input defaultValue="9876543210123458" className="bg-background/50 border-white/10 font-mono text-xs" />
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
                    <Button variant="destructive" className="w-full text-xs" size="sm">
                        Reset All Guild Data
                    </Button>
                    <Button variant="destructive" className="w-full text-xs" size="sm">
                        Disconnect Bot
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
