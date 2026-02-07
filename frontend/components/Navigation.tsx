import React from 'react';

type NavigationProps = {
  currentView: 'campaign' | 'verifier' | 'dashboard';
  onNavigate: (view: 'campaign' | 'verifier' | 'dashboard') => void;
};

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  return (
    <nav className="vertical-nav">
      <button
        className={`nav-bubble ${currentView === 'campaign' ? 'active' : ''}`}
        onClick={() => onNavigate('campaign')}
        title="Campaign"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </button>

      <button
        className={`nav-bubble ${currentView === 'dashboard' ? 'active' : ''}`}
        onClick={() => onNavigate('dashboard')}
        title="Dashboard"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      </button>

      <button
        className={`nav-bubble ${currentView === 'verifier' ? 'active' : ''}`}
        onClick={() => onNavigate('verifier')}
        title="Verifier"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      </button>
    </nav>
  );
};

export default Navigation;