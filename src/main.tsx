import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AdminFloatingPanel } from "./AdminFloatingPanel";
import "./styles.css";
import "./backend.css";
import "./admin.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <AdminFloatingPanel />
  </React.StrictMode>
);
