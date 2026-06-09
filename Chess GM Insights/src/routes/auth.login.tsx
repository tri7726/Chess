import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown } from "lucide-react";

export const Route = createFileRoute("/auth/login")({
  head: () => ({ meta: [{ title: "Login — V-Max" }] }),
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xl">
        <div className="mb-6 flex items-center gap-2">
          <Crown className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Sign in to V-Max</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link to="/auth/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
