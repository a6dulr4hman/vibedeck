import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useSignUp, useAuth } from "@clerk/clerk-react";
import AuthShell from "../components/AuthShell";
import { Button } from "../components/ui/Button";
import { Input, Field } from "../components/ui/Input";
import { Spinner } from "../components/ui/Spinner";
import Icon from "../components/Icon";

export default function SignUpPage() {
  const { isSignedIn } = useAuth();
  const { isLoaded, signUp, setActive } = useSignUp();
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // form | verify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isSignedIn) return <Navigate to="/dashboard" replace />;

  const startSignUp = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setStep("verify");
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Could not create account");
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!isLoaded) return;
    setError("");
    setLoading(true);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code });
      if (res.status === "complete") {
        await setActive({ session: res.createdSessionId });
        navigate("/dashboard");
      } else {
        setError("Verification incomplete. Please check the code and try again.");
      }
    } catch (err) {
      setError(err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={step === "form" ? "Create your account" : "Verify your email"}
      subtitle={
        step === "form"
          ? "Start turning documents into cinematic decks."
          : `We sent a 6-digit code to ${email}.`
      }
      footer={
        step === "form" ? (
          <>
            Already have an account?{" "}
            <Link to="/sign-in" className="text-violet-300 hover:text-violet-200 font-medium" data-testid="link-sign-in">
              Sign in
            </Link>
          </>
        ) : (
          <button onClick={() => setStep("form")} className="text-violet-300 hover:text-violet-200" data-testid="back-to-form">
            ← Use a different email
          </button>
        )
      }
    >
      {step === "form" ? (
        <form onSubmit={startSignUp} className="space-y-5" data-testid="sign-up-form">
          <Field label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              data-testid="sign-up-email"
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              data-testid="sign-up-password"
            />
          </Field>

          {error && (
            <div className="flex items-start gap-2 text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2.5" data-testid="sign-up-error">
              <Icon name="AlertCircle" className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div id="clerk-captcha" />

          <Button variant="magic" type="submit" className="w-full" disabled={loading} data-testid="sign-up-submit">
            {loading ? <Spinner size={18} /> : "Create account"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-5" data-testid="verify-form">
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
            {loading ? <Spinner size={18} /> : "Verify & continue"}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
