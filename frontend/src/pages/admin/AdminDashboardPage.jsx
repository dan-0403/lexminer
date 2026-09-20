import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Database,
  FileClock,
  FileText,
  Gauge,
  Layers3,
  LoaderCircle,
  LogOut,
  Menu,
  RefreshCcw,
  Scale,
  Search,
  ShieldCheck,
  Users,
  X,
  UploadCloud,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";
import adminPicture from "../../assets/admin-picture.png";

import { getAdminAnalytics } from "../../services/adminAnalyticsService";

import "../../styles/admin-dashboard.css";

const DEFAULT_ANALYTICS = {
  users: {
    total: 0,
    active: 0,
    inactive: 0,
    locked: 0,
  },

  visitors: {
    total_page_visits: 0,
    unique_visitors: 0,
  },

  datasets: {
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
  },

  search_index: {
    total_cases: 0,
    total_chunks: 0,
    total_vectors: 0,
  },

  recent_dataset_imports: [],
};

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg).join(", ");
  }

  if (error?.response?.status === 401) {
    return "Your administrator session has expired.";
  }

  if (error?.response?.status === 403) {
    return "You are not authorized to access the administrator dashboard.";
  }

  return error?.message || "Unable to load dashboard analytics.";
}

function normalizeStatus(status) {
  return String(status || "pending")
    .trim()
    .toLowerCase();
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-PH").format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function DashboardLoader() {
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
          <LoaderCircle size={17} className="loader-spinner" />
          Initializing administrator intelligence dashboard...
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(DEFAULT_ANALYTICS);

  const [initialLoading, setInitialLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const loadAnalytics = useCallback(
    async ({ showRefresh = false } = {}) => {
      const token = localStorage.getItem("admin_token");

      if (!token) {
        navigate("/admin/login", {
          replace: true,
        });

        return;
      }

      if (showRefresh) {
        setRefreshing(true);
      }

      setError("");

      try {
        const result = await getAdminAnalytics();

        setAnalytics({
          ...DEFAULT_ANALYTICS,
          ...result,

          users: {
            ...DEFAULT_ANALYTICS.users,
            ...(result.users || {}),
          },

          visitors: {
            ...DEFAULT_ANALYTICS.visitors,
            ...(result.visitors || {}),
          },

          datasets: {
            ...DEFAULT_ANALYTICS.datasets,
            ...(result.datasets || {}),
          },

          search_index: {
            ...DEFAULT_ANALYTICS.search_index,
            ...(result.search_index || {}),
          },

          recent_dataset_imports: result.recent_dataset_imports || [],
        });
      } catch (requestError) {
        const status = requestError?.response?.status;

        if (status === 401 || status === 403) {
          localStorage.removeItem("admin_token");

          navigate("/admin/login", {
            replace: true,
          });

          return;
        }

        setError(getErrorMessage(requestError));
      } finally {
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [navigate],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAnalytics();
    }, 1300);

    return () => window.clearTimeout(timer);
  }, [loadAnalytics]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setShowLogoutConfirmation(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const cards = useMemo(
    () => [
      {
        title: "Total Users",
        value: analytics.users.total,
        description: "Registered system accounts",
        icon: Users,
        variant: "blue",
      },
      {
        title: "Active Users",
        value: analytics.users.active,
        description: "Accounts currently enabled",
        icon: ShieldCheck,
        variant: "green",
      },
      {
        title: "Total Datasets",
        value: analytics.datasets.total,
        description: "Uploaded legal documents",
        icon: Database,
        variant: "cyan",
      },
      {
        title: "Completed Datasets",
        value: analytics.datasets.completed,
        description: "Successfully processed datasets",
        icon: CheckCircle2,
        variant: "green",
      },
      {
        title: "Pending Datasets",
        value: analytics.datasets.pending,
        description: "Waiting for processing",
        icon: FileClock,
        variant: "yellow",
      },
      {
        title: "Failed Datasets",
        value: analytics.datasets.failed,
        description: "Datasets requiring attention",
        icon: AlertTriangle,
        variant: "red",
      },
      {
        title: "Supreme Court Cases",
        value: analytics.search_index.total_cases,
        description: "Cases available for research",
        icon: Scale,
        variant: "purple",
      },
      {
        title: "Case Chunks",
        value: analytics.search_index.total_chunks,
        description: "Processed semantic passages",
        icon: Layers3,
        variant: "cyan",
      },
      {
        title: "Indexed Vectors",
        value: analytics.search_index.total_vectors,
        description: "Embeddings stored in ChromaDB",
        icon: BrainCircuit,
        variant: "purple",
      },
    ],
    [analytics],
  );

  const datasetChartData = useMemo(
    () => [
      {
        name: "Completed",
        value: analytics.datasets.completed,
        color: "#39d98a",
      },
      {
        name: "Pending",
        value: analytics.datasets.pending,
        color: "#f6c453",
      },
      {
        name: "Failed",
        value: analytics.datasets.failed,
        color: "#ff647c",
      },
    ],
    [analytics],
  );

  const indexChartData = useMemo(
    () => [
      {
        name: "Cases",
        value: analytics.search_index.total_cases,
      },
      {
        name: "Chunks",
        value: analytics.search_index.total_chunks,
      },
      {
        name: "Vectors",
        value: analytics.search_index.total_vectors,
      },
    ],
    [analytics],
  );

  const recentImports = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase();

    const imports = analytics.recent_dataset_imports || [];

    if (!normalizedSearch) {
      return imports;
    }

    return imports.filter((dataset) => {
      const filename = String(
        dataset.filename || dataset.original_filename || "",
      ).toLowerCase();

      const status = String(
        dataset.import_status || dataset.status || "",
      ).toLowerCase();

      return (
        filename.includes(normalizedSearch) || status.includes(normalizedSearch)
      );
    });
  }, [analytics.recent_dataset_imports, searchValue]);

  function confirmLogout() {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_user");

    navigate("/authentication", {
      replace: true,
    });
  }
  if (initialLoading) {
    return <DashboardLoader />;
  }

  return (
    <div
      className={`admin-dashboard ${
        sidebarCollapsed ? "sidebar-is-collapsed" : ""
      }`}
    >
      <div className="dashboard-background">
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
            className="sidebar-link active"
            title="Dashboard"
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
            className="sidebar-link"
            title="Vector Index"
            onClick={() => navigate("/admin/vector-index")}
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
            <ChevronRight
              size={17}
              style={{ transform: "translateY(-10px)" }}
            />
          ) : (
            <ChevronLeft size={17} />
          )}
        </button>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
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

              <h1>Dashboard</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-live-status">
              <span />
              Live
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw size={18} className={refreshing ? "spin-icon" : ""} />

              <span>{refreshing ? "Refreshing" : "Refresh"}</span>
            </button>

            <button
              type="button"
              className="admin-account-button"
              onClick={() => navigate("/admin/profile")}
            >
              <div>
                <img
                  src={adminPicture}
                  alt="LexMiner logo"
                  className="admin-avatar"
                />
              </div>

              <div>
                <strong>Administrator</strong>

                <span>System Admin</span>
              </div>
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {error && (
            <div className="dashboard-alert error-alert">
              <AlertTriangle size={20} />

              <span>{error}</span>

              <button type="button" onClick={() => setError("")}>
                <X size={18} />
              </button>
            </div>
          )}

          {notice && (
            <div className="dashboard-alert success-alert">
              <CheckCircle2 size={20} />

              <span>{notice}</span>

              <button type="button" onClick={() => setNotice("")}>
                <X size={18} />
              </button>
            </div>
          )}

          <section className="dashboard-hero">
            <div className="hero-copy">
              <div className="hero-label">
                <Activity size={16} />
                AI-powered legal research administration
              </div>

              <h2>
                Welcome back,
                <span> Administrator</span>
              </h2>

              <p>
                Monitor LexMiner datasets, users, Supreme Court cases, semantic
                chunks, and indexed legal vectors from one secure intelligence
                console.
              </p>

              <div className="hero-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => navigate("/admin/datasets")}
                >
                  <Database size={18} />
                  Manage Datasets
                </button>

                <button
                  type="button"
                  className="secondary-action"
                  onClick={() => navigate("/admin/vector-index")}
                >
                  <BrainCircuit size={18} />
                  {!sidebarCollapsed && <span>Vector Index</span>}
                </button>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-orbit hero-orbit-one" />
              <div className="hero-orbit hero-orbit-two" />

              <div className="hero-logo-container">
                <img src={lexminerLogo} alt="" />
              </div>

              <div className="hero-data-point point-one">
                <span />
                Semantic search
              </div>

              <div className="hero-data-point point-two">
                <span />
                Vector database
              </div>

              <div className="hero-data-point point-three">
                <span />
                Legal AI
              </div>
            </div>
          </section>

          <section className="section-block">
            <div className="section-heading">
              <div>
                <span>Real-time overview</span>

                <h2>System Analytics</h2>
              </div>

              <div className="section-status">
                <span />
                Analytics synchronized
              </div>
            </div>

            <div className="analytics-grid">
              {cards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <article
                    className={`analytics-card analytics-${card.variant}`}
                    key={card.title}
                    style={{
                      "--animation-delay": `${index * 70}ms`,
                    }}
                  >
                    <div className="analytics-card-glow" />

                    <div className="analytics-card-header">
                      <div className="analytics-icon">
                        <Icon size={22} />
                      </div>

                      <Activity size={17} className="analytics-activity-icon" />
                    </div>

                    <strong className="analytics-value">
                      {formatNumber(card.value)}
                    </strong>

                    <h3>{card.title}</h3>

                    <p>{card.description}</p>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="dashboard-charts-grid">
            <article className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span>Processing health</span>

                  <h2>Dataset Status</h2>
                </div>

                <Database size={21} />
              </div>

              <div className="dataset-chart-layout">
                <div className="donut-chart-wrapper">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={datasetChartData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={72}
                        outerRadius={99}
                        paddingAngle={5}
                        stroke="none"
                      >
                        {datasetChartData.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>

                      <Tooltip
                        contentStyle={{
                          background: "#0a1d33",
                          border: "1px solid rgba(94, 208, 255, 0.2)",
                          borderRadius: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="donut-center">
                    <strong>{formatNumber(analytics.datasets.total)}</strong>

                    <span>Total</span>
                  </div>
                </div>

                <div className="chart-legend">
                  {datasetChartData.map((item) => (
                    <div className="legend-item" key={item.name}>
                      <span
                        className="legend-color"
                        style={{
                          backgroundColor: item.color,
                        }}
                      />

                      <div>
                        <span>{item.name}</span>

                        <strong>{formatNumber(item.value)}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </article>

            <article className="dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span>Semantic database</span>

                  <h2>Search Index</h2>
                </div>

                <BrainCircuit size={21} />
              </div>

              <div className="bar-chart-container">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={indexChartData}
                    margin={{
                      top: 20,
                      right: 10,
                      left: -10,
                      bottom: 0,
                    }}
                  >
                    <defs>
                      <linearGradient
                        id="lexminerBar"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#5ed0ff" />

                        <stop offset="100%" stopColor="#1769aa" />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="rgba(158, 196, 224, 0.1)"
                    />

                    <XAxis
                      dataKey="name"
                      tick={{
                        fill: "#8ca8bf",
                        fontSize: 12,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <YAxis
                      tick={{
                        fill: "#8ca8bf",
                        fontSize: 12,
                      }}
                      axisLine={false}
                      tickLine={false}
                    />

                    <Tooltip
                      cursor={{
                        fill: "rgba(83, 196, 255, 0.05)",
                      }}
                      contentStyle={{
                        background: "#0a1d33",
                        border: "1px solid rgba(94, 208, 255, 0.2)",
                        borderRadius: "12px",
                      }}
                    />

                    <Bar
                      dataKey="value"
                      fill="url(#lexminerBar)"
                      radius={[8, 8, 2, 2]}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="dashboard-panel recent-imports-panel">
            <div className="panel-heading imports-heading">
              <div>
                <span>Dataset activity</span>

                <h2>Recent Dataset Imports</h2>
              </div>

              <div className="imports-actions">
                <div className="imports-search">
                  <Search size={17} />

                  <input
                    type="search"
                    placeholder="Search recent imports"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/admin/datasets")}
                >
                  View all
                </button>
              </div>
            </div>

            <div className="imports-table-wrapper">
              <table className="imports-table">
                <thead>
                  <tr>
                    <th>Dataset</th>
                    <th>Status</th>
                    <th>Imported</th>
                    <th>Dataset ID</th>
                  </tr>
                </thead>

                <tbody>
                  {recentImports.length > 0 ? (
                    recentImports.map((dataset, index) => {
                      const status = normalizeStatus(
                        dataset.import_status || dataset.status,
                      );

                      const filename =
                        dataset.filename ||
                        dataset.original_filename ||
                        `Dataset ${index + 1}`;

                      const date =
                        dataset.imported_at ||
                        dataset.created_at ||
                        dataset.updated_at;

                      const id = dataset.dataset_id || dataset.id || "—";

                      return (
                        <tr key={`${id}-${index}`}>
                          <td>
                            <div className="dataset-cell">
                              <div className="dataset-file-icon">
                                <FileText size={19} />
                              </div>

                              <div>
                                <strong>{filename}</strong>

                                <span>Supreme Court decision dataset</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className={`status-badge status-${status}`}>
                              <span />

                              {status}
                            </span>
                          </td>

                          <td>{formatDate(date)}</td>

                          <td>
                            <code>{id}</code>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="empty-imports">
                        <Database size={35} />

                        <strong>No dataset imports found</strong>

                        <span>
                          Recently imported datasets will appear here.
                        </span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="dashboard-footer">
            <div>
              <span>System Administrator Console</span>
            </div>
            <p>
              © 2026 LexMiner AI Adaptive Language Legal Arguments Mining System
            </p>
          </footer>
        </div>
      </main>

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
            aria-labelledby="logout-modal-title"
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

            <h2 id="logout-modal-title">Logout Administrator?</h2>

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
