import { Navigate } from "react-router-dom";
import { useVibeAuth } from "../lib/auth";
import { Spinner } from "./ui/Spinner";

export default function ProtectedRoute({ children }) {
  const { isLoaded, isSignedIn } = useVibeAuth();
  if (!isLoaded) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-900 text-white" data-testid="auth-loading">
        <Spinner size={28} />
      </div>
    );
  }
  if (!isSignedIn) return <Navigate to="/sign-in" replace />;
  return children;
}
