import { useCallback, useEffect, useMemo, useState } from "react";

import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Database,
  Eye,
  EyeOff,
  Fingerprint,
  Gauge,
  RefreshCcw,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Menu,
  MonitorCheck,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  UserCheck,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";
import adminPicture from "../../assets/admin-picture.png";

import {
  getAdminProfile,
  updateAdminPassword,
} from "../../services/adminProfileService";

import "../../styles/admin-profile.css";

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

  last_login_at: null,
  last_logout_at: null,
  last_login_provider: null,
  failed_login_attempts: 0,
  login_count: 0,

  created_at: null,
  updated_at: null,
};

const DEFAULT_PASSWORD_FORM = {
  current_password: "",
  new_password: "",
  confirm_password: "",
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
    return "You are not authorized to access this page.";
  }

  return error?.message || "An unexpected error occurred.";
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
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

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

function formatRelativeTime(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  const difference = Date.now() - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    const minutes = Math.floor(difference / minute);

    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (difference < day) {
    const hours = Math.floor(difference / hour);

    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(difference / day);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatReadableValue(value) {
  if (!value) {
    return "Not available";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function AdminProfileLoader() {
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
          Loading administrator security center...
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ positive, positiveText, negativeText }) {
  return (
    <span
      className={`profile-status-badge ${
        positive ? "status-positive" : "status-negative"
      }`}
    >
      {positive ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}

      {positive ? positiveText : negativeText}
    </span>
  );
}

export default function AdminProfilePage() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const [passwordForm, setPasswordForm] = useState(DEFAULT_PASSWORD_FORM);

  const [initialLoading, setInitialLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});

  const loadProfile = useCallback(
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
        const result = await getAdminProfile();

        setProfile({
          ...DEFAULT_PROFILE,
          ...result,
        });
      } catch (requestError) {
        const status = requestError?.response?.status;

        if (status === 401 || status === 403) {
          localStorage.removeItem("admin_token");

          localStorage.removeItem("admin_user");

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
      loadProfile();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [loadProfile]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError("");
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setShowPasswordConfirmation(false);
      setShowLogoutConfirmation(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  const fullName = useMemo(() => {
    const name = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || "LexMiner Administrator";
  }, [profile.first_name, profile.last_name]);

  const avatarSource = profile.profile_picture || adminPicture;

  const passwordChecks = useMemo(() => {
    const password = passwordForm.new_password;

    return {
      minimumLength: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  }, [passwordForm.new_password]);

  const passwordStrength = useMemo(() => {
    const passed = Object.values(passwordChecks).filter(Boolean).length;

    if (!passwordForm.new_password) {
      return {
        label: "No password entered",
        level: 0,
        className: "strength-empty",
      };
    }

    if (passed <= 2) {
      return {
        label: "Weak",
        level: 1,
        className: "strength-weak",
      };
    }

    if (passed <= 4) {
      return {
        label: "Moderate",
        level: 2,
        className: "strength-moderate",
      };
    }

    return {
      label: "Strong",
      level: 3,
      className: "strength-strong",
    };
  }, [passwordChecks, passwordForm.new_password]);

  const failedLoginStatus = useMemo(() => {
    const attempts = Number(profile.failed_login_attempts) || 0;

    if (attempts === 0) {
      return {
        label: "Secure",
        description: "No failed login attempts",
        className: "login-attempt-secure",
      };
    }

    if (attempts < 3) {
      return {
        label: "Warning",
        description: `${attempts} failed login attempt${
          attempts === 1 ? "" : "s"
        }`,
        className: "login-attempt-warning",
      };
    }

    return {
      label: "High Risk",
      description: `${attempts} failed login attempts`,
      className: "login-attempt-danger",
    };
  }, [profile.failed_login_attempts]);

  const securityItems = useMemo(
    () => [
      {
        title: "Administrator Role",
        description: "This account has administrator-level system access.",
        healthy: String(profile.role).toLowerCase() === "admin",
        icon: ShieldCheck,
      },
      {
        title: "Account Active",
        description: "The administrator account is enabled and operational.",
        healthy: Boolean(profile.is_active),
        icon: UserCheck,
      },
      {
        title: "Email Verified",
        description: "The administrator email address has been verified.",
        healthy: Boolean(profile.is_verified),
        icon: BadgeCheck,
      },
      {
        title: "Account Lock",
        description: "The account is not restricted by a security lock.",
        healthy: !profile.is_locked,
        icon: LockKeyhole,
      },
      {
        title: "Authentication",
        description: "The current sign-in provider assigned to this account.",
        healthy: Boolean(profile.auth_provider),
        icon: Fingerprint,
      },
    ],
    [profile],
  );

  function handlePasswordChange(event) {
    const { name, value } = event.target;

    setPasswordForm((current) => ({
      ...current,
      [name]: value,
    }));

    setFieldErrors((current) => ({
      ...current,
      [name]: "",
    }));

    setError("");
  }

  function validatePasswordForm() {
    const errors = {};

    if (!passwordForm.current_password.trim()) {
      errors.current_password = "Enter your current password.";
    }

    if (!passwordForm.new_password) {
      errors.new_password = "Enter a new password.";
    } else if (!Object.values(passwordChecks).every(Boolean)) {
      errors.new_password =
        "The new password must satisfy all password requirements.";
    }

    if (!passwordForm.confirm_password) {
      errors.confirm_password = "Confirm your new password.";
    } else if (passwordForm.new_password !== passwordForm.confirm_password) {
      errors.confirm_password = "The passwords do not match.";
    }

    if (
      passwordForm.current_password &&
      passwordForm.current_password === passwordForm.new_password
    ) {
      errors.new_password =
        "The new password must be different from the current password.";
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    setNotice("");
    setError("");

    if (!validatePasswordForm()) {
      return;
    }

    setShowPasswordConfirmation(true);
  }

  async function confirmPasswordUpdate() {
    setShowPasswordConfirmation(false);
    setUpdatingPassword(true);
    setError("");
    setNotice("");

    try {
      const result = await updateAdminPassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
        confirm_password: passwordForm.confirm_password,
      });

      setPasswordForm(DEFAULT_PASSWORD_FORM);

      setFieldErrors({});

      setNotice(
        result?.message || "Administrator password updated successfully.",
      );

      await loadProfile({
        showRefresh: false,
      });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setUpdatingPassword(false);
    }
  }

  function confirmLogout() {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_user");

    navigate("/authentication", {
      replace: true,
    });
  }

  if (initialLoading) {
    return <AdminProfileLoader />;
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
            className="sidebar-link active"
            title="Admin Profile"
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
            <ChevronRight size={17} />
          ) : (
            <ChevronLeft size={17} />
          )}
        </button>
      </aside>

      <main className="profile-main">
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

              <h1>Admin Profile</h1>
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
              onClick={() => window.location.reload()}
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

          <section className="profile-hero profile-animate">
            <div className="profile-hero-copy">
              <div className="hero-label">
                <ShieldCheck size={16} />
                Administrator security center
              </div>

              <h2>
                Account monitoring for
                <span> {fullName}</span>
              </h2>

              <p>
                Review administrator identity, authentication status, account
                security, and password credentials from one protected profile
                center.
              </p>

              <div className="hero-security-summary">
                <div>
                  <CheckCircle2 size={18} />
                  Protected session
                </div>

                <div>
                  <Fingerprint size={18} />
                  {formatReadableValue(profile.auth_provider)}
                </div>

                <div>
                  <MonitorCheck size={18} />
                  Account monitored
                </div>
              </div>
            </div>

            <div className="profile-hero-visual">
              <div className="profile-orbit orbit-one" />
              <div className="profile-orbit orbit-two" />

              <div className="profile-avatar-ring">
                <img src={avatarSource} alt={fullName} />

                <span className="profile-online-indicator" />
              </div>

              <div className="profile-hero-role">
                <ShieldCheck size={17} />

                {formatReadableValue(profile.role)}
              </div>
            </div>
          </section>

          <section className="profile-layout">
            <div className="profile-column">
              <article className="profile-panel profile-animate animation-delay-one">
                <div className="panel-heading">
                  <div>
                    <span>Identity monitoring</span>

                    <h2>Administrator Information</h2>
                  </div>

                  <CircleUserRound size={23} />
                </div>

                <div className="administrator-summary">
                  <div className="administrator-avatar">
                    <img src={avatarSource} alt={fullName} />

                    <span />
                  </div>

                  <div>
                    <h3>{fullName}</h3>

                    <p>{profile.email}</p>

                    <StatusBadge
                      positive={profile.is_active}
                      positiveText="Active administrator"
                      negativeText="Inactive account"
                    />
                  </div>
                </div>

                <div className="profile-information-grid">
                  <div className="profile-information-item">
                    <span>Administrator ID</span>

                    <strong>{profile.id || "—"}</strong>
                  </div>

                  <div className="profile-information-item">
                    <span>First Name</span>

                    <strong>{profile.first_name || "Not available"}</strong>
                  </div>

                  <div className="profile-information-item">
                    <span>Last Name</span>

                    <strong>{profile.last_name || "Not available"}</strong>
                  </div>

                  <div className="profile-information-item">
                    <span>Email Address</span>

                    <strong>{profile.email || "Not available"}</strong>
                  </div>

                  <div className="profile-information-item">
                    <span>System Role</span>

                    <strong>{formatReadableValue(profile.role)}</strong>
                  </div>

                  <div className="profile-information-item">
                    <span>Authentication Provider</span>

                    <strong>
                      {formatReadableValue(profile.auth_provider)}
                    </strong>
                  </div>
                </div>

                <div className="read-only-notice">
                  <LockKeyhole size={18} />

                  <div>
                    <strong>Protected information</strong>

                    <span>
                      Administrator identity details are read-only. Only the
                      account password can be changed from this page.
                    </span>
                  </div>
                </div>
              </article>

              <article className="profile-panel profile-animate animation-delay-two">
                <div className="panel-heading">
                  <div>
                    <span>Credential management</span>

                    <h2>Change Password</h2>
                  </div>

                  <KeyRound size={23} />
                </div>

                <form
                  className="password-form"
                  onSubmit={handlePasswordSubmit}
                  noValidate
                >
                  <div className="password-field-group">
                    <label htmlFor="current_password">Current Password</label>

                    <div
                      className={`password-input-wrapper ${
                        fieldErrors.current_password ? "input-has-error" : ""
                      }`}
                    >
                      <LockKeyhole size={18} />

                      <input
                        id="current_password"
                        name="current_password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordForm.current_password}
                        onChange={handlePasswordChange}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword((current) => !current)
                        }
                        aria-label={
                          showCurrentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {fieldErrors.current_password && (
                      <span className="field-error">
                        {fieldErrors.current_password}
                      </span>
                    )}
                  </div>

                  <div className="password-field-group">
                    <label htmlFor="new_password">New Password</label>

                    <div
                      className={`password-input-wrapper ${
                        fieldErrors.new_password ? "input-has-error" : ""
                      }`}
                    >
                      <KeyRound size={18} />

                      <input
                        id="new_password"
                        name="new_password"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordForm.new_password}
                        onChange={handlePasswordChange}
                        placeholder="Create a new password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowNewPassword((current) => !current)
                        }
                        aria-label={
                          showNewPassword
                            ? "Hide new password"
                            : "Show new password"
                        }
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {fieldErrors.new_password && (
                      <span className="field-error">
                        {fieldErrors.new_password}
                      </span>
                    )}
                  </div>

                  <div className="password-field-group">
                    <label htmlFor="confirm_password">
                      Confirm New Password
                    </label>

                    <div
                      className={`password-input-wrapper ${
                        fieldErrors.confirm_password ? "input-has-error" : ""
                      }`}
                    >
                      <ShieldCheck size={18} />

                      <input
                        id="confirm_password"
                        name="confirm_password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordForm.confirm_password}
                        onChange={handlePasswordChange}
                        placeholder="Confirm the new password"
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide password confirmation"
                            : "Show password confirmation"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    {fieldErrors.confirm_password && (
                      <span className="field-error">
                        {fieldErrors.confirm_password}
                      </span>
                    )}
                  </div>

                  <div className="admin-password-strength-panel">
                    <div className="strength-heading">
                      <span>Password Strength</span>

                      <strong className={passwordStrength.className}>
                        {passwordStrength.label}
                      </strong>
                    </div>

                    <div className="strength-bars">
                      {[1, 2, 3].map((level) => (
                        <span
                          key={level}
                          className={
                            level <= passwordStrength.level
                              ? `strength-active ${passwordStrength.className}`
                              : ""
                          }
                        />
                      ))}
                    </div>

                    <div className="password-requirements">
                      <div
                        className={
                          passwordChecks.minimumLength
                            ? "requirement-complete"
                            : ""
                        }
                      >
                        {passwordChecks.minimumLength ? (
                          <Check size={15} />
                        ) : (
                          <X size={15} />
                        )}
                        At least 8 characters
                      </div>

                      <div
                        className={
                          passwordChecks.uppercase ? "requirement-complete" : ""
                        }
                      >
                        {passwordChecks.uppercase ? (
                          <Check size={15} />
                        ) : (
                          <X size={15} />
                        )}
                        One uppercase letter
                      </div>

                      <div
                        className={
                          passwordChecks.lowercase ? "requirement-complete" : ""
                        }
                      >
                        {passwordChecks.lowercase ? (
                          <Check size={15} />
                        ) : (
                          <X size={15} />
                        )}
                        One lowercase letter
                      </div>

                      <div
                        className={
                          passwordChecks.number ? "requirement-complete" : ""
                        }
                      >
                        {passwordChecks.number ? (
                          <Check size={15} />
                        ) : (
                          <X size={15} />
                        )}
                        One number
                      </div>

                      <div
                        className={
                          passwordChecks.special ? "requirement-complete" : ""
                        }
                      >
                        {passwordChecks.special ? (
                          <Check size={15} />
                        ) : (
                          <X size={15} />
                        )}
                        One special character
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="update-password-button"
                    disabled={updatingPassword}
                  >
                    {updatingPassword ? (
                      <LoaderCircle size={19} className="spin-icon" />
                    ) : (
                      <KeyRound size={19} />
                    )}

                    {updatingPassword
                      ? "Updating Password..."
                      : "Update Password"}
                  </button>
                </form>
              </article>
            </div>

            <div className="profile-column">
              <article className="profile-panel profile-animate animation-delay-three">
                <div className="panel-heading">
                  <div>
                    <span>Account monitoring</span>

                    <h2>Account Activity</h2>
                  </div>

                  <Activity size={23} />
                </div>

                <div className="activity-timeline">
                  <div className="activity-item">
                    <div className="activity-icon">
                      <LogIn size={19} />
                    </div>

                    <div>
                      <span>Last Login</span>

                      <strong>{formatDate(profile.last_login_at)}</strong>

                      <small>
                        {profile.last_login_at
                          ? formatRelativeTime(profile.last_login_at)
                          : "No recorded login activity"}
                      </small>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">
                      <LogOut size={19} />
                    </div>

                    <div>
                      <span>Last Logout</span>

                      <strong>{formatDate(profile.last_logout_at)}</strong>

                      <small>
                        {profile.last_logout_at
                          ? formatRelativeTime(profile.last_logout_at)
                          : "No recorded logout activity"}
                      </small>
                    </div>
                  </div>

                  <div className="activity-item failed-login-activity">
                    <div
                      className={`activity-icon ${failedLoginStatus.className}`}
                    >
                      <ShieldAlert size={19} />
                    </div>

                    <div>
                      <span>Failed Login Attempts</span>

                      <strong className={failedLoginStatus.className}>
                        {profile.failed_login_attempts || 0} Attempt
                        {Number(profile.failed_login_attempts) === 1 ? "" : "s"}
                      </strong>

                      <small className={failedLoginStatus.className}>
                        {failedLoginStatus.label}
                        {" — "}
                        {failedLoginStatus.description}
                      </small>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">
                      <CheckCircle2 size={19} />
                    </div>

                    <div>
                      <span>Successful Logins</span>

                      <strong>{profile.login_count || 0}</strong>

                      <small>Total completed administrator logins</small>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">
                      <Fingerprint size={19} />
                    </div>

                    <div>
                      <span>Last Login Provider</span>

                      <strong>
                        {formatReadableValue(
                          profile.last_login_provider || profile.auth_provider,
                        )}
                      </strong>

                      <small>
                        Authentication method used during the latest login
                      </small>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">
                      <CalendarDays size={19} />
                    </div>

                    <div>
                      <span>Account Created</span>

                      <strong>{formatDate(profile.created_at)}</strong>

                      <small>Administrator account registration</small>
                    </div>
                  </div>

                  <div className="activity-item">
                    <div className="activity-icon">
                      <Clock3 size={19} />
                    </div>

                    <div>
                      <span>Profile Last Updated</span>

                      <strong>{formatDate(profile.updated_at)}</strong>

                      <small>{formatRelativeTime(profile.updated_at)}</small>
                    </div>
                  </div>
                </div>

                <div className="activity-footnote">
                  <MonitorCheck size={18} />

                  <span>
                    Login activity is automatically recorded by the LexMiner
                    authentication service.
                  </span>
                </div>
              </article>

              <article className="profile-panel profile-animate animation-delay-four">
                <div className="panel-heading">
                  <div>
                    <span>Account protection</span>

                    <h2>Security Overview</h2>
                  </div>

                  <ShieldCheck size={23} />
                </div>

                <div className="security-overview-list">
                  {securityItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        className={`security-overview-item ${
                          item.healthy ? "security-healthy" : "security-warning"
                        }`}
                        key={item.title}
                      >
                        <div className="security-item-icon">
                          <Icon size={21} />
                        </div>

                        <div>
                          <strong>{item.title}</strong>

                          <span>{item.description}</span>
                        </div>

                        <div className="security-result">
                          {item.healthy ? (
                            <CheckCircle2 size={19} />
                          ) : (
                            <AlertTriangle size={19} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="profile-panel profile-animate animation-delay-five account-summary-panel">
                <div className="panel-heading">
                  <div>
                    <span>Account summary</span>

                    <h2>Monitoring Snapshot</h2>
                  </div>

                  <MonitorCheck size={23} />
                </div>

                <div className="monitoring-snapshot">
                  <div>
                    <span>Account Status</span>

                    <StatusBadge
                      positive={profile.is_active}
                      positiveText="Active"
                      negativeText="Inactive"
                    />
                  </div>

                  <div>
                    <span>Email Status</span>

                    <StatusBadge
                      positive={profile.is_verified}
                      positiveText="Verified"
                      negativeText="Unverified"
                    />
                  </div>

                  <div>
                    <span>Lock Status</span>

                    <StatusBadge
                      positive={!profile.is_locked}
                      positiveText="Not locked"
                      negativeText="Locked"
                    />
                  </div>

                  <div>
                    <span>Member Since</span>

                    <strong>{formatShortDate(profile.created_at)}</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <footer className="profile-footer">
            <div>
              <span>System Administrator Console</span>
            </div>

            <p>© 2026 LexMiner AI Adaptive Language Case Decision Miner</p>
          </footer>
        </div>
      </main>

      {showPasswordConfirmation && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPasswordConfirmation(false);
            }
          }}
        >
          <div
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setShowPasswordConfirmation(false)}
              aria-label="Close confirmation"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon password-confirmation-icon">
              <KeyRound size={31} />
            </div>

            <span className="modal-eyebrow">Security confirmation</span>

            <h2 id="password-modal-title">Update Administrator Password?</h2>

            <p>
              The current administrator password will be replaced immediately.
              You will need to use the new password during your next login.
            </p>

            <div className="confirmation-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={() => setShowPasswordConfirmation(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-confirm-button"
                onClick={confirmPasswordUpdate}
              >
                <KeyRound size={18} />
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}

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
