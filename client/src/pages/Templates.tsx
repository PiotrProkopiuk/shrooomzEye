import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Swords, Shield, Globe, FileText } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { type Template } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export default function Templates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: "", 
    type: "quest", 
    description: "", 
    defaultMaxParticipants: "15" 
  });

  const { data: templates, isLoading } = useQuery<Template[]>({ 
    queryKey: ["/api/templates"] 
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Template Created", description: "Your template has been saved." });
      setDialogOpen(false);
      setFormData({ name: "", type: "quest", description: "", defaultMaxParticipants: "15" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create template.", variant: "destructive" });
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/templates/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
      toast({ title: "Deleted", description: "Template has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete template.", variant: "destructive" });
    }
  });

  const handleCreate = () => {
    createTemplateMutation.mutate({
      name: formData.name,
      type: formData.type,
      description: formData.description,
      defaultMaxParticipants: parseInt(formData.defaultMaxParticipants),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Server Templates</h1>
          <p className="text-muted-foreground">Manage quest and boss templates specific to this server's guild.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-create-template">
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Create New Template</DialogTitle>
              <DialogDescription>
                Define a reusable template for events and quests.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="bg-background/50 border-white/10"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={v => setFormData({...formData, type: v})}>
                  <SelectTrigger className="bg-background/50 border-white/10" data-testid="select-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quest" data-testid="select-type-quest">Quest</SelectItem>
                    <SelectItem value="boss" data-testid="select-type-boss">Boss</SelectItem>
                    <SelectItem value="hunt" data-testid="select-type-hunt">Hunt</SelectItem>
                    <SelectItem value="service" data-testid="select-type-service">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max">Default Max Participants</Label>
                <Input 
                  id="max" 
                  type="number" 
                  value={formData.defaultMaxParticipants} 
                  onChange={e => setFormData({...formData, defaultMaxParticipants: e.target.value})} 
                  className="bg-background/50 border-white/10"
                  data-testid="input-template-max"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="bg-background/50 border-white/10"
                  data-testid="input-template-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white/10" onClick={() => setDialogOpen(false)} data-testid="button-cancel-template">Cancel</Button>
              <Button 
                onClick={handleCreate} 
                disabled={createTemplateMutation.isPending || !formData.name}
                data-testid="button-submit-template"
              >
                {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-templates-loading">Loading templates...</div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-12" data-testid="text-templates-empty">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No templates created yet</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Click "Create Template" to add your first template</p>
            </div>
          ) : (
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
                {templates.map((t) => (
                  <TableRow key={t.id} className="border-white/5 hover:bg-white/5" data-testid={`row-template-${t.id}`}>
                    <TableCell className="font-medium flex items-center gap-3">
                      <div className="h-8 w-8 rounded bg-background border border-white/10 flex items-center justify-center">
                          {t.type === 'quest' ? <Swords className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-emerald-500" />}
                      </div>
                      {t.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.type === 'quest' ? 'default' : 'secondary'}>
                        {t.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{t.defaultMaxParticipants || 15}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">{t.description || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5" data-testid={`button-edit-template-${t.id}`}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => deleteTemplateMutation.mutate(t.id)}
                          disabled={deleteTemplateMutation.isPending}
                          data-testid={`button-delete-template-${t.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
