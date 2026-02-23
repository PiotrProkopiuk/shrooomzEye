import { createContext, useContext, ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./queryClient";

interface AuthGuild {
  guildId: number;
  role: string;
  guildName: string;
  guildServer: string;
  subscriptionStatus: string | null;
}

interface AuthUser {
  id: number;
  discordId: string;
  username: string;
  avatar: string | null;
  globalRole: string;
  activeGuildId: number | null;
  guilds: AuthGuild[];
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  activeGuild: AuthGuild | null;
  selectGuild: (guildId: number) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  activeGuild: null,
  selectGuild: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 30000,
  });

  const selectGuildMutation = useMutation({
    mutationFn: async (guildId: number) => {
      await apiRequest("POST", "/api/auth/select-guild", { guildId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guilds"] });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/login";
    },
  });

  const isAuthenticated = !!user;
  const isAdmin = user?.globalRole === "ADMIN";
  const activeGuild = user?.guilds?.find(g => g.guildId === user.activeGuildId) || user?.guilds?.[0] || null;

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated,
        isAdmin,
        activeGuild,
        selectGuild: (guildId: number) => selectGuildMutation.mutate(guildId),
        logout: () => logoutMutation.mutate(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
