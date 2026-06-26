import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useVibeAuth } from "../lib/auth";
import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/Button";
import { Input, Field } from "../components/ui/Input";
import Icon from "../components/Icon";

export default function DemoAuthPage({ mode = "signin" }) {
  const { isSignedIn, signInDemo } = useVibeAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  const submit = (e) => {
    e.preventDefault();
    signInDemo(email.trim());
    navigate("/dashboard");
  };

  return (
    <AuthShell
      title={mode === "signup" ? "Create your account" : "Welcome back"}
      subtitle="Preview demo mode — jump straight in to try VibeDeck."
      footer={
        <span className="text-zinc-500">
          Real Clerk auth is active on the production deployment.
        </span>
      }
    >
      <div className="mb-5 flex items-start gap-2 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5" data-testid="demo-banner">
        <Icon name="Info" className="h-4 w-4 mt-0.5 shrink-0" />
        <span>This sandbox uses demo auth. Your live Clerk sign-in/up runs on falak.me.</span>
      </div>

      <form onSubmit={submit} className="space-y-5" data-testid="demo-auth-form">
        <Field label="Email (optional)" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            data-testid="demo-email"
          />
        </Field>
        <Button variant="magic" type="submit" className="w-full" data-testid="demo-continue">
          <Icon name="Sparkles" className="h-4 w-4" /> Enter VibeDeck
        </Button>
      </form>
    </AuthShell>
  );
}
