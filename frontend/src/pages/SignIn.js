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
  const [step, setStep] = useState("form"); // form | verify
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  const startSignInEmail = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const res = await signIn.create({ identifier: email, strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const res = await signIn.attemptFirstFactor({ strategy: "email_code", code });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        navigate("/dashboard");
      } else {
        setError("Additional verification required.");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const signInWithPasskey = async () => {
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const res = await signIn.authenticateWithPasskey();
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        navigate("/dashboard");
      } else {
        setError("Additional verification required.");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Passkey authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={step === "form" ? "Welcome back" : "Check your email"}
      subtitle={
        step === "form" 
          ? "Sign in to direct your next presentation."
          : `We sent a 6-digit code to ${email}.`
      }
      footer={
        step === "form" ? (
          <>
            New to VibeDeck?{" "}
            <Link to="/sign-up" className="text-violet-300 hover:text-violet-200 font-medium" data-testid="link-sign-up">
              Create an account
            </Link>
          </>
        ) : (
          <button onClick={() => setStep("form")} className="text-violet-300 hover:text-violet-200">
            ← Use a different email
          </button>
        )
      }
    >
      {step === "form" ? (
        <div className="space-y-5">
          <form onSubmit={startSignInEmail} className="space-y-5" data-testid="sign-in-form">
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

            {error && (
              <div className="flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5" data-testid="sign-in-error">
                <Icon name="AlertCircle" className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div id="clerk-captcha" />

            <Button variant="magic" type="submit" className="w-full" disabled={loading} data-testid="sign-in-submit">
              {loading ? <Spinner size={18} /> : "Continue with Email"}
            </Button>
          </form>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-700/50"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase font-medium">Or</span>
            <div className="flex-grow border-t border-zinc-700/50"></div>
          </div>

          <Button 
            variant="secondary" 
            type="button" 
            className="w-full flex items-center justify-center gap-2 border border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-white" 
            onClick={signInWithPasskey} 
            disabled={loading}
          >
            <Icon name="KeyRound" className="h-4 w-4" />
            Sign in with Passkey
          </Button>
        </div>
      ) : (
        <form onSubmit={verifyCode} className="space-y-5" data-testid="verify-form">
          <Field label="Verification code" htmlFor="code">
            <Input
              id="code"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              className="tracking-[0.5em] text-center text-lg"
              required
              data-testid="verify-code"
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5" data-testid="verify-error">
              <Icon name="AlertCircle" className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button variant="magic" type="submit" className="w-full" disabled={loading} data-testid="verify-submit">
            {loading ? <Spinner size={18} /> : "Verify & sign in"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
