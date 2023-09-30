import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./components/App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("dashboard")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
