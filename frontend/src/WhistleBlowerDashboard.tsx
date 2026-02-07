import { useEffect, useState, useRef, useCallback } from "react";
import PixelBlast from "../components/PixelBlast";
import { ParticleCard, BentoCardGrid, GlobalSpotlight, useMobileDetection } from '../components/MagicBento';

type Campaign = {
  id: string;
  title: string;
  description: string;
  journalistAddress: string;
  verifierAddress: string;
  goalXrp?: number;
  totalRaisedXrp: number;
  totalLockedXrp: number;
  totalReleasedXrp: number;
  escrowCount: number;
  status: string;
  createdAt: string;
};

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";
const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 400;
const DEFAULT_GLOW_COLOR = "132, 0, 255";

// LocalStorage key for tracking user's campaigns
const MY_CAMPAIGNS_KEY = "whistleblower_my_campaigns";

// Helper to get campaigns created by this user
const getMyCampaignIds = (): string[] => {
  try {
    const stored = localStorage.getItem(MY_CAMPAIGNS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to add a campaign to user's list
const addMyCampaignId = (campaignId: string) => {
  const ids = getMyCampaignIds();
  if (!ids.includes(campaignId)) {
    ids.push(campaignId);
    localStorage.setItem(MY_CAMPAIGNS_KEY, JSON.stringify(ids));
  }
};

export default function WhistleblowerDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | "info">("info");
  
  // Form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalXrp, setGoalXrp] = useState("");
  const [journalistAddress, setJournalistAddress] = useState("");
  const [verifierAddress, setVerifierAddress] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();

  // Fetch user's campaigns
  const fetchMyCampaigns = useCallback(async () => {
    setLoading(true);
    setStatus(null);
    
    try {
      const myCampaignIds = getMyCampaignIds();
      
      if (myCampaignIds.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Try to fetch from backend, fall back to localStorage
      try {
        const fetchedCampaigns: Campaign[] = [];
        
        for (const id of myCampaignIds) {
          try {
            const res = await fetch(`${API_BASE}/api/campaigns/${id}`);
            if (res.ok) {
              const data = await res.json();
              fetchedCampaigns.push(data);
            }
          } catch {
            // If backend fails, try localStorage
            const localCampaign = localStorage.getItem(`campaign_${id}`);
            if (localCampaign) {
              fetchedCampaigns.push(JSON.parse(localCampaign));
            }
          }
        }
        
        setCampaigns(fetchedCampaigns);
      } catch (err) {
        setStatus("Backend unavailable. Using local storage.");
        setStatusType("info");
        
        // Load from localStorage
        const localCampaigns = myCampaignIds
          .map(id => {
            const stored = localStorage.getItem(`campaign_${id}`);
            return stored ? JSON.parse(stored) : null;
          })
          .filter(Boolean);
        
        setCampaigns(localCampaigns);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to load campaigns");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyCampaigns();
  }, [fetchMyCampaigns]);

  // Create new campaign
  const handleCreateCampaign = async () => {
    setStatus(null);
    setLoading(true);

    // Validation
    if (!title.trim()) {
      setStatus("Campaign title is required");
      setStatusType("error");
      setLoading(false);
      return;
    }
    if (!description.trim()) {
      setStatus("Description is required");
      setStatusType("error");
      setLoading(false);
      return;
    }
    if (!journalistAddress.trim()) {
      setStatus("Journalist wallet address is required");
      setStatusType("error");
      setLoading(false);
      return;
    }
    if (!verifierAddress.trim()) {
      setStatus("Verifier address is required");
      setStatusType("error");
      setLoading(false);
      return;
    }

    const goalAmount = goalXrp ? Number(goalXrp) : undefined;
    if (goalXrp && (!Number.isFinite(goalAmount) || goalAmount! <= 0)) {
      setStatus("Goal must be a positive number");
      setStatusType("error");
      setLoading(false);
      return;
    }

    const campaignId = `campaign-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newCampaign: Campaign = {
      id: campaignId,
      title: title.trim(),
      description: description.trim(),
      journalistAddress: journalistAddress.trim(),
      verifierAddress: verifierAddress.trim(),
      goalXrp: goalAmount,
      totalRaisedXrp: 0,
      totalLockedXrp: 0,
      totalReleasedXrp: 0,
      escrowCount: 0,
      status: "active",
      createdAt: new Date().toISOString()
    };

    try {
      // Try backend first
      const res = await fetch(`${API_BASE}/api/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCampaign)
      });

      if (res.ok) {
        const data = await res.json();
        addMyCampaignId(data.id || campaignId);
        setStatus(`Campaign created: ${data.id || campaignId}`);
        setStatusType("success");
      } else {
        throw new Error("Backend unavailable");
      }
    } catch {
      // Fall back to localStorage
      localStorage.setItem(`campaign_${campaignId}`, JSON.stringify(newCampaign));
      addMyCampaignId(campaignId);
      setStatus(`Campaign created locally: ${campaignId}`);
      setStatusType("success");
    }

    // Reset form
    setTitle("");
    setDescription("");
    setGoalXrp("");
    setJournalistAddress("");
    setVerifierAddress("");
    setShowCreateForm(false);

    // Reload campaigns
    await fetchMyCampaigns();
    setLoading(false);
  };

  // Calculate totals across all campaigns
  const totalStats = campaigns.reduce(
    (acc, campaign) => ({
      raised: acc.raised + campaign.totalRaisedXrp,
      locked: acc.locked + campaign.totalLockedXrp,
      released: acc.released + campaign.totalReleasedXrp,
      escrows: acc.escrows + campaign.escrowCount
    }),
    { raised: 0, locked: 0, released: 0, escrows: 0 }
  );

  const shouldDisableAnimations = isMobile;

  return (
    <div style={{ position: "relative", width: "100%", minHeight: "100vh", overflow: "hidden" }}>
      {/* Background */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0 }}>
        <PixelBlast
          color="#8960df"
          pixelSize={4}
          patternDensity={1}
          enableRipples={true}
        />
      </div>

      <div className="page" style={{ position: "relative", zIndex: 1 }}>
        {/* Hero Section */}
        <header className="hero">
          <p className="tag">WHISTLEBLOWER DASHBOARD</p>
          <h1>Manage Your Campaigns</h1>
          <p className="subtitle">
            Create transparent funding campaigns and track donations securely on XRPL.
          </p>
        </header>

        {/* Stats Grid */}
        <>
          <GlobalSpotlight
            gridRef={gridRef}
            disableAnimations={shouldDisableAnimations}
            enabled={true}
            spotlightRadius={DEFAULT_SPOTLIGHT_RADIUS}
            glowColor={DEFAULT_GLOW_COLOR}
          />

          <BentoCardGrid gridRef={gridRef}>
            {/* Total Campaigns */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010" } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Active</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{campaigns.length}</h2>
                <p className="magic-bento-card__description">Your Campaigns</p>
              </div>
            </ParticleCard>

            {/* Total Raised */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010" } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Raised</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{totalStats.raised} XRP</h2>
                <p className="magic-bento-card__description">Total Donations</p>
              </div>
            </ParticleCard>

            {/* New Campaign */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010", minHeight: "550px"} as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">New Campaign</div>
              </div>
              <div className="magic-bento-card__content" style={{ gap: "12px" }}>
                <h2 className="magic-bento-card__title">Create Campaign</h2>
                <p className="magic-bento-card__description">
                  Start a new transparent funding campaign
                </p>
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  style={{ marginTop: "8px" }}
                >
                  {showCreateForm ? "Cancel" : "Create New Campaign"}
                </button>
              </div>
            </ParticleCard>

            {/* Total Released */}
            <ParticleCard
              className="magic-bento-card magic-bento-card--text-autohide magic-bento-card--border-glow"
              style={{ backgroundColor: "#060010" } as React.CSSProperties}
              disableAnimations={shouldDisableAnimations}
              particleCount={DEFAULT_PARTICLE_COUNT}
              glowColor={DEFAULT_GLOW_COLOR}
              enableTilt={false}
              clickEffect={true}
              enableMagnetism={false}
            >
              <div className="magic-bento-card__header">
                <div className="magic-bento-card__label">Released</div>
              </div>
              <div className="magic-bento-card__content">
                <h2 className="magic-bento-card__title">{totalStats.released} XRP</h2>
                <p className="magic-bento-card__description">Verified Payouts</p>
              </div>
            </ParticleCard>
          </BentoCardGrid>
        </>

        {/* Create Campaign Form */}
        {showCreateForm && (
          <section className="panel" style={{ marginTop: "24px" }}>
            <h2>New Campaign Details</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px" }}>
                  Campaign Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="City Hall Corruption Investigation"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px" }}>
                  Description *
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Investigating misuse of public funds..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(37, 99, 235, 0.3)",
                    fontSize: "16px",
                    background: "#0f172a",
                    color: "#e2e8f0",
                    fontFamily: "inherit",
                    resize: "vertical"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px" }}>
                  Funding Goal (XRP)
                </label>
                <input
                  type="number"
                  value={goalXrp}
                  onChange={(e) => setGoalXrp(e.target.value)}
                  placeholder="1000"
                  min="0"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px" }}>
                  Journalist Wallet Address (XRPL) *
                </label>
                <input
                  type="text"
                  value={journalistAddress}
                  onChange={(e) => setJournalistAddress(e.target.value)}
                  placeholder="rN7n7otQDd6FczFgLdlqtyMVrn3TyEhfy9"
                  style={{ width: "100%", fontFamily: "Monaco, monospace", fontSize: "14px" }}
                />
                <p className="hint">Where released funds will be sent</p>
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "8px", color: "#94a3b8", fontSize: "14px" }}>
                  Verifier Address (XRPL) *
                </label>
                <input
                  type="text"
                  value={verifierAddress}
                  onChange={(e) => setVerifierAddress(e.target.value)}
                  placeholder="rPEPPER7kfTD9w2To4CQk6UCfuHM9c6GDY"
                  style={{ width: "100%", fontFamily: "Monaco, monospace", fontSize: "14px" }}
                />
                <p className="hint">Trusted party who can release escrows</p>
              </div>

              <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
                <button onClick={handleCreateCampaign} disabled={loading}>
                  {loading ? "Creating..." : "Create Campaign"}
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  style={{ background: "rgba(148, 163, 184, 0.1)", color: "#94a3b8" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Status Messages */}
        {status && (
          <div className={`status ${statusType}`} style={{ marginTop: "24px" }}>
            {status}
          </div>
        )}

        {/* Campaigns List */}
        {campaigns.length > 0 && (
          <section className="panel" style={{ marginTop: "24px" }}>
            <h2>Your Campaigns ({campaigns.length})</h2>
            <ul className="list" style={{ marginTop: "16px" }}>
              {campaigns.map((campaign) => (
                <li key={campaign.id} style={{ flexDirection: "column", alignItems: "stretch", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "#e2e8f0" }}>
                        {campaign.title}
                      </h3>
                      <p style={{ margin: "0", fontSize: "14px", color: "#94a3b8" }}>
                        {campaign.description}
                      </p>
                      <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
                        Campaign ID: {campaign.id}
                      </div>
                    </div> 
                  </div>

                  <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))" }}>
                    <div style={{ padding: "12px" }}>
                      <h3 style={{ fontSize: "12px" }}>Raised</h3>
                      <p style={{ fontSize: "16px" }}>{campaign.totalRaisedXrp} XRP</p>
                    </div>
                    <div style={{ padding: "12px" }}>
                      <h3 style={{ fontSize: "12px" }}>Locked</h3>
                      <p style={{ fontSize: "16px" }}>{campaign.totalLockedXrp} XRP</p>
                    </div>
                    <div style={{ padding: "12px" }}>
                      <h3 style={{ fontSize: "12px" }}>Released</h3>
                      <p style={{ fontSize: "16px" }}>{campaign.totalReleasedXrp} XRP</p>
                    </div>
                    <div style={{ padding: "12px" }}>
                      <h3 style={{ fontSize: "12px" }}>Escrows</h3>
                      <p style={{ fontSize: "16px" }}>{campaign.escrowCount}</p>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}?campaign=${campaign.id}`;
                        navigator.clipboard.writeText(url);
                        setStatus("Campaign link copied to clipboard!");
                        setStatusType("success");
                      }}
                      style={{ fontSize: "13px", padding: "8px 14px" }}
                    >
                      Copy Campaign Link
                    </button>
                    <button
                      onClick={() => window.open(`?campaign=${campaign.id}`, '_blank')}
                      style={{
                        fontSize: "13px",
                        padding: "8px 14px",
                        background: "rgba(96, 165, 250, 0.1)",
                        color: "#60a5fa"
                      }}
                    >
                      View Public Page
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}