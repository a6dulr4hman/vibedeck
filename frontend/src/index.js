import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { DEMO, DemoAuthProvider } from "./lib/auth";
import { MeProvider } from "./lib/useMe";
import { ThemeProvider } from "./lib/theme";
import "./index.css";

const clerkKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;
const clerkAppearance = { variables: { colorPrimary: "#8B5CF6" } };

const inner = (
  <MeProvider>
    <App />
  </MeProvider>
);

const tree = DEMO ? (
  <DemoAuthProvider>{inner}</DemoAuthProvider>
) : (
  <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/" appearance={clerkAppearance}>
    {inner}
  </ClerkProvider>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>{tree}</BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
