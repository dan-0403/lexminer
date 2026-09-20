import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Database,
  Eye,
  Filter,
  Gauge,
  Globe2,
  KeyRound,
  Laptop2,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  Menu,
  MonitorCheck,
  RefreshCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  UnlockKeyhole,
  UploadCloud,
  UserCheck,
  UserRound,
  UserRoundCheck,
  UserRoundX,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";
import adminPicture from "../../assets/admin-picture.png";

import { getAdminProfile } from "../../services/adminProfileService";

import {
  activateRegisteredUser,
  deactivateRegisteredUser,
  deleteRegisteredUser,
  getAdminUserManagementErrorMessage,
  getAdminUserManagementSummary,
  getGuestVisitorLogs,
  getRegisteredUserDetail,
  getRegisteredUsers,
  lockRegisteredUser,
  unlockRegisteredUser,
} from "../../services/adminUserManagementService";

import "../../styles/admin-profile.css";
import "../../styles/admin-user-management.css";

/* =====================================================
   DEFAULT ADMIN PROFILE
===================================================== */

const DEFAULT_PROFILE = {
  id: null,

  first_name: "",

  last_name: "",

  email: "",

  profile_picture: null,

  role: "",

  auth_provider: "",

  is_active: false,

  is_verified: false,

  is_locked: false,
};

/* =====================================================
   DEFAULT MANAGEMENT SUMMARY
===================================================== */

const DEFAULT_MANAGEMENT_SUMMARY = {
  registered_users: {
    total: 0,

    active: 0,

    inactive: 0,

    locked: 0,

    verified: 0,

    local_accounts: 0,

    google_accounts: 0,
  },

  guest_visitors: {
    total_guest_visits: 0,

    unique_guest_visitors: 0,

    today_guest_visits: 0,

    today_unique_guest_visitors: 0,

    top_pages: [],

    top_browsers: [],

    top_operating_systems: [],
  },
};

/* =====================================================
   DEFAULT REGISTERED USER PAGE
===================================================== */

const DEFAULT_REGISTERED_USER_PAGE = {
  total: 0,

  skip: 0,

  limit: 25,

  users: [],
};

/* =====================================================
   DEFAULT GUEST LOG PAGE
===================================================== */

const DEFAULT_GUEST_LOG_PAGE = {
  total: 0,

  skip: 0,

  limit: 25,

  logs: [],
};

/* =====================================================
   DEFAULT USER FILTERS
===================================================== */

const DEFAULT_USER_FILTERS = {
  search: "",

  isActive: "",

  isLocked: "",

  isVerified: "",

  authProvider: "",
};

/* =====================================================
   DEFAULT GUEST LOG FILTERS
===================================================== */

const DEFAULT_GUEST_FILTERS = {
  sessionId: "",

  browser: "",

  operatingSystem: "",

  visitedPage: "",

  dateFrom: "",

  dateTo: "",
};

/* =====================================================
   ACTION MODAL DEFAULT
===================================================== */

const DEFAULT_ACTION_MODAL = {
  open: false,

  type: "",

  user: null,
};

/* =====================================================
   USER DETAIL DEFAULT
===================================================== */

const DEFAULT_USER_DETAIL = {
  open: false,

  loading: false,

  user: null,
};

/* =====================================================
   FORMAT NUMBER
===================================================== */

function formatNumber(value) {
  return new Intl.NumberFormat("en-PH").format(Number(value) || 0);
}

/* =====================================================
   FORMAT DATE
===================================================== */

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

/* =====================================================
   FORMAT SHORT DATE
===================================================== */

function formatShortDate(value) {
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
  }).format(date);
}

/* =====================================================
   FORMAT READABLE VALUE
===================================================== */

