import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Verifier from "./Verifier";
import WhistleblowerDashboard from "./WhistleBlowerDashboard";
import Navigation from "../components/Navigation";
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
      {currentView === 'campaign' && <App />}
      {currentView === 'verifier' && <Verifier />}
      {currentView === 'dashboard' && <WhistleblowerDashboard />}
      
      <Navigation currentView={currentView} onNavigate={handleNavigate} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);