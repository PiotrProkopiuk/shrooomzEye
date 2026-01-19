import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, Plus, MapPin, MoreHorizontal } from "lucide-react";
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

const TEMPLATES = [
    { name: "Soul War Service", type: "Quest", description: "Full Soul War quest service for all bosses.", max: 15 },
    { name: "Ferumbras' Ascendant", type: "Quest", description: "Quest completion and final boss kill.", max: 15 },
    { name: "Gaz'haragoth Run", type: "Boss", description: "Organized raid for Gaz'haragoth.", max: 20 },
];

export default function Events() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState({ name: "", desc: "", max: "15" });

  const handleTemplateChange = (val: string) => {
    setSelectedTemplate(val);
    const template = TEMPLATES.find(t => t.name === val);
    if (template) {
        setFormData({ name: template.name, desc: template.description, max: template.max.toString() });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Events & Quests</h1>
          <p className="text-muted-foreground">Manage service quests and boss runs.</p>
        </div>
        
        <Dialog>
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
                    {TEMPLATES.map(t => (
                        <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Event Name</Label>
                <Input id="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="bg-background/50 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Input id="desc" value={formData.desc} onChange={e => setFormData({...formData, desc: e.target.value})} className="bg-background/50 border-white/10" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="date">Date & Time</Label>
                    <Input id="date" type="datetime-local" className="bg-background/50 border-white/10" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="max">Max Participants</Label>
                    <Input id="max" type="number" value={formData.max} onChange={e => setFormData({...formData, max: e.target.value})} className="bg-background/50 border-white/10" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white/10">Cancel</Button>
              <Button>Create Event</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
            {
                title: "Soul War Service - Goshnar's Malice",
                type: "Quest Service",
                date: "Today, 20:00 CET",
                participants: 12,
                max: 15,
                loc: "Goshnar's Taint",
                status: "Open",
                image: "linear-gradient(to bottom right, rgba(239, 68, 68, 0.2), rgba(0,0,0,0))"
            },
            {
                title: "Heart of Destruction - Full Run",
                type: "Boss Run",
                date: "Tomorrow, 18:00 CET",
                participants: 15,
                max: 15,
                loc: "Otherworld",
                status: "FULL",
                image: "linear-gradient(to bottom right, rgba(59, 130, 246, 0.2), rgba(0,0,0,0))"
            },
             {
                title: "Library Hunt - Fire Section",
                type: "Hunt",
                date: "Friday, 21:00 CET",
                participants: 4,
                max: 5,
                loc: "Secret Library",
                status: "Last Spot",
                image: "linear-gradient(to bottom right, rgba(234, 179, 8, 0.1), rgba(0,0,0,0))"
            }
        ].map((event, i) => (
            <Card key={i} className="bg-card/50 border-border/50 overflow-hidden relative group">
                <div 
                    className="absolute inset-0 opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: event.image }}
                />
                <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                        <Badge variant="outline" className="bg-background/50 backdrop-blur border-white/10">
                            {event.type}
                        </Badge>
                        <Badge className={`${event.status === 'Open' ? 'bg-emerald-500' : event.status === 'FULL' ? 'bg-destructive animate-pulse' : 'bg-orange-500'}`}>
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
