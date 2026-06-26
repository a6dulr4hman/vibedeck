import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import App from "./App";
import { DEMO, DemoAuthProvider } from "./lib/auth";
import "./index.css";

const clerkKey = process.env.REACT_APP_CLERK_PUBLISHABLE_KEY;

const clerkAppearance = {
  variables: { colorPrimary: "#8B5CF6", colorBackground: "#0A0A0E", colorText: "#ffffff" },
};

const tree = DEMO ? (
  <DemoAuthProvider>
    <App />
  </DemoAuthProvider>
) : (
  <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/" appearance={clerkAppearance}>
    <App />
  </ClerkProvider>
);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>{tree}</BrowserRouter>
  </React.StrictMode>
);
