import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, Plus, MapPin } from "lucide-react";

export default function Events() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Events & Quests</h1>
          <p className="text-muted-foreground">Manage service quests and boss runs.</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Events */}
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
                participants: 8,
                max: 15,
                loc: "Otherworld",
                status: "Filling",
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
                        <Badge className={`${event.status === 'Open' ? 'bg-emerald-500' : event.status === 'Last Spot' ? 'bg-orange-500' : 'bg-primary'} hover:bg-primary/80`}>
                            {event.status}
                        </Badge>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">{event.title}</CardTitle>
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
                            {event.participants}/{event.max} Players
                        </div>
                    </div>
                    
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-primary transition-all duration-1000" 
                            style={{ width: `${(event.participants / event.max) * 100}%` }}
                        />
                    </div>
                </CardContent>
                <CardFooter className="border-t border-white/5 pt-4">
                    <Button variant="ghost" className="w-full hover:bg-primary/10 hover:text-primary">
                        Manage Signup
                    </Button>
                </CardFooter>
            </Card>
        ))}
      </div>
    </div>
  );
}
