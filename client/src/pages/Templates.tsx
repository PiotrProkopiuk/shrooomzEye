import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Swords, Shield, Globe } from "lucide-react";
import { useLocation } from "wouter";

const TEMPLATES = [
  { id: 1, name: "Soul War Service", type: "Quest", description: "Full Soul War quest service for all bosses.", max: 15, server: "Antica" },
  { id: 2, name: "Ferumbras' Ascendant", type: "Quest", description: "Quest completion and final boss kill.", max: 15, server: "Antica" },
  { id: 3, name: "Gaz'haragoth Run", type: "Boss", description: "Organized raid for Gaz'haragoth.", max: 20, server: "Vunira" },
  { id: 4, name: "Heart of Destruction", type: "Quest", description: "Full HOD run for gold tokens.", max: 15, server: "Antica" },
  { id: 5, name: "Library Hunt Team", type: "Boss", description: "High-level hunt team for Secret Library.", max: 5, server: "Vunira" },
];

export default function Templates() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Server Templates</h1>
          <p className="text-muted-foreground">Manage quest and boss templates specific to this server's guild.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Template
        </Button>
      </div>

      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Guild Templates</CardTitle>
              <CardDescription>Templates are isolated per Discord server configuration.</CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Globe className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary uppercase">Current Server Scope</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead>Template Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Default Max Players</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TEMPLATES.map((t) => (
                <TableRow key={t.id} className="border-white/5 hover:bg-white/5">
                  <TableCell className="font-medium flex items-center gap-3">
                    <div className="h-8 w-8 rounded bg-background border border-white/10 flex items-center justify-center">
                        {t.type === 'Quest' ? <Swords className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-emerald-500" />}
                    </div>
                    {t.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={t.type === 'Quest' ? 'default' : 'secondary'}>
                      {t.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">{t.max}</TableCell>
                  <TableCell className="max-w-[300px] truncate text-muted-foreground">{t.description}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
