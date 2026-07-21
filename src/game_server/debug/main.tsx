import React from "react";
import ReactDOM from "react-dom/client";

import { StartServer } from "../main";


function DebugApp() {

    StartServer();
    return (
        <div
            style={{
                width: "100vw",
                height: "100vh",
                overflow: "hidden"
            }}
        >
        </div>
    );
  }

ReactDOM.createRoot(
    document.getElementById("root")!
).render(
    <React.StrictMode>
        <DebugApp />
    </React.StrictMode>
);
