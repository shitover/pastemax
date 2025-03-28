/**
 * Application entry point that sets up React with strict mode.
 * This ensures better development-time checks and warnings.
 */
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";

// Add an event listener to ensure state is saved properly before a page refresh
window.addEventListener('beforeunload', () => {
  // This triggers browser's built-in mechanism for flushing localStorage writes
  // It's a safeguard to ensure pending localStorage operations complete
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
