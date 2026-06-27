import { Routes, Route, Navigate } from "react-router-dom";
import Landing from "./pages/Landing";
import SignInPage from "./pages/SignIn";
import SignUpPage from "./pages/SignUp";
import DemoAuthPage from "./pages/DemoAuth";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Present from "./pages/Present";
import Pricing from "./pages/Pricing";
import Admin from "./pages/Admin";
import ProtectedRoute from "./components/ProtectedRoute";
import { DEMO } from "./lib/auth";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/sign-in" element={DEMO ? <DemoAuthPage mode="signin" /> : <SignInPage />} />
      <Route path="/sign-up" element={DEMO ? <DemoAuthPage mode="signup" /> : <SignUpPage />} />
      <Route path="/present/:shareId" element={<Present />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/p/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
