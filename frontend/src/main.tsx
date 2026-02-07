import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Verifier from "./Verifier";
import WhistleblowerDashboard from "./WhistleBlowerDashboard";
import Navigation from "../components/Navigation";
import PixelBlast from "../components/PixelBlast";
import "./styles.css";

function Router() {
  const [currentView, setCurrentView] = useState<'campaign' | 'verifier' | 'dashboard'>('campaign');

  const handleNavigate = (view: 'campaign' | 'verifier' | 'dashboard') => {
    setCurrentView(view);
    // Scroll to top when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      {/* Single shared PixelBlast background across all views */}
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", contain: "strict" }}>
        <PixelBlast
          color="#8960df"
          pixelSize={4}
          patternDensity={1}
          enableRipples={false}
        />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {currentView === 'campaign' && <App />}
        {currentView === 'verifier' && <Verifier />}
        {currentView === 'dashboard' && <WhistleblowerDashboard />}
      </div>

      <Navigation currentView={currentView} onNavigate={handleNavigate} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);