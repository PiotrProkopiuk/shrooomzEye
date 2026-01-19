import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Swords, Skull } from "lucide-react";

export default function Players() {
  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Player Roster</h1>
          <p className="text-muted-foreground">Monitor guild members, levels, and vocations.</p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/10 hover:text-primary">
                <Filter className="h-4 w-4" />
                Filter
            </Button>
            <Button className="gap-2">
                Scan Guild
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-4">
            <Card className="bg-card/50 border-border/50 sticky top-24">
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">Vocation Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[
                        { label: "Elite Knights", count: 45, color: "bg-yellow-500" },
                        { label: "Elder Druids", count: 38, color: "bg-blue-400" },
                        { label: "Master Sorcerers", count: 32, color: "bg-red-400" },
                        { label: "Royal Paladins", count: 27, color: "bg-emerald-400" },
                    ].map((v, i) => (
                        <div key={i} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span>{v.label}</span>
                                <span className="text-muted-foreground">{v.count}</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div className={`h-full ${v.color} opacity-80`} style={{ width: `${(v.count / 45) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
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
                            <TableHead>Level</TableHead>
                            <TableHead>Guild</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">PVP Stats</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {[
                            { name: "Eternal Oblivion", voc: "Elite Knight", lvl: 350, guild: "Dark Alliance", status: "Online", kills: 120, deaths: 4 },
                            { name: "Mateusz Dragon Wielki", voc: "Elder Druid", lvl: 340, guild: "Dark Alliance", status: "Offline", kills: 98, deaths: 12 },
                            { name: "Bubble", voc: "Elite Knight", lvl: 250, guild: "Red Rose", status: "Online", kills: 450, deaths: 89 },
                            { name: "Kharsek", voc: "Elite Knight", lvl: 1200, guild: "Neutral", status: "Online", kills: 12, deaths: 0 },
                            { name: "Cachero", voc: "Master Sorcerer", lvl: 310, guild: "Enemy", status: "Online", kills: 342, deaths: 45 },
                        ].map((p, i) => (
                            <TableRow key={i} className="border-white/5 hover:bg-white/5 group cursor-pointer">
                                <TableCell className="font-medium text-primary group-hover:text-accent transition-colors">{p.name}</TableCell>
                                <TableCell className="text-muted-foreground">{p.voc}</TableCell>
                                <TableCell className="font-mono">{p.lvl}</TableCell>
                                <TableCell>{p.guild}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`border-0 ${p.status === 'Online' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary text-muted-foreground'}`}>
                                        {p.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-3 text-xs">
                                        <span className="flex items-center gap-1 text-emerald-400" title="Frags">
                                            <Swords className="h-3 w-3" /> {p.kills}
                                        </span>
                                        <span className="flex items-center gap-1 text-destructive" title="Deaths">
                                            <Skull className="h-3 w-3" /> {p.deaths}
                                        </span>
                                    </div>
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
