// main.jsx (EventRoom only – no PWA)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store.js";
import { Analytics } from "@vercel/analytics/react";
import { GoogleOAuthProvider } from "@react-oauth/google";

// Layout & screens (EventRoom only)
import App from "./App.jsx";
import EventsScreen from "./screens/EventScreen.jsx";
import EventDetail from "./screens/EventDetail.jsx";
import AllEvents from "./screens/AllEvents.jsx";
import EventRegistration from "./screens/EventRegistration.jsx";
import EventLogin from "./screens/EventLogin.jsx";
import EventSignup from "./screens/EventSignup.jsx";
import UserPrivateRoute from "./components/UserPrivateRoute.jsx";
import EventDashboard from "./screens/EventDashboard.jsx";
import EventDashboardEvents from "./screens/EventDashboardEvents.jsx";
import EventDashboardCreateEvent from "./screens/EventDashboardCreateEvent.jsx";
import EventDashboardRegistrations from "./screens/EventDashboardRegistrations.jsx";
import EventDashboardWallet from "./screens/EventDashboardWallet.jsx";
import EventDashboardAnalytics from "./screens/EventDashboardAnalytics.jsx";
import EventDashboardEventDetail from "./screens/EventDashboardEventDetail.jsx";
import EventDashboardEventRegistrations from "./screens/EventDashboardEventRegistrations.jsx";
import EventDashboardEditEvent from "./screens/EventDashboardEditEvent.jsx";
import EventDashboardTeam from "./screens/EventDashboardTeam.jsx";
import PosterGeneratorPage from "./screens/PosterGeneratorPage.jsx";
import IWillAttend from "./screens/IWillAttend.jsx";

import NotFound from "./screens/NotFound.jsx";

// ==================== ROUTES (EventRoom only) ====================
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <EventsScreen /> },
      { path: ":id", element: <EventDetail /> },
      { path: "all-events", element: <AllEvents /> },
      { path: ":id/register", element: <EventRegistration /> },
      { path: "login", element: <EventLogin /> },
      { path: "signup", element: <EventSignup /> },
      { path: "poster/:registrationId", element: <PosterGeneratorPage /> },
      { path: "i-will-attend", element: <IWillAttend /> },
      {
        element: <UserPrivateRoute />,
        children: [
          { path: "dashboard", element: <EventDashboard /> },
          { path: "dashboard/events", element: <EventDashboardEvents /> },
          { path: "dashboard/events/new", element: <EventDashboardCreateEvent /> },
          { path: "dashboard/registrations", element: <EventDashboardRegistrations /> },
          { path: "dashboard/wallet", element: <EventDashboardWallet /> },
          { path: "dashboard/analytics", element: <EventDashboardAnalytics /> },
          { path: "dashboard/events/:id", element: <EventDashboardEventDetail /> },
          { path: "dashboard/events/:id/registrations", element: <EventDashboardEventRegistrations /> },
          { path: "dashboard/events/:id/edit", element: <EventDashboardEditEvent /> },
          { path: "dashboard/team", element: <EventDashboardTeam /> },
        ],
      },
      // ⚠️ Catch-all route – must be the last child
      { path: "*", element: <NotFound /> },
    ],
  },
]);

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// No service worker registration for EventRoom

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <RouterProvider router={router} />
        <Analytics />
      </GoogleOAuthProvider>
    </Provider>
  </StrictMode>
);