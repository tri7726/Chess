import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Crown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export function Nav() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
          <Crown className="h-5 w-5 text-primary" />
          <span className="text-lg">V-Max</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/dashboard"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-accent" }}
          >
            Dashboard
          </Link>
          <Link
            to="/puzzles"
            className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            activeProps={{ className: "rounded-md px-3 py-2 text-foreground bg-accent" }}
          >
            Puzzles
          </Link>
          {user ? (
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth/login">Login</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
