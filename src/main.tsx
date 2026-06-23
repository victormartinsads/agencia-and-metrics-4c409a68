import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import React from "react";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh",
          background: "#0a0a0a",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          fontFamily: "monospace",
        }}>
          <h1 style={{ color: "#c5ff1a", marginBottom: "1rem" }}>⚠ Erro ao carregar</h1>
          <pre style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "1rem",
            maxWidth: "800px",
            width: "100%",
            overflow: "auto",
            fontSize: "12px",
            color: "#f87171",
          }}>
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              background: "#c5ff1a",
              color: "#000",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
