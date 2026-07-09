// main.jsx (Uduua only – with PWA)
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import store from "./store.js";
import { Analytics } from "@vercel/analytics/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Layout & screens (Uduua only)
import UduuaLayout from "./screens/UduuaLayout.jsx";
import UduuaScreen from "./screens/UduuaScreen.jsx";
import UduuaShop from "./screens/UduuaShop.jsx";
import UduuaSignup from "./screens/UduuaSignup.jsx";
import UduuaLogin from "./screens/UduuaLogin.jsx";
import UduuaCart from "./screens/UduuaCart.jsx";
import UduuaProductDetail from "./screens/UduuaProductDetail.jsx";
import UduuaCheckout from "./screens/UduuaCheckout.jsx";
import UduuaOrders from "./screens/UduuaOrders.jsx";
import UduuaOrderId from "./screens/UduuaOrderId.jsx";
import UduuaConfirmOrder from "./screens/UduuaConfirmOrder.jsx";
import UduuaHelp from "./screens/UduuaHelp.jsx";
import UduuaServices from "./screens/UduuaServices.jsx";
import UduuaApplySeller from "./screens/UduuaApplySeller.jsx";
import UduuaAddProduct from "./screens/UduuaAddProduct.jsx";
import UduuaEditProduct from "./screens/UduuaEditProduct.jsx";
import UduuaSellerDashboard from "./screens/UduuaSellerDashboard.jsx";
import UduuaSellerProducts from "./screens/UduuaSellerProducts.jsx";
import UduuaSellerOrders from "./screens/UduuaSellerOrders.jsx";
import UduuaSellerWallet from "./screens/UduuaSellerWallet.jsx";
import UduuaSellerPaymentHistory from "./screens/UduuaSellerPaymentHistory.jsx";
import UduuaPaymentVerify from "./screens/UduuaPaymentVerify.jsx";
import UduuaPaymentPage from "./screens/UduuaPaymentPage.jsx";

//Admin imports
import AdminLayout from "./adminScreens/AdminLayout.jsx";
import AdminLogin from "./adminScreens/AdminLogin.jsx";
import AdminDashboard from "./adminScreens/AdminDashboard.jsx";
import AdminProducts from "./adminScreens/AdminProducts.jsx";
import AdminSellers from "./adminScreens/AdminSellers.jsx";
import AdminReports from "./adminScreens/AdminReports.jsx";
import AdminPayouts from "./adminScreens/AdminPayouts.jsx";
import AdminAds from "./adminScreens/AdminAds.jsx";
import AdminSettings from "./adminScreens/AdminSettings.jsx";

import NotFound from "./screens/NotFound.jsx";

// Push notifications hook
import usePushNotifications from "./hooks/usePushNotifications";

// ==================== ROUTES (Uduua only) ====================
const router = createBrowserRouter([
  { path: "/uduua", element: <UduuaScreen /> },
  { path: "*", element: <NotFound /> },
  {
    path: "/",
    element: <UduuaLayout />,
    children: [
      { index: true, element: <UduuaScreen /> },
      { path: "shop", element: <UduuaShop /> },
      { path: "shop/signup", element: <UduuaSignup /> },
      { path: "shop/login", element: <UduuaLogin /> },
      {path: "login", element: <UduuaLogin />},
      { path: "shop/cart", element: <UduuaCart /> },
      { path: "shop/product/:id", element: <UduuaProductDetail /> },
      { path: "checkout", element: <UduuaCheckout /> },
      { path: "shop/orders", element: <UduuaOrders /> },
      { path: "shop/orders/:id", element: <UduuaOrderId /> },
      { path: "shop/help", element: <UduuaHelp /> },
      { path: "shop/orders/:id/confirm", element: <UduuaConfirmOrder /> },
      { path: "shop/payment-verify", element: <UduuaPaymentVerify /> },
      { path: "shop/payment/:id", element: <UduuaPaymentPage /> },
      { path: "seller/apply", element: <UduuaApplySeller /> },
      { path: "apply/seller", element: <UduuaApplySeller /> },
      { path: "seller/add-product", element: <UduuaAddProduct /> },
      { path: "seller/edit-product/:id", element: <UduuaEditProduct /> },
      { path: "seller/dashboard", element: <UduuaSellerDashboard /> },
      { path: "seller/products", element: <UduuaSellerProducts /> },
      { path: "seller/orders", element: <UduuaSellerOrders /> },
      { path: "seller/wallet", element: <UduuaSellerWallet /> },
      {
        path: "seller/payment-history",
        element: <UduuaSellerPaymentHistory />,
      },
      { path: "services", element: <UduuaServices /> },
    ],
  },

  { path: "/superuser/login", element: <AdminLogin /> },
  {
    path: "superuser",
    element: <AdminLayout />,
    children: [
      { path: "dashboard", element: <AdminDashboard /> },
      { path: "products", element: <AdminProducts /> },
      { path: "sellers", element: <AdminSellers /> },
      { path: "reports", element: <AdminReports /> },
      { path: "payouts", element: <AdminPayouts /> },
      { path: "ads", element: <AdminAds /> },
      { path: "settings", element: <AdminSettings /> },
    ],
  },
]);

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

// Register service worker (PWA)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw-uduua.js")
      .then((registration) => {
        console.log("PWA Service Worker registered:", registration);
      })
      .catch((error) => {
        console.error("PWA Service Worker registration failed:", error);
      });
  });
}

// Wrapper to activate web‑push subscription
const AppWithNotifications = () => {
  usePushNotifications();
  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <AppWithNotifications />
        <Analytics />
      </GoogleOAuthProvider>
    </Provider>
  </StrictMode>,
);
