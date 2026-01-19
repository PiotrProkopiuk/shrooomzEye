import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, Bot, MessageSquare, ShieldAlert, Zap, Bell, Server, Volume2, Users, Sliders, Eye, Clock } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Server Configuration</h1>
          <p className="text-muted-foreground">Manage guild settings for the current Discord server.</p>
        </div>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4" />
          Save Server Config
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/50 border-border/50">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      Guild & Bot Identity
                  </CardTitle>
                  <CardDescription>These settings are isolated to the active server ID.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="guild-name">Tracked Guild Name</Label>
                          <Input id="guild-name" defaultValue="Dark Alliance" className="bg-background/50 border-white/10" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="server-id">Discord Server ID</Label>
                          <Input id="server-id" defaultValue="1234567890" disabled className="bg-background/10 border-white/5 opacity-50 font-mono" />
                      </div>
                  </div>
              </CardContent>
          </Card>

          {/* New TibSpy Configuration Section */}
          <Card className="bg-card/50 border-emerald-500/20 border">
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-emerald-500">
                        <Eye className="h-5 w-5" />
                        TibSpy API Integration
                    </CardTitle>
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Advanced Scans</Badge>
                  </div>
                  <CardDescription>Configure cyclic scans and character tracking behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <Label htmlFor="tibspy-key">TibSpy API Key</Label>
                          <Input id="tibspy-key" type="password" placeholder="Enter your API key..." className="bg-background/50 border-white/10" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-3 rounded bg-background/30 border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-xs">Scan on Add</Label>
                                <p className="text-[10px] text-muted-foreground">Auto-scan new players.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded bg-background/30 border border-white/5">
                            <div className="space-y-0.5">
                                <Label className="text-xs">Cyclic Enemy Scans</Label>
                                <p className="text-[10px] text-muted-foreground">Daily nightly scan.</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                      </div>

                      <div className="flex items-center gap-4 bg-background/20 p-4 rounded-lg border border-white/5">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                            <Label className="text-sm">Scan Schedule (Nightly)</Label>
                            <div className="flex gap-2 mt-1">
                                <Input type="time" defaultValue="03:00" className="w-24 bg-background/50 border-white/10 h-8" />
                                <p className="text-[10px] text-muted-foreground self-center italic">Time in Server Time (CET)</p>
                            </div>
                        </div>
                      </div>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/20 border">
              <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Volume2 className="h-5 w-5 text-primary" />
                        War Command: /pvp_action
                    </CardTitle>
                    <Badge className="bg-primary/20 text-primary border-primary/30">Leader Only</Badge>
                  </div>
                  <CardDescription>Configure the voice channel mass-move command for war situations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="cmd-alias">Command Name / Alias</Label>
                          <Input id="cmd-alias" defaultValue="/pvp_action" className="bg-background/50 border-white/10 font-mono" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="target-role">Admin Role Required</Label>
                          <Select defaultValue="leader">
                            <SelectTrigger className="bg-background/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="leader">Leader & Vice</SelectItem>
                                <SelectItem value="council">Council Members</SelectItem>
                            </SelectContent>
                          </Select>
                      </div>
                  </div>
              </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="h-4 w-4 text-emerald-500" />
                        Server Reports
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Daily Summary</Label>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Weekly Stats</Label>
                        <Switch defaultChecked />
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="space-y-2">
                        <Label className="text-xs">Discord Channel ID</Label>
                        <Input defaultValue="9876543210123456" className="bg-background/50 border-white/10 font-mono text-xs" />
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
                        Purge Server Data
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
