import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useSignIn, useAuth } from "@clerk/clerk-react";
import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/Button";
import { Input, Field } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import Icon from "../components/Icon";

export default function SignInPage() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signIn, setActive } = useSignIn();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const res = await signIn.create({ identifier: email, password });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        navigate("/dashboard");
      } else {
        setError("Additional verification required. Please continue in your email.");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to direct your next presentation."
      footer={
        <>
          New to VibeDeck?{" "}
          <Link to="/sign-up" className="text-violet-300 hover:text-violet-200 font-medium" data-testid="link-sign-up">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-5" data-testid="sign-in-form">
        <Field label="Email" htmlFor="email">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            required
            data-testid="sign-in-email"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            data-testid="sign-in-password"
          />
        </Field>

        {error && (
          <div className="flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5" data-testid="sign-in-error">
            <Icon name="AlertCircle" className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Clerk bot-protection target */}
        <div id="clerk-captcha" />

        <Button variant="magic" type="submit" className="w-full" disabled={loading} data-testid="sign-in-submit">
          {loading ? <Spinner size={18} /> : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
