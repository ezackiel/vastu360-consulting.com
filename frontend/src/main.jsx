import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AdminDashboard from "./admin/AdminDashboard.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import "./index.css";

const isAdminRoute = window.location.pathname.replace(/\/+$/, "") === "/admin"
  || window.location.pathname.startsWith("/admin/");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      {isAdminRoute ? <AdminDashboard /> : <App />}
    </AuthProvider>
  </React.StrictMode>
);
