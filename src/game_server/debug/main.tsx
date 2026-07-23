import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom/client";
import { DebugRender } from "./Render";


function DebugApp() {

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {

        if (!containerRef.current)
            return;

        const debug = new DebugRender(containerRef.current);

        return () => debug.destroy();

    }, []);

    return <div ref={containerRef} />;
}

ReactDOM.createRoot(
    document.getElementById("root")!
).render(
    <React.StrictMode>
        <DebugApp />
    </React.StrictMode>
);
