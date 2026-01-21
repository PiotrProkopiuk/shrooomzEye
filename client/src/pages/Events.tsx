import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Plus, MapPin, MoreHorizontal } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Event, type Template, type Guild } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Events() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState({ title: "", type: "quest", maxParticipants: "15", startTime: "" });
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: guilds } = useQuery<Guild[]>({ queryKey: ["/api/guilds"] });
  const mainGuild = guilds?.find(g => !g.isEnemy);

  const { data: templates } = useQuery<Template[]>({ queryKey: ["/api/templates"] });
  const { data: events } = useQuery<Event[]>({ 
    queryKey: [`/api/events/${mainGuild?.id}`],
    enabled: !!mainGuild?.id
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/events", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/events/${mainGuild?.id}`] });
      toast({ title: "Event Created", description: "Your event has been scheduled." });
      setDialogOpen(false);
      setFormData({ title: "", type: "quest", maxParticipants: "15", startTime: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create event.", variant: "destructive" });
    }
  });

  const handleTemplateChange = (val: string) => {
    setSelectedTemplate(val);
    const template = templates?.find(t => t.name === val);
    if (template) {
      setFormData({ 
        title: template.name, 
        type: template.type, 
        maxParticipants: (template.defaultMaxParticipants || 15).toString(),
        startTime: ""
      });
    }
  };

  const handleCreate = () => {
    createEventMutation.mutate({
      title: formData.title,
      type: formData.type,
      maxParticipants: parseInt(formData.maxParticipants),
      startTime: formData.startTime ? new Date(formData.startTime) : null,
      guildId: mainGuild?.id,
    });
  };

  const mockEvents = [
    {
      title: "Soul War Service - Goshnar's Malice",
      type: "Quest Service",
      date: "Today, 20:00 CET",
      participants: 12,
      max: 15,
      loc: "Goshnar's Taint",
      status: "Open",
    },
    {
      title: "Heart of Destruction - Full Run",
      type: "Boss Run",
      date: "Tomorrow, 18:00 CET",
      participants: 15,
      max: 15,
      loc: "Otherworld",
      status: "FULL",
    },
  ];

  const displayEvents = events?.length ? events.map(e => ({
    title: e.title,
    type: e.type,
    date: e.startTime ? new Date(e.startTime).toLocaleString() : "TBD",
    participants: e.currentParticipants || 0,
    max: e.maxParticipants || 15,
    loc: "TBD",
    status: e.status === "full" ? "FULL" : e.status === "open" ? "Open" : e.status,
  })) : mockEvents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Events & Quests</h1>
          <p className="text-muted-foreground">Manage service quests and boss runs.</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl">Create New Event</DialogTitle>
              <DialogDescription>
                Fill in the details or select a template to pre-populate.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Use Template</Label>
                <Select onValueChange={handleTemplateChange}>
                  <SelectTrigger className="bg-background/50 border-white/10">
                    <SelectValue placeholder="Select a template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates?.map(t => (
                      <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Event Name</Label>
                <Input id="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-background/50 border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date & Time</Label>
                  <Input id="date" type="datetime-local" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max">Max Participants</Label>
                  <Input id="max" type="number" value={formData.maxParticipants} onChange={e => setFormData({...formData, maxParticipants: e.target.value})} className="bg-background/50 border-white/10" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white/10" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createEventMutation.isPending}>
                {createEventMutation.isPending ? "Creating..." : "Create Event"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {displayEvents.map((event, i) => (
          <Card key={i} className="bg-card/50 border-border/50 overflow-hidden relative group">
            <CardHeader>
              <div className="flex justify-between items-start mb-2">
                <Badge variant="outline" className="bg-background/50 backdrop-blur border-white/10">
                  {event.type}
                </Badge>
                <Badge className={`${event.status === 'Open' ? 'bg-emerald-500' : event.status === 'FULL' ? 'bg-destructive' : 'bg-orange-500'}`}>
                  {event.status}
                </Badge>
              </div>
              <CardTitle className="text-xl group-hover:text-primary transition-colors flex items-center justify-between">
                {event.title}
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                <MapPin className="h-3.5 w-3.5" /> {event.loc}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {event.date}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className={event.participants >= event.max ? 'text-destructive font-bold' : ''}>
                    {event.participants}/{event.max} Players
                  </span>
                </div>
              </div>
              
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${event.participants >= event.max ? 'bg-destructive' : 'bg-primary'}`} 
                  style={{ width: `${Math.min((event.participants / event.max) * 100, 100)}%` }}
                />
              </div>
            </CardContent>
            <CardFooter className="border-t border-white/5 pt-4">
              <Button variant="ghost" className="w-full hover:bg-primary/10 hover:text-primary">
                {event.participants >= event.max ? 'Manage Waiting List' : 'Manage Participants'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
