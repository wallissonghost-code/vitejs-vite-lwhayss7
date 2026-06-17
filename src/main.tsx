import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AdminFloatingPanel } from "./AdminFloatingPanel";
import { AlgorithmFeed } from "./AlgorithmFeed";
import { NotificationsPanel } from "./NotificationsPanel";
import { PublicProfileRouter } from "./PublicProfile";
import { PublicProfileShortcut } from "./PublicProfileShortcut";
import "./styles.css";
import "./backend.css";
import "./admin.css";
import "./public-profile.css";
import "./notifications.css";
import "./algorithm.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <AdminFloatingPanel />
    <PublicProfileShortcut />
    <NotificationsPanel />
    <AlgorithmFeed />
    <PublicProfileRouter />
  </React.StrictMode>
);
