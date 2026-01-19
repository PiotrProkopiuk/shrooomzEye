import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MoreVertical, Shield } from "lucide-react";

export default function Guilds() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Guild Management</h1>
          <p className="text-muted-foreground">Manage tracked guilds and diplomatic relations.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Guild
        </Button>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Tracked Guilds</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search guilds..." className="pl-9 bg-background/50 border-white/10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Guild Name</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Members</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { name: "Dark Alliance", server: "Antica", type: "Main", members: 145, status: "Active" },
                { name: "Red Rose", server: "Antica", type: "Ally", members: 32, status: "Active" },
                { name: "Hill", server: "Vunira", type: "Enemy", members: 89, status: "War Mode" },
                { name: "Mercenarys", server: "Antica", type: "Neutral", members: 12, status: "Inactive" },
              ].map((guild, i) => (
                <TableRow key={i} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-background border border-white/10 flex items-center justify-center">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </div>
                    {guild.name}
                  </TableCell>
                  <TableCell>{guild.server}</TableCell>
                  <TableCell>
                    <Badge variant={guild.type === 'Enemy' ? 'destructive' : guild.type === 'Ally' ? 'default' : 'secondary'} 
                           className={guild.type === 'Ally' ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20' : ''}>
                      {guild.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{guild.members}</TableCell>
                  <TableCell>
                    <span className={`flex items-center gap-2 text-xs ${guild.status === 'War Mode' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${guild.status === 'Active' ? 'bg-emerald-500' : guild.status === 'War Mode' ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></span>
                        {guild.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
