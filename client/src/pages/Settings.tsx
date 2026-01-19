import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Bot, MessageSquare, ShieldAlert, Zap, Bell } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Bot Configuration</h1>
          <p className="text-muted-foreground">Configure Discord integration, Role Automation, and Alerts.</p>
        </div>
        <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/50 border-border/50">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5 text-primary" />
                      General Settings
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="prefix">Command Prefix</Label>
                          <Input id="prefix" defaultValue="!" className="bg-background/50 border-white/10" />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="world">Default Game World</Label>
                          <Input id="world" defaultValue="Antica" className="bg-background/50 border-white/10" />
                      </div>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      Role Automation
                  </CardTitle>
                  <CardDescription>Automatically assign roles during events.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                          <Label>Event Participant Role</Label>
                          <p className="text-xs text-muted-foreground">Assign "Quest Participant" role on signup.</p>
                      </div>
                      <Switch defaultChecked />
                  </div>
                  <div className="space-y-2">
                      <Label>Role to Assign</Label>
                      <Select defaultValue="participant">
                          <SelectTrigger className="bg-background/50 border-white/10">
                              <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="participant">Quest Participant</SelectItem>
                              <SelectItem value="warrior">War Member</SelectItem>
                              <SelectItem value="ally">Guild Ally</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
              </CardContent>
          </Card>

          <Card className="bg-card/50 border-border/50">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-blue-400" />
                      PvP & Boss Alerts
                  </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                          <Label>PvP Alerts</Label>
                          <p className="text-xs text-muted-foreground">Notify when enemy guild members log in.</p>
                      </div>
                      <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                          <Label>Boss Spawns</Label>
                          <p className="text-xs text-muted-foreground">Notify on confirmed boss spawns from TibiaData.</p>
                      </div>
                      <Switch defaultChecked />
                  </div>
              </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <Card className="bg-card/50 border-border/50">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MessageSquare className="h-4 w-4 text-emerald-500" />
                        Automated Reports
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Daily Summary</Label>
                        <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">Weekly Guild Stats</Label>
                        <Switch defaultChecked />
                    </div>
                    <Separator className="bg-white/5" />
                    <div className="space-y-2">
                        <Label className="text-xs">Report Channel ID</Label>
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
                        Reset All Guild Data
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
