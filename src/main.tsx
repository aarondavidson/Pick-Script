import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { installNativeSaveStorage } from "./utils/nativeSaves";

installNativeSaveStorage();

createRoot(document.getElementById("root")!).render(<App />);
