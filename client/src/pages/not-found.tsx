import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md mx-4 bg-card/50 border-border/50 backdrop-blur-sm">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20">
                <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-3xl font-display font-bold text-foreground">404</h1>
          </div>

          <p className="text-lg font-medium text-foreground mb-2">Page Not Found</p>
          <p className="text-sm text-muted-foreground mb-6">
            The scroll you are looking for has crumbled to dust.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
