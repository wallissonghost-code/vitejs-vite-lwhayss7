import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AdminFloatingPanel } from "./AdminFloatingPanel";
import { AlgorithmFeed } from "./AlgorithmFeed";
import { CreatorWallet } from "./CreatorWallet";
import { ModerationPanel } from "./ModerationPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { PublicProfileRouter } from "./PublicProfile";
import { PublicProfileShortcut } from "./PublicProfileShortcut";
import { ShopPanel } from "./ShopPanel";
import "./styles.css";
import "./backend.css";
import "./admin.css";
import "./public-profile.css";
import "./notifications.css";
import "./algorithm.css";
import "./moderation.css";
import "./wallet.css";
import "./shop.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <AdminFloatingPanel />
    <PublicProfileShortcut />
    <NotificationsPanel />
    <AlgorithmFeed />
    <ModerationPanel />
    <CreatorWallet />
    <ShopPanel />
    <PublicProfileRouter />
  </React.StrictMode>
);
