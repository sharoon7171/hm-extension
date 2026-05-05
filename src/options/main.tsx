import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../global.css";
import { OptionsApp } from "./options-app";

const mount = document.body.appendChild(document.createElement("div"));
createRoot(mount).render(
  <StrictMode>
    <OptionsApp />
  </StrictMode>,
);
