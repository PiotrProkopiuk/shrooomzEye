import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, RefreshCw, Eye } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ANTICA_DATA } from "@/lib/mockData";

export default function Players() {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const guildData = ANTICA_DATA.mainGuild;

  const handleManualScan = (name: string) => {
    setIsScanning(true);
    toast({
        title: "TibSpy Scan Initiated",
        description: `Fetching latest data for ${name}...`,
    });
    setTimeout(() => {
        setIsScanning(false);
        toast({
            title: "Scan Complete",
            description: `${name}'s level and online status updated via TibSpy.`,
        });
    }, 2000);
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Player Roster</h1>
          <p className="text-muted-foreground">Monitor {guildData.name} members on Antica via TibSpy API.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary">
                <Filter className="h-4 w-4" />
                Filter
            </Button>
            <Button className="gap-2" onClick={() => handleManualScan("Full Guild")}>
                <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
                Scan All Members
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
            <Card className="bg-card/50 border-border/50 sticky top-24">
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Guild Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Members</span>
                        <span className="font-mono">{guildData.stats.totalMembers}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg. Level</span>
                        <span className="font-mono">{guildData.stats.avgLevel}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Common Voc.</span>
                        <span className="text-primary">{guildData.stats.commonVocation}</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20 border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase tracking-widest flex items-center gap-2">
                        <Eye className="h-3 w-3 text-primary" />
                        TibSpy Integration
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="text-[10px] text-muted-foreground leading-relaxed">
                        Automatic scans occur every time a player is added. Nightly cyclic scans are performed at 03:00 CET.
                    </div>
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/5 text-emerald-500 border-emerald-500/20">
                        API Stable
                    </Badge>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-3">
             <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                     <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search player by name..." className="pl-9 bg-background/50 border-white/10" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead>Name</TableHead>
                            <TableHead>Vocation</TableHead>
                            <TableHead>Level (Gained)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">EXP Gained</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {guildData.members.map((p, i) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5 group cursor-pointer">
                                <TableCell className="font-medium text-primary group-hover:text-accent transition-colors">
                                    <div className="flex flex-col">
                                        <span>{p.name}</span>
                                        <span className="text-[10px] text-muted-foreground">{guildData.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{p.vocation}</TableCell>
                                <TableCell className="font-mono">
                                    {p.level} 
                                    {p.levelsGained > 0 && <span className="text-emerald-500 text-xs ml-1">+{p.levelsGained}</span>}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`border-0 ${p.online ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                                        {p.online ? 'Online' : 'Offline'}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right font-mono text-muted-foreground">
                                    {p.expGained}
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
