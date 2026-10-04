import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// Lot P0 : attachement automatique du jeton d'authentification aux appels API.
import "./lib/authorizedFetch.ts";

createRoot(document.getElementById("root")!).render(<App />);
