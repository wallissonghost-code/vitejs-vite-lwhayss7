import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AdminFloatingPanel } from "./AdminFloatingPanel";
import { AlgorithmFeed } from "./AlgorithmFeed";
import { AnalyticsPanel } from "./AnalyticsPanel";
import { CameraBetaPanel } from "./CameraBetaPanel";
import { CreatorWallet } from "./CreatorWallet";
import { CreatorWebPage } from "./CreatorWebPage";
import { DirectMessagesPanel } from "./DirectMessagesPanel";
import { InternalPushAlerts } from "./InternalPushAlerts";
import { LiveCommentsPanel } from "./LiveCommentsPanel";
import { LiveRoomsPanel } from "./LiveRoomsPanel";
import { ModerationPanel } from "./ModerationPanel";
import { NotificationsPanel } from "./NotificationsPanel";
import { PublicProfileRouter } from "./PublicProfile";
import { PublicProfileShortcut } from "./PublicProfileShortcut";
import { ShopPanel } from "./ShopPanel";
import { SubscriptionsPanel } from "./SubscriptionsPanel";
import { ViewTracker } from "./ViewTracker";
import "./styles.css";
import "./backend.css";
import "./admin.css";
import "./public-profile.css";
import "./notifications.css";
import "./algorithm.css";
import "./moderation.css";
import "./wallet.css";
import "./shop.css";
import "./creator-page.css";
import "./analytics.css";
import "./live-comments.css";
import "./direct-messages.css";
import "./internal-push.css";

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
    <SubscriptionsPanel />
    <AnalyticsPanel />
    <LiveCommentsPanel />
    <DirectMessagesPanel />
    <LiveRoomsPanel />
    <CameraBetaPanel />
    <InternalPushAlerts />
    <ViewTracker />
    <PublicProfileRouter />
    <CreatorWebPage />
  </React.StrictMode>
);
