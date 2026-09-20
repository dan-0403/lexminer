import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Database,
  Gauge,
  Layers3,
  LoaderCircle,
  LogOut,
  Menu,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";
import adminPicture from "../../assets/admin-picture.png";

import { getAdminProfile } from "../../services/adminProfileService";

import {
  getVectorIndexErrorMessage,
  rebuildVectorIndex,
} from "../../services/adminVectorIndexService";

import "../../styles/admin-profile.css";
import "../../styles/vector-index.css";

/* =====================================================
   DEFAULT PROFILE
===================================================== */

const DEFAULT_PROFILE = {
  id: null,

  first_name: "",

  last_name: "",

  email: "",

  profile_picture: null,

  role: "",

  is_active: false,

  is_verified: false,
};

/* =====================================================
   DEFAULT REBUILD RESULT
===================================================== */

const DEFAULT_REBUILD_RESULT = {
  message: "",

  cases_processed: 0,

  chunks_processed: 0,

  vectors_created: 0,

  failed_chunks: 0,
};

/* =====================================================
   FORMAT NUMBER
===================================================== */

function formatNumber(value) {
  return new Intl.NumberFormat("en-PH").format(Number(value) || 0);
}

/* =====================================================
   FORMAT DURATION
===================================================== */

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(Math.floor(Number(totalSeconds) || 0), 0);

  if (safeSeconds < 60) {
    return `${safeSeconds}s`;
  }

  const minutes = Math.floor(safeSeconds / 60);

  const seconds = safeSeconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${seconds}s`;
  }

  const hours = Math.floor(minutes / 60);

  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/* =====================================================
   PAGE LOADER
===================================================== */

function VectorIndexLoader() {
  return (
    <div className="lexminer-loader">
      <div className="loader-grid" />

      <div className="loader-content">
        <div className="loader-logo-wrapper">
          <div className="loader-orbit orbit-one" />
          <div className="loader-orbit orbit-two" />

          <img src={lexminerLogo} alt="LexMiner" className="loader-logo" />
        </div>

        <h1>LexMiner</h1>

        <p>AI Adaptive Language Case Decision Miner</p>

        <div className="loader-progress">
          <div className="loader-progress-bar" />
        </div>

        <div className="loader-status">
          <LoaderCircle size={17} className="spin-icon" />
          Loading vector index center...
        </div>
      </div>
    </div>
  );
}

function MonitorIndexIcon() {
  return (
    <div className="vector-index-heading-icon">
      <BrainCircuit size={23} />
    </div>
  );
}

/* =====================================================
   MAIN PAGE
===================================================== */

export default function VectorIndexPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const [initialLoading, setInitialLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [rebuilding, setRebuilding] = useState(false);

  const [rebuildStartedAt, setRebuildStartedAt] = useState(null);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [rebuildResult, setRebuildResult] = useState(DEFAULT_REBUILD_RESULT);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [showRebuildConfirmation, setShowRebuildConfirmation] = useState(false);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  /* ===================================================
     PROFILE VALUES
  =================================================== */

  const fullName = useMemo(() => {
    const name = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || "LexMiner Administrator";
  }, [profile.first_name, profile.last_name]);

  const avatarSource = profile.profile_picture || adminPicture;

  /* ===================================================
     REDIRECT TO LOGIN
  =================================================== */

  const redirectToAdminLogin = useCallback(() => {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_access_token");

    localStorage.removeItem("admin_refresh_token");

    localStorage.removeItem("admin_user");

    navigate("/admin/login", {
      replace: true,
    });
  }, [navigate]);

  /* ===================================================
     LOAD ADMIN PROFILE
  =================================================== */

  const loadProfile = useCallback(
    async ({ showRefresh = false } = {}) => {
      const token = localStorage.getItem("admin_token");

      if (!token) {
        redirectToAdminLogin();

        return null;
      }

      if (showRefresh) {
        setRefreshing(true);
      }

      setError("");

      try {
        const result = await getAdminProfile();

        setProfile({
          ...DEFAULT_PROFILE,
          ...result,
        });

        return result;
      } catch (requestError) {
        const status = requestError?.response?.status;

        if (status === 401 || status === 403) {
          redirectToAdminLogin();

          return null;
        }

        setError(getVectorIndexErrorMessage(requestError));

        return null;
      } finally {
        setInitialLoading(false);

        setRefreshing(false);
      }
    },
    [redirectToAdminLogin],
  );

  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadProfile();
    }, 700);

    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  /* ===================================================
     ELAPSED TIMER
  =================================================== */

  useEffect(() => {
    if (!rebuilding || !rebuildStartedAt) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      const elapsed = Math.max(
        Math.floor((Date.now() - rebuildStartedAt) / 1000),
        0,
      );

      setElapsedSeconds(elapsed);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [rebuildStartedAt, rebuilding]);

  /* ===================================================
     AUTO-HIDE NOTICE
  =================================================== */

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  /* ===================================================
     AUTO-HIDE ERROR
  =================================================== */

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError("");
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [error]);

  /* ===================================================
     ESCAPE HANDLER
  =================================================== */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (rebuilding) {
        return;
      }

      setShowRebuildConfirmation(false);

      setShowLogoutConfirmation(false);

      setMobileSidebarOpen(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [rebuilding]);

  /* ===================================================
     OPEN REBUILD CONFIRMATION
  =================================================== */

  const openRebuildConfirmation = useCallback(() => {
    setError("");

    setNotice("");

    setShowRebuildConfirmation(true);
  }, []);

  /* ===================================================
     CLOSE REBUILD CONFIRMATION
  =================================================== */

  const closeRebuildConfirmation = useCallback(() => {
    if (rebuilding) {
      return;
    }

    setShowRebuildConfirmation(false);
  }, [rebuilding]);

  /* ===================================================
     EXECUTE VECTOR REBUILD
  =================================================== */

  const handleRebuildVectorIndex = useCallback(async () => {
    setRebuilding(true);

    setRebuildStartedAt(Date.now());

    setElapsedSeconds(0);

    setRebuildResult(DEFAULT_REBUILD_RESULT);

    setError("");

    setNotice("");

    try {
      const result = await rebuildVectorIndex();

      setRebuildResult({
        ...DEFAULT_REBUILD_RESULT,
        ...result,
      });

      setNotice(result?.message || "Vector index rebuilt successfully.");

      setShowRebuildConfirmation(false);
    } catch (requestError) {
      setError(getVectorIndexErrorMessage(requestError));
    } finally {
      setRebuilding(false);
    }
  }, []);

  /* ===================================================
     REFRESH PAGE DATA
  =================================================== */

  const refreshPage = useCallback(async () => {
    await loadProfile({
      showRefresh: true,
    });
  }, [loadProfile]);

  /* ===================================================
     LOGOUT
  =================================================== */

  const confirmLogout = useCallback(() => {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_access_token");

    localStorage.removeItem("admin_refresh_token");

    localStorage.removeItem("admin_user");

    navigate("/authentication", {
      replace: true,
    });
  }, [navigate]);

  if (initialLoading) {
    return <VectorIndexLoader />;
  }

  return (
    <div
      className={`admin-profile-page ${
        sidebarCollapsed ? "sidebar-is-collapsed" : ""
      }`}
    >
      <div className="profile-background">
        <div className="background-grid" />
        <div className="background-orb orb-a" />
        <div className="background-orb orb-b" />
        <div className="background-orb orb-c" />
      </div>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}
      {/* =================================================
          SIDEBAR
      ================================================= */}

      <aside
        className={`admin-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-brand">
          <img src={lexminerLogo} alt="LexMiner logo" />

          {!sidebarCollapsed && (
            <div>
              <strong>LexMiner</strong>

              <span>Legal Intelligence</span>
            </div>
          )}

          <button
            type="button"
            className="mobile-close-button"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-system-status">
          <span className="status-indicator" />

          {!sidebarCollapsed && (
            <div>
              <strong>System operational</strong>

              <span>AI services online</span>
            </div>
          )}
        </div>

        <nav className="sidebar-navigation">
          <button
            type="button"
            className="sidebar-link"
            title="Dashboard"
            onClick={() => navigate("/admin/dashboard")}
          >
            <Gauge size={21} />

            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            title="Admin Profile"
            onClick={() => navigate("/admin/profile")}
          >
            <CircleUserRound size={21} />

            {!sidebarCollapsed && <span>Profile</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            title="User Management"
            onClick={() => navigate("/admin/user-management")}
          >
            <Users size={21} />

            {!sidebarCollapsed && <span>User Management</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            title="Upload Documents"
            onClick={() => navigate("/admin/upload-documents")}
          >
            <UploadCloud size={21} />

            {!sidebarCollapsed && <span>Upload Documents</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            title="Dataset Management"
            onClick={() => navigate("/admin/dataset-management")}
          >
            <Database size={21} />

            {!sidebarCollapsed && <span>Dataset Management</span>}
          </button>

          <button
            type="button"
            className="sidebar-link active"
            title="Vector Index"
          >
            <BrainCircuit size={21} />

            {!sidebarCollapsed && <span>Vector Index</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-link logout-link"
            onClick={() => setShowLogoutConfirmation(true)}
            title="Logout"
          >
            <LogOut size={21} />

            {!sidebarCollapsed && <span>Logout</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="sidebar-version">
              LexMiner Admin
              <span>Version 1.0.0</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setSidebarCollapsed((current) => !current)}
          aria-label="Toggle sidebar"
        >
          {sidebarCollapsed ? (
            <ChevronRight size={17} />
          ) : (
            <ChevronLeft size={17} />
          )}
        </button>
      </aside>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="profile-main">
        {/* ===============================================
            TOP BAR
        =============================================== */}

        <header className="profile-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div>
              <span className="topbar-eyebrow">Administrator Console</span>

              <h1>Vector Index</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-live-status">
              <span />
              Secure
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={refreshPage}
              disabled={refreshing || rebuilding}
            >
              <RefreshCcw size={18} className={refreshing ? "spin-icon" : ""} />

              <span>{refreshing ? "Refreshing" : "Refresh"}</span>
            </button>

            <button type="button" className="admin-account-button">
              <img
                src={avatarSource}
                alt="Administrator"
                className="admin-avatar"
              />

              <div>
                <strong>{fullName}</strong>

                <span>System Admin</span>
              </div>
            </button>
          </div>
        </header>

        {/* ===============================================
            PAGE CONTENT
        =============================================== */}

        <div className="profile-content">
          {error && (
            <div className="profile-alert error-alert">
              <AlertTriangle size={20} />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Close error"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {notice && (
            <div className="profile-alert success-alert">
              <CheckCircle2 size={20} />

              <span>{notice}</span>

              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Close notification"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* ===============================================
              VECTOR INDEX HERO
          =============================================== */}

          <section className="vector-index-hero profile-animate">
            <div className="vector-index-hero-copy">
              <div className="hero-label">
                <BrainCircuit size={16} />
                Semantic search infrastructure
              </div>

              <h2>
                Rebuild the LexMiner
                <span> Vector Index</span>
              </h2>

              <p>
                Regenerate embeddings from the legal case chunks stored in
                PostgreSQL and recreate the ChromaDB collection used by LexMiner
                semantic case retrieval.
              </p>

              <div className="vector-index-hero-actions">
                <button
                  type="button"
                  className="vector-index-rebuild-button"
                  onClick={openRebuildConfirmation}
                  disabled={rebuilding}
                >
                  {rebuilding ? (
                    <LoaderCircle size={19} className="spin-icon" />
                  ) : (
                    <RotateCcw size={19} />
                  )}

                  {rebuilding ? "Rebuilding Index..." : "Rebuild Vector Index"}
                </button>

                <button
                  type="button"
                  className="vector-index-dataset-button"
                  onClick={() => navigate("/admin/dataset-management")}
                  disabled={rebuilding}
                >
                  <Database size={19} />
                  View Datasets
                </button>
              </div>

              <div className="vector-index-hero-features">
                <div>
                  <ShieldCheck size={17} />
                  Administrator protected
                </div>

                <div>
                  <Layers3 size={17} />
                  PostgreSQL chunk source
                </div>

                <div>
                  <BrainCircuit size={17} />
                  ChromaDB vector storage
                </div>
              </div>
            </div>

            <div className="vector-index-hero-visual">
              <div className="vector-index-orbit vector-index-orbit-one" />

              <div className="vector-index-orbit vector-index-orbit-two" />

              <div className="vector-index-orbit vector-index-orbit-three" />

              <div
                className={`vector-index-core ${
                  rebuilding ? "vector-index-core-active" : ""
                }`}
              >
                <BrainCircuit size={58} />

                <span className="vector-index-core-pulse" />
              </div>

              <div className="vector-index-visual-chip vector-chip-postgres">
                <Database size={16} />
                PostgreSQL
              </div>

              <div className="vector-index-visual-chip vector-chip-embedding">
                <Layers3 size={16} />
                Embeddings
              </div>

              <div className="vector-index-visual-chip vector-chip-chroma">
                <BrainCircuit size={16} />
                ChromaDB
              </div>
            </div>
          </section>

          {/* ===============================================
              REBUILD STATUS PANEL
          =============================================== */}

          <section className="vector-index-status-panel profile-animate animation-delay-one">
            <div className="panel-heading">
              <div>
                <span>Rebuild monitoring</span>

                <h2>Vector Index Status</h2>
              </div>

              {rebuilding ? (
                <LoaderCircle size={23} className="spin-icon" />
              ) : (
                <MonitorIndexIcon />
              )}
            </div>

            <div className="vector-index-status-content">
              <div
                className={`vector-index-status-indicator ${
                  rebuilding
                    ? "vector-index-status-running"
                    : rebuildResult.message
                      ? "vector-index-status-complete"
                      : "vector-index-status-ready"
                }`}
              >
                <div className="vector-index-status-icon">
                  {rebuilding ? (
                    <LoaderCircle size={28} className="spin-icon" />
                  ) : rebuildResult.message ? (
                    <CheckCircle2 size={28} />
                  ) : (
                    <BrainCircuit size={28} />
                  )}
                </div>

                <div>
                  <span>Current Status</span>

                  <strong>
                    {rebuilding
                      ? "Rebuild in progress"
                      : rebuildResult.message
                        ? "Rebuild completed"
                        : "Ready for rebuild"}
                  </strong>

                  <small>
                    {rebuilding
                      ? "Generating embeddings and updating ChromaDB."
                      : rebuildResult.message ||
                        "The vector index service is waiting for an administrator action."}
                  </small>
                </div>
              </div>

              <div className="vector-index-timer-card">
                <Clock3 size={22} />

                <div>
                  <span>Elapsed Time</span>

                  <strong>{formatDuration(elapsedSeconds)}</strong>

                  <small>
                    {rebuilding
                      ? "The backend rebuild request is still running."
                      : "Timer begins when the rebuild starts."}
                  </small>
                </div>
              </div>
            </div>
          </section>
          {/* ===============================================
              REBUILD RESULT
          =============================================== */}

          <section className="vector-index-results profile-animate animation-delay-two">
            <article className="vector-result-card">
              <div className="vector-result-icon">
                <Database size={26} />
              </div>

              <div>
                <span>Cases Processed</span>

                <strong>{formatNumber(rebuildResult.cases_processed)}</strong>

                <small>PostgreSQL case records processed.</small>
              </div>
            </article>

            <article className="vector-result-card">
              <div className="vector-result-icon">
                <Layers3 size={26} />
              </div>

              <div>
                <span>Chunks Processed</span>

                <strong>{formatNumber(rebuildResult.chunks_processed)}</strong>

                <small>Legal chunks converted into embeddings.</small>
              </div>
            </article>

            <article className="vector-result-card">
              <div className="vector-result-icon success">
                <CheckCircle2 size={26} />
              </div>

              <div>
                <span>Vectors Created</span>

                <strong>{formatNumber(rebuildResult.vectors_created)}</strong>

                <small>Successfully stored inside ChromaDB.</small>
              </div>
            </article>

            <article className="vector-result-card">
              <div className="vector-result-icon danger">
                <AlertTriangle size={26} />
              </div>

              <div>
                <span>Failed Chunks</span>

                <strong>{formatNumber(rebuildResult.failed_chunks)}</strong>

                <small>Chunks skipped during rebuilding.</small>
              </div>
            </article>
          </section>

          {/* ===============================================
              HOW IT WORKS
          =============================================== */}

          <section className="vector-process-panel profile-animate animation-delay-three">
            <div className="panel-heading">
              <div>
                <span>Embedding workflow</span>

                <h2>Rebuild Process</h2>
              </div>

              <BrainCircuit size={24} />
            </div>

            <div className="vector-process-grid">
              <div className="vector-process-card">
                <div className="vector-process-number">01</div>

                <Database size={24} />

                <h3>Read Case Chunks</h3>

                <p>Loads every CaseChunk stored inside PostgreSQL.</p>
              </div>

              <div className="vector-process-card">
                <div className="vector-process-number">02</div>

                <Layers3 size={24} />

                <h3>Generate Embeddings</h3>

                <p>
                  Uses the Sentence Transformer model to create semantic
                  vectors.
                </p>
              </div>

              <div className="vector-process-card">
                <div className="vector-process-number">03</div>

                <BrainCircuit size={24} />

                <h3>Store in ChromaDB</h3>

                <p>
                  Every embedding is inserted into the recreated Chroma
                  collection.
                </p>
              </div>

              <div className="vector-process-card">
                <div className="vector-process-number">04</div>

                <ShieldCheck size={24} />

                <h3>Update Metadata</h3>

                <p>Saves every Chroma document ID back into PostgreSQL.</p>
              </div>
            </div>
          </section>

          {/* ===============================================
              IMPORTANT NOTICE
          =============================================== */}

          <section className="admin-vector-warning-panel profile-animate animation-delay-four">
            <div className="panel-heading">
              <div>
                <span>Administrator notice</span>

                <h2>Before Rebuilding</h2>
              </div>

              <AlertTriangle size={23} />
            </div>

            <div className="vector-warning-list">
              <div>
                <CheckCircle2 size={18} />

                <span>Existing PostgreSQL case records are never deleted.</span>
              </div>

              <div>
                <CheckCircle2 size={18} />

                <span>Uploaded Supreme Court PDF files remain unchanged.</span>
              </div>

              <div>
                <CheckCircle2 size={18} />

                <span>Only the ChromaDB collection is recreated.</span>
              </div>

              <div>
                <CheckCircle2 size={18} />

                <span>
                  New embeddings are generated from the existing legal chunks.
                </span>
              </div>

              <div>
                <AlertTriangle size={18} />

                <span>
                  Large datasets may require several minutes to finish.
                </span>
              </div>
            </div>
          </section>
          {/* ===============================================
              FOOTER
          =============================================== */}

          <footer className="profile-footer">
            <div>
              <span>Vector Index Administration Center</span>
            </div>

            <p>© 2026 LexMiner AI Adaptive Language Case Decision Miner</p>
          </footer>
        </div>
      </main>

      {/* ===============================================
          REBUILD CONFIRMATION MODAL
      =============================================== */}

      {showRebuildConfirmation && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeRebuildConfirmation();
            }
          }}
        >
          <div
            className="confirmation-modal vector-rebuild-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vector-rebuild-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={closeRebuildConfirmation}
              disabled={rebuilding}
              aria-label="Close rebuild confirmation"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon vector-rebuild-confirmation-icon">
              {rebuilding ? (
                <LoaderCircle size={31} className="spin-icon" />
              ) : (
                <BrainCircuit size={31} />
              )}
            </div>

            <span className="modal-eyebrow">Vector index confirmation</span>

            <h2 id="vector-rebuild-modal-title">
              Rebuild ChromaDB Vector Index?
            </h2>

            <p>
              This operation will recreate the ChromaDB collection and
              regenerate embeddings from every legal case chunk stored in
              PostgreSQL.
            </p>

            <div className="vector-rebuild-modal-warning">
              <AlertTriangle size={19} />

              <div>
                <strong>Search may be temporarily affected</strong>

                <span>
                  Semantic search results may be unavailable or incomplete until
                  the rebuild finishes. Do not restart FastAPI, PostgreSQL, or
                  ChromaDB during this operation.
                </span>
              </div>
            </div>

            <div className="vector-rebuild-modal-summary">
              <div>
                <Database size={18} />

                <span>PostgreSQL chunks</span>

                <strong>Source data</strong>
              </div>

              <div>
                <BrainCircuit size={18} />

                <span>ChromaDB collection</span>

                <strong>Recreated</strong>
              </div>

              <div>
                <ShieldCheck size={18} />

                <span>PDF and case records</span>

                <strong>Preserved</strong>
              </div>
            </div>

            {rebuilding && (
              <div className="vector-rebuild-running-panel">
                <div className="vector-rebuild-running-header">
                  <div>
                    <span>Rebuild status</span>

                    <strong>Generating semantic vectors</strong>
                  </div>

                  <LoaderCircle size={21} className="spin-icon" />
                </div>

                <div className="vector-rebuild-indeterminate-track">
                  <span />
                </div>

                <div className="vector-rebuild-running-time">
                  <Clock3 size={17} />

                  <span>Elapsed time</span>

                  <strong>{formatDuration(elapsedSeconds)}</strong>
                </div>

                <small>
                  The current endpoint returns only after the full rebuild is
                  complete, so this indicator shows activity rather than an
                  exact percentage.
                </small>
              </div>
            )}

            <div className="confirmation-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeRebuildConfirmation}
                disabled={rebuilding}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-confirm-button"
                onClick={() => {
                  void handleRebuildVectorIndex();
                }}
                disabled={rebuilding}
              >
                {rebuilding ? (
                  <LoaderCircle size={18} className="spin-icon" />
                ) : (
                  <RotateCcw size={18} />
                )}

                {rebuilding ? "Rebuilding Index..." : "Confirm Rebuild"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===============================================
          LOGOUT CONFIRMATION MODAL
      =============================================== */}

      {showLogoutConfirmation && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirmation(false);
            }
          }}
        >
          <div
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="vector-index-logout-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setShowLogoutConfirmation(false)}
              aria-label="Close logout confirmation"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon logout-confirmation-icon">
              <LogOut size={31} />
            </div>

            <span className="modal-eyebrow">Session confirmation</span>

            <h2 id="vector-index-logout-modal-title">Logout Administrator?</h2>

            <p>
              Are you sure you want to end your LexMiner administrator session?
            </p>

            <div className="confirmation-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={() => setShowLogoutConfirmation(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-logout-button"
                onClick={confirmLogout}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