function formatReadableValue(value) {
  if (value === null || value === undefined || value === "") {
    return "Not available";
  }

  return String(value)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* =====================================================
   FORMAT USER NAME
===================================================== */

function formatUserName(user) {
  const name = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user?.email || "Registered User";
}

/* =====================================================
   GET USER INITIALS
===================================================== */

function getUserInitials(user) {
  const values = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((value) => String(value).trim().charAt(0).toUpperCase());

  if (values.length > 0) {
    return values.slice(0, 2).join("");
  }

  return String(user?.email || "U")
    .charAt(0)
    .toUpperCase();
}

/* =====================================================
   NORMALIZE STATUS
===================================================== */

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

/* =====================================================
   PAGE LOADER
===================================================== */

function AdminUserManagementLoader() {
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
          Loading user management center...
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */

function UserStatusBadge({ type, children }) {
  return (
    <span
      className={`user-management-status-badge user-management-status-${type}`}
    >
      {children}
    </span>
  );
}

/* =====================================================
   MAIN PAGE
===================================================== */

export default function AdminUserManagementPage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const [managementSummary, setManagementSummary] = useState(
    DEFAULT_MANAGEMENT_SUMMARY,
  );

  const [registeredUserPage, setRegisteredUserPage] = useState(
    DEFAULT_REGISTERED_USER_PAGE,
  );

  const [guestLogPage, setGuestLogPage] = useState(DEFAULT_GUEST_LOG_PAGE);

  const [initialLoading, setInitialLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [usersLoading, setUsersLoading] = useState(false);

  const [guestLogsLoading, setGuestLogsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [activeTab, setActiveTab] = useState("users");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const [actionModal, setActionModal] = useState(DEFAULT_ACTION_MODAL);

  const [userDetail, setUserDetail] = useState(DEFAULT_USER_DETAIL);

  const [userFilters, setUserFilters] = useState(DEFAULT_USER_FILTERS);

  const [appliedUserFilters, setAppliedUserFilters] =
    useState(DEFAULT_USER_FILTERS);

  const [guestFilters, setGuestFilters] = useState(DEFAULT_GUEST_FILTERS);

  const [appliedGuestFilters, setAppliedGuestFilters] = useState(
    DEFAULT_GUEST_FILTERS,
  );

  const [userCurrentPage, setUserCurrentPage] = useState(1);

  const [userPageSize, setUserPageSize] = useState(25);

  const [guestCurrentPage, setGuestCurrentPage] = useState(1);

  const [guestPageSize, setGuestPageSize] = useState(25);

  /* ===================================================
     ADMIN PROFILE VALUES
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
     PAGINATION VALUES
  =================================================== */

  const userTotalPages = useMemo(() => {
    return Math.max(
      Math.ceil(Number(registeredUserPage.total) / Number(userPageSize)),
      1,
    );
  }, [registeredUserPage.total, userPageSize]);

  const guestTotalPages = useMemo(() => {
    return Math.max(
      Math.ceil(Number(guestLogPage.total) / Number(guestPageSize)),
      1,
    );
  }, [guestLogPage.total, guestPageSize]);

  /* ===================================================
     ACTIVE FILTER COUNTS
  =================================================== */

  const activeUserFilterCount = useMemo(() => {
    return Object.values(appliedUserFilters).filter(
      (value) => value !== "" && value !== null && value !== undefined,
    ).length;
  }, [appliedUserFilters]);

  const activeGuestFilterCount = useMemo(() => {
    return Object.values(appliedGuestFilters).filter(
      (value) => value !== "" && value !== null && value !== undefined,
    ).length;
  }, [appliedGuestFilters]);
  /* ===================================================
     LOAD ADMIN PROFILE
  =================================================== */

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });

      return;
    }

    try {
      const result = await getAdminProfile();

      setProfile(result);
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401 || status === 403) {
        localStorage.removeItem("admin_token");

        localStorage.removeItem("admin_user");

        navigate("/admin/login", {
          replace: true,
        });

        return;
      }

      setError(getAdminUserManagementErrorMessage(error));
    }
  }, [navigate]);

  /* ===================================================
     LOAD SUMMARY
  =================================================== */

  const loadSummary = useCallback(async () => {
    try {
      const result = await getAdminUserManagementSummary();

      setManagementSummary(result);
    } catch (error) {
      setError(getAdminUserManagementErrorMessage(error));
    }
  }, []);

  /* ===================================================
     LOAD USERS
  =================================================== */

  const loadUsers = useCallback(
    async ({
      page = userCurrentPage,
      size = userPageSize,
      filters = appliedUserFilters,
      showLoader = false,
    } = {}) => {
      if (showLoader) {
        setUsersLoading(true);
      }

      try {
        const response = await getRegisteredUsers({
          page,
          pageSize: size,

          search: filters.search,

          isActive: filters.isActive,

          isLocked: filters.isLocked,

          isVerified: filters.isVerified,

          authProvider: filters.authProvider,
        });

        setRegisteredUserPage(response);
      } catch (error) {
        setError(getAdminUserManagementErrorMessage(error));
      } finally {
        setUsersLoading(false);
      }
    },
    [appliedUserFilters, userCurrentPage, userPageSize],
  );

  /* ===================================================
     LOAD GUEST LOGS
  =================================================== */

  const loadGuestLogs = useCallback(
    async ({
      page = guestCurrentPage,
      size = guestPageSize,
      filters = appliedGuestFilters,
      showLoader = false,
    } = {}) => {
      if (showLoader) {
        setGuestLogsLoading(true);
      }

      try {
        const response = await getGuestVisitorLogs({
          page,
          pageSize: size,

          sessionId: filters.sessionId,

          browser: filters.browser,

          operatingSystem: filters.operatingSystem,

          visitedPage: filters.visitedPage,

          dateFrom: filters.dateFrom,

          dateTo: filters.dateTo,
        });

        setGuestLogPage(response);
      } catch (error) {
        setError(getAdminUserManagementErrorMessage(error));
      } finally {
        setGuestLogsLoading(false);
      }
    },
    [appliedGuestFilters, guestCurrentPage, guestPageSize],
  );

  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {
    async function initialize() {
      setInitialLoading(true);

      await Promise.all([
        loadProfile(),
        loadSummary(),
        loadUsers({
          showLoader: false,
        }),
        loadGuestLogs({
          showLoader: false,
        }),
      ]);

      setInitialLoading(false);
    }

    initialize();
  }, [loadProfile, loadSummary, loadUsers, loadGuestLogs]);

  /* ===================================================
     AUTO CLEAR SUCCESS
  =================================================== */

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 4500);

    return () => clearTimeout(timer);
  }, [notice]);

  /* ===================================================
     AUTO CLEAR ERROR
  =================================================== */

  useEffect(() => {
    if (!error) {
      return;
    }

    const timer = window.setTimeout(() => setError(""), 6000);

    return () => clearTimeout(timer);
  }, [error]);

  /* ===================================================
     REFRESH EVERYTHING
  =================================================== */

  async function refreshPage() {
    setRefreshing(true);

    await Promise.all([
      loadSummary(),

      loadUsers({
        showLoader: true,
      }),

      loadGuestLogs({
        showLoader: true,
      }),
    ]);

    setRefreshing(false);
  }

  /* ===================================================
     USER FILTER CHANGE
  =================================================== */

  function handleUserFilterChange(event) {
    const { name, value } = event.target;

    setUserFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /* ===================================================
     APPLY USER FILTERS
  =================================================== */

  function applyUserFilters() {
    setAppliedUserFilters(userFilters);

    setUserCurrentPage(1);

    loadUsers({
      page: 1,
      filters: userFilters,
      showLoader: true,
    });
  }

  /* ===================================================
     RESET USER FILTERS
  =================================================== */

  function clearUserFilters() {
    setUserFilters(DEFAULT_USER_FILTERS);

    setAppliedUserFilters(DEFAULT_USER_FILTERS);

    setUserCurrentPage(1);

    loadUsers({
      page: 1,
      filters: DEFAULT_USER_FILTERS,
      showLoader: true,
    });
  }

  /* ===================================================
     GUEST FILTER CHANGE
  =================================================== */

  function handleGuestFilterChange(event) {
    const { name, value } = event.target;

    setGuestFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /* ===================================================
     APPLY GUEST FILTERS
  =================================================== */

  function applyGuestFilters() {
    setAppliedGuestFilters(guestFilters);

    setGuestCurrentPage(1);

    loadGuestLogs({
      page: 1,
      filters: guestFilters,
      showLoader: true,
    });
  }

  /* ===================================================
     CLEAR GUEST FILTERS
  =================================================== */

  function clearGuestFilters() {
    setGuestFilters(DEFAULT_GUEST_FILTERS);

    setAppliedGuestFilters(DEFAULT_GUEST_FILTERS);

    setGuestCurrentPage(1);

    loadGuestLogs({
      page: 1,
      filters: DEFAULT_GUEST_FILTERS,
      showLoader: true,
    });
  }
  /* ===================================================
     USER PAGE CHANGE
  =================================================== */

  function changeUserPage(nextPage) {
    const safePage = Math.min(
      Math.max(Number(nextPage) || 1, 1),
      userTotalPages,
    );

    setUserCurrentPage(safePage);

    void loadUsers({
      page: safePage,
      size: userPageSize,
      filters: appliedUserFilters,
      showLoader: true,
    });
  }

  /* ===================================================
     USER PAGE SIZE CHANGE
  =================================================== */

  function changeUserPageSize(event) {
    const nextSize = Number(event.target.value) || 25;

    setUserPageSize(nextSize);

    setUserCurrentPage(1);

    void loadUsers({
      page: 1,
      size: nextSize,
      filters: appliedUserFilters,
      showLoader: true,
    });
  }

  /* ===================================================
     GUEST PAGE CHANGE
  =================================================== */

  function changeGuestPage(nextPage) {
    const safePage = Math.min(
      Math.max(Number(nextPage) || 1, 1),
      guestTotalPages,
    );

    setGuestCurrentPage(safePage);

    void loadGuestLogs({
      page: safePage,
      size: guestPageSize,
      filters: appliedGuestFilters,
      showLoader: true,
    });
  }

  /* ===================================================
     GUEST PAGE SIZE CHANGE
  =================================================== */

  function changeGuestPageSize(event) {
    const nextSize = Number(event.target.value) || 25;

    setGuestPageSize(nextSize);

    setGuestCurrentPage(1);

    void loadGuestLogs({
      page: 1,
      size: nextSize,
      filters: appliedGuestFilters,
      showLoader: true,
    });
  }

  /* ===================================================
     OPEN USER DETAIL
  =================================================== */

  async function openUserDetail(user) {
    if (!user?.id) {
      return;
    }

    setUserDetail({
      open: true,
      loading: true,
      user,
    });

    setError("");

    try {
      const result = await getRegisteredUserDetail(user.id);

      setUserDetail({
        open: true,
        loading: false,
        user: result,
      });
    } catch (requestError) {
      setUserDetail(DEFAULT_USER_DETAIL);

      setError(getAdminUserManagementErrorMessage(requestError));
    }
  }

  /* ===================================================
     CLOSE USER DETAIL
  =================================================== */

  function closeUserDetail() {
    if (actionLoading) {
      return;
    }

    setUserDetail(DEFAULT_USER_DETAIL);
  }

  /* ===================================================
     OPEN ACTION MODAL
  =================================================== */

  function openUserAction(type, user) {
    if (!type || !user?.id) {
      return;
    }

    setError("");
    setNotice("");

    setActionModal({
      open: true,
      type,
      user,
    });
  }

  /* ===================================================
     CLOSE ACTION MODAL
  =================================================== */

  function closeUserAction() {
    if (actionLoading) {
      return;
    }

    setActionModal(DEFAULT_ACTION_MODAL);
  }

  /* ===================================================
     ACTION LABEL
  =================================================== */

  const actionLabel = useMemo(() => {
    switch (normalizeStatus(actionModal.type)) {
      case "ACTIVATE":
        return "Activate User";

      case "DEACTIVATE":
        return "Deactivate User";

      case "LOCK":
        return "Lock User";

      case "UNLOCK":
        return "Unlock User";

      case "DELETE":
        return "Delete User";

      default:
        return "Confirm Action";
    }
  }, [actionModal.type]);

  /* ===================================================
     ACTION DESCRIPTION
  =================================================== */

  const actionDescription = useMemo(() => {
    const userName = formatUserName(actionModal.user);

    switch (normalizeStatus(actionModal.type)) {
      case "ACTIVATE":
        return `${userName} will regain access to their registered account.`;

      case "DEACTIVATE":
        return `${userName} will no longer be able to use their account until it is activated again.`;

      case "LOCK":
        return `${userName} will be prevented from signing in until an administrator unlocks the account.`;

      case "UNLOCK":
        return `${userName} will be unlocked and their failed login attempts will be reset.`;

      case "DELETE":
        return `${userName} will be soft-deleted, deactivated, and hidden from the registered-user list.`;

      default:
        return "Confirm the selected account action.";
    }
  }, [actionModal.type, actionModal.user]);

  /* ===================================================
     EXECUTE USER ACTION
  =================================================== */

  async function confirmUserAction() {
    const userId = actionModal.user?.id;

    const actionType = normalizeStatus(actionModal.type);

    if (!userId || !actionType) {
      return;
    }

    setActionLoading(true);
    setError("");
    setNotice("");

    try {
      let result = null;

      switch (actionType) {
        case "ACTIVATE":
          result = await activateRegisteredUser(userId);
          break;

        case "DEACTIVATE":
          result = await deactivateRegisteredUser(userId);
          break;

        case "LOCK":
          result = await lockRegisteredUser(userId);
          break;

        case "UNLOCK":
          result = await unlockRegisteredUser(userId);
          break;

        case "DELETE":
          result = await deleteRegisteredUser(userId);
          break;

        default:
          throw new Error("Unsupported registered user action.");
      }

      setNotice(result?.message || "Registered user updated successfully.");

      setActionModal(DEFAULT_ACTION_MODAL);

      if (userDetail.open && userDetail.user?.id === userId) {
        setUserDetail(DEFAULT_USER_DETAIL);
      }

      const nextUserPage =
        actionType === "DELETE" &&
        registeredUserPage.users.length === 1 &&
        userCurrentPage > 1
          ? userCurrentPage - 1
          : userCurrentPage;

      setUserCurrentPage(nextUserPage);

      await Promise.all([
        loadSummary(),

        loadUsers({
          page: nextUserPage,
          size: userPageSize,
          filters: appliedUserFilters,
          showLoader: true,
        }),
      ]);
    } catch (requestError) {
      setError(getAdminUserManagementErrorMessage(requestError));
    } finally {
      setActionLoading(false);
    }
  }

  /* ===================================================
     CHANGE ACTIVE TAB
  =================================================== */

  function changeActiveTab(nextTab) {
    if (nextTab !== "users" && nextTab !== "guests") {
      return;
    }

    setActiveTab(nextTab);
  }

  /* ===================================================
     ESCAPE HANDLER
  =================================================== */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (actionLoading) {
        return;
      }

      setActionModal(DEFAULT_ACTION_MODAL);

      setUserDetail(DEFAULT_USER_DETAIL);

      setShowLogoutConfirmation(false);

      setMobileSidebarOpen(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [actionLoading]);

  /* ===================================================
     LOGOUT
  =================================================== */

  function confirmLogout() {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_access_token");

    localStorage.removeItem("admin_refresh_token");

    localStorage.removeItem("admin_user");

    navigate("/authentication", {
      replace: true,
    });
  }

  /* ===================================================
     TABLE RANGE VALUES
  =================================================== */

  const userRangeStart =
    registeredUserPage.total > 0 ? registeredUserPage.skip + 1 : 0;

  const userRangeEnd = Math.min(
    registeredUserPage.skip + registeredUserPage.users.length,
    registeredUserPage.total,
  );

  const guestRangeStart = guestLogPage.total > 0 ? guestLogPage.skip + 1 : 0;

  const guestRangeEnd = Math.min(
    guestLogPage.skip + guestLogPage.logs.length,
    guestLogPage.total,
  );

  /* ===================================================
     LOADER
  =================================================== */

  if (initialLoading) {
    return <AdminUserManagementLoader />;
  }

  /* ===================================================
     PAGE
  =================================================== */

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
            className="sidebar-link active"
            title="User Management"
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

              <h1>User Management</h1>
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
              onClick={() => {
                void refreshPage();
              }}
              disabled={refreshing}
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
            CONTENT
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
              HERO
          =============================================== */}

          <section className="user-management-hero profile-animate">
            <div className="user-management-hero-copy">
              <div className="hero-label">
                <ShieldCheck size={16} />
                Account and visitor monitoring
              </div>

              <h2>
                Manage LexMiner
                <span> registered users</span> and guest activity
              </h2>

              <p>
                Review registered-user accounts, control access status, monitor
                security conditions, and inspect anonymous visitor activity from
                one protected administrator center.
              </p>

              <div className="user-management-hero-actions">
                <button
                  type="button"
                  className={`user-management-tab-button ${
                    activeTab === "users" ? "active" : ""
                  }`}
                  onClick={() => changeActiveTab("users")}
                >
                  <Users size={18} />
                  Registered Users
                </button>

                <button
                  type="button"
                  className={`user-management-tab-button ${
                    activeTab === "guests" ? "active" : ""
                  }`}
                  onClick={() => changeActiveTab("guests")}
                >
                  <Globe2 size={18} />
                  Guest Visitor Logs
                </button>
              </div>

              <div className="user-management-hero-features">
                <div>
                  <UserRoundCheck size={17} />
                  Registered accounts
                </div>

                <div>
                  <ShieldAlert size={17} />
                  Lock monitoring
                </div>

                <div>
                  <MonitorCheck size={17} />
                  Visitor analytics
                </div>
              </div>
            </div>

            <div className="user-management-hero-visual">
              <div className="user-management-orbit user-management-orbit-one" />

              <div className="user-management-orbit user-management-orbit-two" />

              <div className="user-management-hero-core">
                <Users size={58} />

                <span />
              </div>

              <div className="user-management-visual-chip user-chip-users">
                <UserRound size={16} />
                Registered
              </div>

              <div className="user-management-visual-chip user-chip-security">
                <ShieldCheck size={16} />
                Protected
              </div>

              <div className="user-management-visual-chip user-chip-visitors">
                <Globe2 size={16} />
                Visitors
              </div>
            </div>
          </section>

          {/* ===============================================
              SUMMARY CARDS
          =============================================== */}

          <section className="user-management-summary-grid profile-animate animation-delay-one">
            <article className="user-summary-card">
              <div className="user-summary-card-icon">
                <Users size={25} />
              </div>

              <div>
                <span>Registered Users</span>

                <strong>
                  {formatNumber(managementSummary.registered_users.total)}
                </strong>

                <small>Active and inactive user accounts.</small>
              </div>
            </article>

            <article className="user-summary-card">
              <div className="user-summary-card-icon success">
                <UserCheck size={25} />
              </div>

              <div>
                <span>Active Accounts</span>

                <strong>
                  {formatNumber(managementSummary.registered_users.active)}
                </strong>

                <small>Enabled registered-user accounts.</small>
              </div>
            </article>

            <article className="user-summary-card">
              <div className="user-summary-card-icon warning">
                <LockKeyhole size={25} />
              </div>

              <div>
                <span>Locked Accounts</span>

                <strong>
                  {formatNumber(managementSummary.registered_users.locked)}
                </strong>

                <small>Accounts blocked from signing in.</small>
              </div>
            </article>

            <article className="user-summary-card">
              <div className="user-summary-card-icon visitor">
                <Globe2 size={25} />
              </div>

              <div>
                <span>Unique Guests</span>

                <strong>
                  {formatNumber(
                    managementSummary.guest_visitors.unique_guest_visitors,
                  )}
                </strong>

                <small>Distinct anonymous visitor sessions.</small>
              </div>
            </article>
          </section>
          {/* ===============================================
              REGISTERED USERS TAB
          =============================================== */}

          {activeTab === "users" && (
            <section className="user-management-panel profile-animate animation-delay-two">
              <div className="panel-heading">
                <div>
                  <span>Registered account registry</span>

                  <h2>Registered Users</h2>
                </div>

                <Users size={23} />
              </div>

              {/* =========================================
                  USER FILTERS
              ========================================= */}

              <div className="user-management-filter-panel">
                <div className="user-management-filter-heading">
                  <div>
                    <Filter size={18} />

                    <div>
                      <strong>User Filters</strong>

                      <span>Search and filter registered accounts.</span>
                    </div>
                  </div>

                  {activeUserFilterCount > 0 && (
                    <span className="user-management-filter-count">
                      {activeUserFilterCount} active
                    </span>
                  )}
                </div>

                <div className="user-management-filter-grid">
                  <div className="user-management-field user-management-search-field">
                    <label htmlFor="user-search">Search</label>

                    <div className="user-management-input-wrapper">
                      <Search size={17} />

                      <input
                        id="user-search"
                        name="search"
                        type="search"
                        value={userFilters.search}
                        onChange={handleUserFilterChange}
                        placeholder="Name or email address"
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            applyUserFilters();
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="user-active-filter">Account Status</label>

                    <select
                      id="user-active-filter"
                      name="isActive"
                      value={userFilters.isActive}
                      onChange={handleUserFilterChange}
                    >
                      <option value="">All statuses</option>

                      <option value="true">Active</option>

                      <option value="false">Inactive</option>
                    </select>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="user-lock-filter">Lock Status</label>

                    <select
                      id="user-lock-filter"
                      name="isLocked"
                      value={userFilters.isLocked}
                      onChange={handleUserFilterChange}
                    >
                      <option value="">All lock states</option>

                      <option value="true">Locked</option>

                      <option value="false">Unlocked</option>
                    </select>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="user-verified-filter">Verification</label>

                    <select
                      id="user-verified-filter"
                      name="isVerified"
                      value={userFilters.isVerified}
                      onChange={handleUserFilterChange}
                    >
                      <option value="">All verification states</option>

                      <option value="true">Verified</option>

                      <option value="false">Unverified</option>
                    </select>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="user-provider-filter">Auth Provider</label>

                    <select
                      id="user-provider-filter"
                      name="authProvider"
                      value={userFilters.authProvider}
                      onChange={handleUserFilterChange}
                    >
                      <option value="">All providers</option>

                      <option value="LOCAL">Local</option>

                      <option value="GOOGLE">Google</option>
                    </select>
                  </div>
                </div>

                <div className="user-management-filter-actions">
                  <button
                    type="button"
                    className="user-management-reset-button"
                    onClick={clearUserFilters}
                    disabled={usersLoading}
                  >
                    <RefreshCcw size={17} />
                    Reset
                  </button>

                  <button
                    type="button"
                    className="user-management-apply-button"
                    onClick={applyUserFilters}
                    disabled={usersLoading}
                  >
                    {usersLoading ? (
                      <LoaderCircle size={17} className="spin-icon" />
                    ) : (
                      <Filter size={17} />
                    )}
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* =========================================
                  USER REGISTRY HEADER
              ========================================= */}

              <div className="user-management-table-toolbar">
                <div>
                  <span>Showing</span>

                  <strong>
                    {formatNumber(userRangeStart)}
                    {" – "}
                    {formatNumber(userRangeEnd)}
                  </strong>

                  <span>of</span>

                  <strong>{formatNumber(registeredUserPage.total)}</strong>

                  <span>registered users</span>
                </div>

                <div className="user-management-page-size">
                  <label htmlFor="user-page-size">Rows per page</label>

                  <select
                    id="user-page-size"
                    value={userPageSize}
                    onChange={changeUserPageSize}
                    disabled={usersLoading}
                  >
                    <option value={10}>10</option>

                    <option value={25}>25</option>

                    <option value={50}>50</option>

                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* =========================================
                  USER TABLE
              ========================================= */}

              <div className="user-management-table-wrapper">
                {usersLoading && (
                  <div className="user-management-table-loader">
                    <LoaderCircle size={24} className="spin-icon" />

                    <span>Loading registered users...</span>
                  </div>
                )}

                {!usersLoading && registeredUserPage.users.length === 0 && (
                  <div className="user-management-empty-state">
                    <UserRoundX size={42} />

                    <h3>No registered users found</h3>

                    <p>No user records match the currently applied filters.</p>

                    {activeUserFilterCount > 0 && (
                      <button type="button" onClick={clearUserFilters}>
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}

                {!usersLoading && registeredUserPage.users.length > 0 && (
                  <table className="user-management-table">
                    <thead>
                      <tr>
                        <th>User</th>

                        <th>Provider</th>

                        <th>Account</th>

                        <th>Security</th>

                        <th>Login Activity</th>

                        <th>Registered</th>

                        <th className="user-management-actions-column">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {registeredUserPage.users.map((user) => (
                        <tr key={user.id}>
                          <td>
                            <div className="user-management-identity">
                              <div className="user-management-avatar">
                                {user.profile_picture ? (
                                  <img
                                    src={user.profile_picture}
                                    alt={formatUserName(user)}
                                  />
                                ) : (
                                  <span>{getUserInitials(user)}</span>
                                )}

                                <i
                                  className={
                                    user.is_active
                                      ? "user-online"
                                      : "user-offline"
                                  }
                                />
                              </div>

                              <div>
                                <strong>{formatUserName(user)}</strong>

                                <span>{user.email}</span>

                                <small>ID #{user.id}</small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="user-management-provider">
                              {normalizeStatus(user.auth_provider) ===
                              "GOOGLE" ? (
                                <Globe2 size={17} />
                              ) : (
                                <KeyRound size={17} />
                              )}

                              <span>
                                {formatReadableValue(user.auth_provider)}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="user-management-badge-stack">
                              <UserStatusBadge
                                type={user.is_active ? "active" : "inactive"}
                              >
                                {user.is_active ? (
                                  <UserCheck size={14} />
                                ) : (
                                  <UserRoundX size={14} />
                                )}

                                {user.is_active ? "Active" : "Inactive"}
                              </UserStatusBadge>

                              <UserStatusBadge
                                type={
                                  user.is_verified ? "verified" : "unverified"
                                }
                              >
                                {user.is_verified ? (
                                  <BadgeCheck size={14} />
                                ) : (
                                  <AlertTriangle size={14} />
                                )}

                                {user.is_verified ? "Verified" : "Unverified"}
                              </UserStatusBadge>
                            </div>
                          </td>

                          <td>
                            <div className="user-management-security-cell">
                              <UserStatusBadge
                                type={user.is_locked ? "locked" : "unlocked"}
                              >
                                {user.is_locked ? (
                                  <LockKeyhole size={14} />
                                ) : (
                                  <UnlockKeyhole size={14} />
                                )}

                                {user.is_locked ? "Locked" : "Unlocked"}
                              </UserStatusBadge>

                              <small>
                                {formatNumber(user.failed_login_attempts)}{" "}
                                failed attempt
                                {Number(user.failed_login_attempts) === 1
                                  ? ""
                                  : "s"}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="user-management-login-cell">
                              <strong>{formatNumber(user.login_count)}</strong>

                              <span>successful logins</span>

                              <small>
                                Last: {formatDate(user.last_login_at)}
                              </small>
                            </div>
                          </td>

                          <td>
                            <div className="user-management-date-cell">
                              <CalendarDays size={16} />

                              <div>
                                <strong>
                                  {formatShortDate(user.created_at)}
                                </strong>

                                <span>{formatReadableValue(user.role)}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="user-management-row-actions">
                              <button
                                type="button"
                                className="user-management-icon-button"
                                title="View user details"
                                onClick={() => {
                                  void openUserDetail(user);
                                }}
                              >
                                <Eye size={17} />
                              </button>

                              {user.is_active ? (
                                <button
                                  type="button"
                                  className="user-management-icon-button warning"
                                  title="Deactivate user"
                                  onClick={() =>
                                    openUserAction("DEACTIVATE", user)
                                  }
                                >
                                  <UserRoundX size={17} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="user-management-icon-button success"
                                  title="Activate user"
                                  onClick={() =>
                                    openUserAction("ACTIVATE", user)
                                  }
                                >
                                  <UserRoundCheck size={17} />
                                </button>
                              )}

                              {user.is_locked ? (
                                <button
                                  type="button"
                                  className="user-management-icon-button success"
                                  title="Unlock user"
                                  onClick={() => openUserAction("UNLOCK", user)}
                                >
                                  <UnlockKeyhole size={17} />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="user-management-icon-button warning"
                                  title="Lock user"
                                  onClick={() => openUserAction("LOCK", user)}
                                >
                                  <LockKeyhole size={17} />
                                </button>
                              )}

                              <button
                                type="button"
                                className="user-management-icon-button danger"
                                title="Delete user"
                                onClick={() => openUserAction("DELETE", user)}
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* =========================================
                  USER PAGINATION
              ========================================= */}

              <div className="user-management-pagination">
                <button
                  type="button"
                  onClick={() => changeUserPage(userCurrentPage - 1)}
                  disabled={usersLoading || userCurrentPage <= 1}
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <div>
                  <span>Page</span>

                  <strong>{userCurrentPage}</strong>

                  <span>of</span>

                  <strong>{userTotalPages}</strong>
                </div>

                <button
                  type="button"
                  onClick={() => changeUserPage(userCurrentPage + 1)}
                  disabled={usersLoading || userCurrentPage >= userTotalPages}
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </section>
          )}
          {/* ===============================================
              GUEST VISITOR LOGS TAB
          =============================================== */}

          {activeTab === "guests" && (
            <section className="user-management-panel profile-animate animation-delay-two">
              <div className="panel-heading">
                <div>
                  <span>Anonymous visitor registry</span>

                  <h2>Guest Visitor Logs</h2>
                </div>

                <Globe2 size={23} />
              </div>

              {/* =========================================
                  GUEST SUMMARY
              ========================================= */}

              <div className="guest-summary-grid">
                <article className="guest-summary-card">
                  <div className="guest-summary-icon">
                    <Activity size={22} />
                  </div>

                  <div>
                    <span>Total Guest Visits</span>

                    <strong>
                      {formatNumber(
                        managementSummary.guest_visitors.total_guest_visits,
                      )}
                    </strong>

                    <small>All anonymous page visits recorded.</small>
                  </div>
                </article>

                <article className="guest-summary-card">
                  <div className="guest-summary-icon">
                    <Users size={22} />
                  </div>

                  <div>
                    <span>Unique Guest Sessions</span>

                    <strong>
                      {formatNumber(
                        managementSummary.guest_visitors.unique_guest_visitors,
                      )}
                    </strong>

                    <small>Distinct anonymous browser sessions.</small>
                  </div>
                </article>

                <article className="guest-summary-card">
                  <div className="guest-summary-icon success">
                    <CalendarDays size={22} />
                  </div>

                  <div>
                    <span>Visits Today</span>

                    <strong>
                      {formatNumber(
                        managementSummary.guest_visitors.today_guest_visits,
                      )}
                    </strong>

                    <small>Anonymous page visits recorded today.</small>
                  </div>
                </article>

                <article className="guest-summary-card">
                  <div className="guest-summary-icon success">
                    <Globe2 size={22} />
                  </div>

                  <div>
                    <span>Unique Guests Today</span>

                    <strong>
                      {formatNumber(
                        managementSummary.guest_visitors
                          .today_unique_guest_visitors,
                      )}
                    </strong>

                    <small>Distinct anonymous sessions today.</small>
                  </div>
                </article>
              </div>

              {/* =========================================
                  GUEST ANALYTICS
              ========================================= */}

              <div className="guest-analytics-grid">
                <article className="guest-analytics-card">
                  <div className="guest-analytics-heading">
                    <div>
                      <Globe2 size={18} />

                      <span>Top Visited Pages</span>
                    </div>

                    <small>Top 5</small>
                  </div>

                  <div className="guest-analytics-list">
                    {managementSummary.guest_visitors.top_pages.length > 0 ? (
                      managementSummary.guest_visitors.top_pages.map(
                        (item, index) => (
                          <div key={`${item.label}-${index}`}>
                            <span>{item.label}</span>

                            <strong>{formatNumber(item.visits)}</strong>
                          </div>
                        ),
                      )
                    ) : (
                      <p>No guest page analytics available.</p>
                    )}
                  </div>
                </article>

                <article className="guest-analytics-card">
                  <div className="guest-analytics-heading">
                    <div>
                      <Laptop2 size={18} />

                      <span>Top Browsers</span>
                    </div>

                    <small>Top 5</small>
                  </div>

                  <div className="guest-analytics-list">
                    {managementSummary.guest_visitors.top_browsers.length >
                    0 ? (
                      managementSummary.guest_visitors.top_browsers.map(
                        (item, index) => (
                          <div key={`${item.label}-${index}`}>
                            <span>{item.label}</span>

                            <strong>{formatNumber(item.visits)}</strong>
                          </div>
                        ),
                      )
                    ) : (
                      <p>No guest browser analytics available.</p>
                    )}
                  </div>
                </article>

                <article className="guest-analytics-card">
                  <div className="guest-analytics-heading">
                    <div>
                      <Smartphone size={18} />

                      <span>Top Operating Systems</span>
                    </div>

                    <small>Top 5</small>
                  </div>

                  <div className="guest-analytics-list">
                    {managementSummary.guest_visitors.top_operating_systems
                      .length > 0 ? (
                      managementSummary.guest_visitors.top_operating_systems.map(
                        (item, index) => (
                          <div key={`${item.label}-${index}`}>
                            <span>{item.label}</span>

                            <strong>{formatNumber(item.visits)}</strong>
                          </div>
                        ),
                      )
                    ) : (
                      <p>No operating-system analytics available.</p>
                    )}
                  </div>
                </article>
              </div>

              {/* =========================================
                  GUEST FILTERS
              ========================================= */}

              <div className="user-management-filter-panel guest-filter-panel">
                <div className="user-management-filter-heading">
                  <div>
                    <Filter size={18} />

                    <div>
                      <strong>Guest Log Filters</strong>

                      <span>
                        Filter anonymous visitor sessions and page activity.
                      </span>
                    </div>
                  </div>

                  {activeGuestFilterCount > 0 && (
                    <span className="user-management-filter-count">
                      {activeGuestFilterCount} active
                    </span>
                  )}
                </div>

                <div className="user-management-filter-grid guest-filter-grid">
                  <div className="user-management-field">
                    <label htmlFor="guest-session-filter">Session ID</label>

                    <div className="user-management-input-wrapper">
                      <Search size={17} />

                      <input
                        id="guest-session-filter"
                        name="sessionId"
                        type="search"
                        value={guestFilters.sessionId}
                        onChange={handleGuestFilterChange}
                        placeholder="Search session ID"
                      />
                    </div>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="guest-browser-filter">Browser</label>

                    <div className="user-management-input-wrapper">
                      <Laptop2 size={17} />

                      <input
                        id="guest-browser-filter"
                        name="browser"
                        type="text"
                        value={guestFilters.browser}
                        onChange={handleGuestFilterChange}
                        placeholder="Chrome, Edge, Firefox"
                      />
                    </div>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="guest-os-filter">Operating System</label>

                    <div className="user-management-input-wrapper">
                      <MonitorCheck size={17} />

                      <input
                        id="guest-os-filter"
                        name="operatingSystem"
                        type="text"
                        value={guestFilters.operatingSystem}
                        onChange={handleGuestFilterChange}
                        placeholder="Windows, Android, iOS"
                      />
                    </div>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="guest-page-filter">Visited Page</label>

                    <div className="user-management-input-wrapper">
                      <Globe2 size={17} />

                      <input
                        id="guest-page-filter"
                        name="visitedPage"
                        type="text"
                        value={guestFilters.visitedPage}
                        onChange={handleGuestFilterChange}
                        placeholder="/search or /case/123"
                      />
                    </div>
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="guest-date-from">Date From</label>

                    <input
                      id="guest-date-from"
                      name="dateFrom"
                      type="datetime-local"
                      value={guestFilters.dateFrom}
                      onChange={handleGuestFilterChange}
                    />
                  </div>

                  <div className="user-management-field">
                    <label htmlFor="guest-date-to">Date To</label>

                    <input
                      id="guest-date-to"
                      name="dateTo"
                      type="datetime-local"
                      value={guestFilters.dateTo}
                      onChange={handleGuestFilterChange}
                    />
                  </div>
                </div>

                <div className="user-management-filter-actions">
                  <button
                    type="button"
                    className="user-management-reset-button"
                    onClick={clearGuestFilters}
                    disabled={guestLogsLoading}
                  >
                    <RefreshCcw size={17} />
                    Reset
                  </button>

                  <button
                    type="button"
                    className="user-management-apply-button"
                    onClick={applyGuestFilters}
                    disabled={guestLogsLoading}
                  >
                    {guestLogsLoading ? (
                      <LoaderCircle size={17} className="spin-icon" />
                    ) : (
                      <Filter size={17} />
                    )}
                    Apply Filters
                  </button>
                </div>
              </div>

              {/* =========================================
                  GUEST TABLE TOOLBAR
              ========================================= */}

              <div className="user-management-table-toolbar">
                <div>
                  <span>Showing</span>

                  <strong>
                    {formatNumber(guestRangeStart)}
                    {" – "}
                    {formatNumber(guestRangeEnd)}
                  </strong>

                  <span>of</span>

                  <strong>{formatNumber(guestLogPage.total)}</strong>

                  <span>guest logs</span>
                </div>

                <div className="user-management-page-size">
                  <label htmlFor="guest-page-size">Rows per page</label>

                  <select
                    id="guest-page-size"
                    value={guestPageSize}
                    onChange={changeGuestPageSize}
                    disabled={guestLogsLoading}
                  >
                    <option value={10}>10</option>

                    <option value={25}>25</option>

                    <option value={50}>50</option>

                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* =========================================
                  GUEST TABLE
              ========================================= */}

              <div className="user-management-table-wrapper">
                {guestLogsLoading && (
                  <div className="user-management-table-loader">
                    <LoaderCircle size={24} className="spin-icon" />

                    <span>Loading guest visitor logs...</span>
                  </div>
                )}

                {!guestLogsLoading && guestLogPage.logs.length === 0 && (
                  <div className="user-management-empty-state">
                    <Globe2 size={42} />

                    <h3>No guest visitor logs found</h3>

                    <p>
                      No anonymous visitor records match the currently applied
                      filters.
                    </p>

                    {activeGuestFilterCount > 0 && (
                      <button type="button" onClick={clearGuestFilters}>
                        Clear Filters
                      </button>
                    )}
                  </div>
                )}

                {!guestLogsLoading && guestLogPage.logs.length > 0 && (
                  <table className="user-management-table guest-log-table">
                    <thead>
                      <tr>
                        <th>Session</th>

                        <th>IP Address</th>

                        <th>Browser</th>

                        <th>Operating System</th>

                        <th>Visited Page</th>

                        <th>Visited At</th>
                      </tr>
                    </thead>

                    <tbody>
                      {guestLogPage.logs.map((log) => (
                        <tr key={log.id}>
                          <td>
                            <div className="guest-session-cell">
                              <Globe2 size={17} />

                              <div>
                                <strong>
                                  {log.session_id || "Unknown session"}
                                </strong>

                                <span>Log #{log.id}</span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <div className="guest-simple-cell">
                              <ShieldCheck size={16} />

                              <span>{log.ip_address || "Not available"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="guest-simple-cell">
                              <Laptop2 size={16} />

                              <span>{log.browser || "Unknown browser"}</span>
                            </div>
                          </td>

                          <td>
                            <div className="guest-simple-cell">
                              <MonitorCheck size={16} />

                              <span>
                                {log.operating_system || "Unknown OS"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="guest-page-cell">
                              <Globe2 size={16} />

                              <span title={log.visited_page}>
                                {log.visited_page || "Unknown page"}
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className="user-management-date-cell">
                              <CalendarDays size={16} />

                              <div>
                                <strong>{formatDate(log.visited_at)}</strong>

                                <span>Guest activity</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* =========================================
                  GUEST PAGINATION
              ========================================= */}

              <div className="user-management-pagination">
                <button
                  type="button"
                  onClick={() => changeGuestPage(guestCurrentPage - 1)}
                  disabled={guestLogsLoading || guestCurrentPage <= 1}
                >
                  <ChevronLeft size={17} />
                  Previous
                </button>

                <div>
                  <span>Page</span>

                  <strong>{guestCurrentPage}</strong>

                  <span>of</span>

                  <strong>{guestTotalPages}</strong>
                </div>

                <button
                  type="button"
                  onClick={() => changeGuestPage(guestCurrentPage + 1)}
                  disabled={
                    guestLogsLoading || guestCurrentPage >= guestTotalPages
                  }
                >
                  Next
                  <ChevronRight size={17} />
                </button>
              </div>
            </section>
          )}
          {/* ===============================================
              FOOTER
          =============================================== */}

          <footer className="profile-footer">
            <div>
              <span>User and Visitor Administration Center</span>
            </div>

            <p>© 2026 LexMiner AI Adaptive Language Case Decision Miner</p>
          </footer>
        </div>
      </main>

      {/* ===============================================
          USER DETAIL MODAL
      =============================================== */}

      {userDetail.open && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUserDetail();
            }
          }}
        >
          <div
            className="confirmation-modal user-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-detail-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={closeUserDetail}
              disabled={userDetail.loading}
              aria-label="Close user details"
            >
              <X size={19} />
            </button>

            {userDetail.loading ? (
              <div className="user-detail-loading">
                <LoaderCircle size={34} className="spin-icon" />

                <strong>Loading registered-user details...</strong>
              </div>
            ) : (
              <>
                <div className="user-detail-header">
                  <div className="user-detail-avatar">
                    {userDetail.user?.profile_picture ? (
                      <img
                        src={userDetail.user.profile_picture}
                        alt={formatUserName(userDetail.user)}
                      />
                    ) : (
                      <span>{getUserInitials(userDetail.user)}</span>
                    )}
                  </div>

                  <div>
                    <span className="modal-eyebrow">
                      Registered-user profile
                    </span>

                    <h2 id="user-detail-modal-title">
                      {formatUserName(userDetail.user)}
                    </h2>

                    <p>
                      {userDetail.user?.email || "No email address available"}
                    </p>
                  </div>
                </div>

                <div className="user-detail-status-row">
                  <UserStatusBadge
                    type={userDetail.user?.is_active ? "active" : "inactive"}
                  >
                    {userDetail.user?.is_active ? (
                      <UserCheck size={14} />
                    ) : (
                      <UserRoundX size={14} />
                    )}

                    {userDetail.user?.is_active ? "Active" : "Inactive"}
                  </UserStatusBadge>

                  <UserStatusBadge
                    type={userDetail.user?.is_locked ? "locked" : "unlocked"}
                  >
                    {userDetail.user?.is_locked ? (
                      <LockKeyhole size={14} />
                    ) : (
                      <UnlockKeyhole size={14} />
                    )}

                    {userDetail.user?.is_locked ? "Locked" : "Unlocked"}
                  </UserStatusBadge>

                  <UserStatusBadge
                    type={
                      userDetail.user?.is_verified ? "verified" : "unverified"
                    }
                  >
                    {userDetail.user?.is_verified ? (
                      <BadgeCheck size={14} />
                    ) : (
                      <AlertTriangle size={14} />
                    )}

                    {userDetail.user?.is_verified ? "Verified" : "Unverified"}
                  </UserStatusBadge>
                </div>

                <div className="user-detail-grid">
                  <div>
                    <span>User ID</span>

                    <strong>#{userDetail.user?.id}</strong>
                  </div>

                  <div>
                    <span>System Role</span>

                    <strong>
                      {formatReadableValue(userDetail.user?.role)}
                    </strong>
                  </div>

                  <div>
                    <span>Authentication Provider</span>

                    <strong>
                      {formatReadableValue(userDetail.user?.auth_provider)}
                    </strong>
                  </div>

                  <div>
                    <span>Last Login Provider</span>

                    <strong>
                      {formatReadableValue(
                        userDetail.user?.last_login_provider,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Successful Logins</span>

                    <strong>
                      {formatNumber(userDetail.user?.login_count)}
                    </strong>
                  </div>

                  <div>
                    <span>Failed Login Attempts</span>

                    <strong>
                      {formatNumber(userDetail.user?.failed_login_attempts)}
                    </strong>
                  </div>

                  <div>
                    <span>Last Login</span>

                    <strong>
                      {formatDate(userDetail.user?.last_login_at)}
                    </strong>
                  </div>

                  <div>
                    <span>Last Logout</span>

                    <strong>
                      {formatDate(userDetail.user?.last_logout_at)}
                    </strong>
                  </div>

                  <div>
                    <span>Locked Until</span>

                    <strong>{formatDate(userDetail.user?.locked_until)}</strong>
                  </div>

                  <div>
                    <span>Account Created</span>

                    <strong>{formatDate(userDetail.user?.created_at)}</strong>
                  </div>

                  <div>
                    <span>Last Updated</span>

                    <strong>{formatDate(userDetail.user?.updated_at)}</strong>
                  </div>

                  <div>
                    <span>Deleted At</span>

                    <strong>{formatDate(userDetail.user?.deleted_at)}</strong>
                  </div>
                </div>

                <div className="user-detail-actions">
                  {userDetail.user?.is_active ? (
                    <button
                      type="button"
                      className="user-detail-action-button warning"
                      onClick={() => {
                        const user = userDetail.user;

                        closeUserDetail();

                        openUserAction("DEACTIVATE", user);
                      }}
                    >
                      <UserRoundX size={17} />
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="user-detail-action-button success"
                      onClick={() => {
                        const user = userDetail.user;

                        closeUserDetail();

                        openUserAction("ACTIVATE", user);
                      }}
                    >
                      <UserRoundCheck size={17} />
                      Activate
                    </button>
                  )}

                  {userDetail.user?.is_locked ? (
                    <button
                      type="button"
                      className="user-detail-action-button success"
                      onClick={() => {
                        const user = userDetail.user;

                        closeUserDetail();

                        openUserAction("UNLOCK", user);
                      }}
                    >
                      <UnlockKeyhole size={17} />
                      Unlock
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="user-detail-action-button warning"
                      onClick={() => {
                        const user = userDetail.user;

                        closeUserDetail();

                        openUserAction("LOCK", user);
                      }}
                    >
                      <LockKeyhole size={17} />
                      Lock
                    </button>
                  )}

                  <button
                    type="button"
                    className="user-detail-action-button danger"
                    onClick={() => {
                      const user = userDetail.user;

                      closeUserDetail();

                      openUserAction("DELETE", user);
                    }}
                  >
                    <Trash2 size={17} />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ===============================================
          USER ACTION CONFIRMATION MODAL
      =============================================== */}

      {actionModal.open && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUserAction();
            }
          }}
        >
          <div
            className="confirmation-modal user-action-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-action-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={closeUserAction}
              disabled={actionLoading}
              aria-label="Close user action confirmation"
            >
              <X size={19} />
            </button>

            <div
              className={`confirmation-icon user-action-confirmation-icon user-action-${normalizeStatus(
                actionModal.type,
              ).toLowerCase()}`}
            >
              {normalizeStatus(actionModal.type) === "ACTIVATE" ? (
                <UserRoundCheck size={31} />
              ) : normalizeStatus(actionModal.type) === "DEACTIVATE" ? (
                <UserRoundX size={31} />
              ) : normalizeStatus(actionModal.type) === "LOCK" ? (
                <LockKeyhole size={31} />
              ) : normalizeStatus(actionModal.type) === "UNLOCK" ? (
                <UnlockKeyhole size={31} />
              ) : (
                <Trash2 size={31} />
              )}
            </div>

            <span className="modal-eyebrow">Account action confirmation</span>

            <h2 id="user-action-modal-title">{actionLabel}?</h2>

            <p>{actionDescription}</p>

            <div className="user-action-account-summary">
              <div className="user-action-avatar">
                {actionModal.user?.profile_picture ? (
                  <img
                    src={actionModal.user.profile_picture}
                    alt={formatUserName(actionModal.user)}
                  />
                ) : (
                  <span>{getUserInitials(actionModal.user)}</span>
                )}
              </div>

              <div>
                <strong>{formatUserName(actionModal.user)}</strong>

                <span>{actionModal.user?.email}</span>

                <small>Registered user ID #{actionModal.user?.id}</small>
              </div>
            </div>

            {normalizeStatus(actionModal.type) === "DELETE" && (
              <div className="user-action-danger-notice">
                <AlertTriangle size={18} />

                <div>
                  <strong>Soft-delete operation</strong>

                  <span>
                    The account will be hidden from the registered-user list,
                    deactivated, and locked. Existing visitor records remain
                    stored.
                  </span>
                </div>
              </div>
            )}

            <div className="confirmation-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeUserAction}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  normalizeStatus(actionModal.type) === "DELETE"
                    ? "modal-logout-button"
                    : "modal-confirm-button"
                }
                onClick={() => {
                  void confirmUserAction();
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <LoaderCircle size={18} className="spin-icon" />
                ) : normalizeStatus(actionModal.type) === "ACTIVATE" ? (
                  <UserRoundCheck size={18} />
                ) : normalizeStatus(actionModal.type) === "DEACTIVATE" ? (
                  <UserRoundX size={18} />
                ) : normalizeStatus(actionModal.type) === "LOCK" ? (
                  <LockKeyhole size={18} />
                ) : normalizeStatus(actionModal.type) === "UNLOCK" ? (
                  <UnlockKeyhole size={18} />
                ) : (
                  <Trash2 size={18} />
                )}

                {actionLoading ? "Processing..." : actionLabel}
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
            aria-labelledby="user-management-logout-title"
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

            <h2 id="user-management-logout-title">Logout Administrator?</h2>

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
