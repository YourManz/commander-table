import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { startAuth } from "./lib/firebase";
import "./index.css";

startAuth();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
