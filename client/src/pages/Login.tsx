import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Ghost, LogIn, Shield, Info } from "lucide-react";
import bgTexture from "@assets/generated_images/dark_stone_rpg_texture_background.png";

export default function Login() {
  const handleDiscordLogin = () => {
    // Redirect to Discord OAuth
    window.location.href = "/api/auth/discord";
  };

  const handleMockLogin = () => {
    // For development/testing without Discord
    localStorage.setItem("mock_auth", "true");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden p-6">
      {/* Texture Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay z-0"
        style={{ backgroundImage: `url(${bgTexture})`, backgroundSize: 'cover' }}
      />

      <div className="max-w-md w-full relative z-10 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/30 mb-4 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
            <Ghost className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">TibiaBot</h1>
          <p className="text-muted-foreground mt-2">Guild Management Panel</p>
        </div>

        <Card className="bg-card/50 border-border/50 backdrop-blur-md shadow-2xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              Leaders and Vice-Leaders only. Please log in with your Discord account to verify your guild roles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <Button 
              onClick={handleDiscordLogin}
              className="w-full h-12 bg-[#5865F2] hover:bg-[#4752C4] text-white gap-3 text-lg font-semibold border-none shadow-lg transition-all active:scale-[0.98]"
            >
              <LogIn className="h-5 w-5" />
              Login with Discord
            </Button>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or for testing</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              onClick={handleMockLogin}
              className="w-full border-white/10"
              data-testid="button-mock-login"
            >
              Continue as Demo User
            </Button>

            <div className="p-3 rounded-lg bg-secondary/30 border border-white/5 flex gap-3 items-start mt-4">
                <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                    This panel uses Discord OAuth2 to securely verify your permissions. 
                    We only access your basic profile and server roles.
                </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-white/5 pt-4 bg-black/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3" />
                <span>Need access? Contact your server owner.</span>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-[10px] text-muted-foreground/40 mt-12 uppercase tracking-[0.2em]">
          Securely Powered by Discord API
        </p>
      </div>
    </div>
  );
}
