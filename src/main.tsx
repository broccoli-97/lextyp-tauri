import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider } from "@mantine/core";

// Library CSS — imported in JS to avoid @import ordering issues in postcss
import "@mantine/core/styles.css";
import "@blocknote/mantine/style.css";

import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider>
      <App />
    </MantineProvider>
  </React.StrictMode>
);
