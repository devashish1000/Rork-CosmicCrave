import { createRoot } from "react-dom/client";
import React, { Component } from "react";
import App from "./App";
import "./index.css";

const fallbackStyles: React.CSSProperties = {
  padding: "2rem",
  fontFamily: "system-ui, sans-serif",
  background: "#0D0B0A",
  color: "#f5f0e6",
  minHeight: "100vh",
};

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={fallbackStyles}>
          <h1 style={{ marginBottom: "1rem" }}>Something went wrong</h1>
          <pre style={{ color: "#e07850", overflow: "auto" }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML = "<div style='padding:2rem;font-family:system-ui;background:#0D0B0A;color:#f5f0e6;min-height:100vh'>No root element found.</div>";
} else {
  try {
    createRoot(rootEl).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    rootEl.innerHTML = `<div style='padding:2rem;font-family:system-ui;background:#0D0B0A;color:#f5f0e6;min-height:100vh'><h1>App failed to load</h1><pre style='color:#e07850'>${String(err)}</pre></div>`;
  }
}
