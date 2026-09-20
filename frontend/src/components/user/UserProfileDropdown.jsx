import { useEffect, useMemo, useRef, useState } from "react";

import {
  Bookmark,
  ChevronDown,
  FileSearch,
  LoaderCircle,
  LogIn,
  LogOut,
  Settings,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { getUserProfile } from "../../services/userProfileService";

import {
  getStoredUser,
  getUserAccessToken,
  logoutUser,
  saveStoredUser,
} from "../../services/userAuthService";

import UserAvatar from "./UserAvatar";

import "../../styles/user-profile-dropdown.css";

function getDisplayName(user) {
  const fullName = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  const email = String(user?.email || "").trim();

  if (email) {
    return email.split("@")[0] || "LexMiner User";
  }

  return "Guest";
}

export default function UserProfileDropdown() {
  const navigate = useNavigate();

  const location = useLocation();

  const dropdownRef = useRef(null);

  const [currentUser, setCurrentUser] = useState(() => getStoredUser());

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [profileLoading, setProfileLoading] = useState(() =>
    Boolean(getUserAccessToken()),
  );

  const [profileError, setProfileError] = useState("");

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false);

  const [logoutError, setLogoutError] = useState("");

  const accessToken = getUserAccessToken();

  const isAuthenticated = Boolean(accessToken && currentUser);

  const displayName = useMemo(() => getDisplayName(currentUser), [currentUser]);

  /* =======================================================
   LOAD LATEST PROFILE
======================================================= */

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let cancelled = false;

    const profileRequest = getUserProfile();

    profileRequest
      .then((profile) => {
        if (cancelled) {
          return;
        }

        setCurrentUser(profile);

        saveStoredUser(profile);

        setProfileError("");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        if (error?.response?.status === 401) {
          return;
        }

        setProfileError("Profile information could not be refreshed.");
      })
      .finally(() => {
        if (!cancelled) {
          setProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken]);

  /* =======================================================
     LISTEN FOR PROFILE CHANGES
  ======================================================= */

  useEffect(() => {
    function handleUserUpdate(event) {
      const updatedUser = event?.detail || getStoredUser();

      setCurrentUser(updatedUser || null);
    }

    function handleAuthenticationChange() {
      const storedUser = getStoredUser();

      setCurrentUser(storedUser);

      if (getUserAccessToken()) {
        setProfileLoading(true);

        getUserProfile()
          .then((profile) => {
            setCurrentUser(profile);

            saveStoredUser(profile);
          })
          .catch((error) => {
            if (error?.response?.status !== 401) {
              setProfileError("Profile information could not be refreshed.");
            }
          })
          .finally(() => {
            setProfileLoading(false);
          });
      } else {
        setProfileLoading(false);

        setProfileError("");
      }
    }

    window.addEventListener("lexminer-user-updated", handleUserUpdate);

    window.addEventListener(
      "lexminer-auth-changed",
      handleAuthenticationChange,
    );

    window.addEventListener("storage", handleAuthenticationChange);

    return () => {
      window.removeEventListener("lexminer-user-updated", handleUserUpdate);

      window.removeEventListener(
        "lexminer-auth-changed",
        handleAuthenticationChange,
      );

      window.removeEventListener("storage", handleAuthenticationChange);
    };
  }, []);

  /* =======================================================
     CLOSE WHEN CLICKING OUTSIDE
  ======================================================= */

  useEffect(() => {
    function handlePointerDown(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setDropdownOpen(false);

      if (!logoutLoading) {
        setLogoutModalOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);

      window.removeEventListener("keydown", handleEscape);
    };
  }, [logoutLoading]);

  /* =======================================================
     LOGIN AND REGISTER
  ======================================================= */

  function navigateToAuthentication(authMode) {
    setDropdownOpen(false);

    navigate("/authentication", {
      state: {
        authMode,

        from: location.pathname + location.search,
      },
    });
  }

  /* =======================================================
     PROTECTED NAVIGATION
  ======================================================= */

  function navigateToProtectedPage(path) {
    setDropdownOpen(false);

    if (!isAuthenticated) {
      navigateToAuthentication("LOGIN");

      return;
    }

    navigate(path);
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  function requestLogout() {
    setDropdownOpen(false);
    setLogoutError("");
    setLogoutModalOpen(true);
  }

  async function confirmLogout() {
    if (logoutLoading) {
      return;
    }

    setLogoutLoading(true);
    setLogoutError("");

    try {
      await logoutUser();

      setCurrentUser(null);
      setLogoutModalOpen(false);

      navigate("/", {
        replace: true,
      });
    } catch (error) {
      setLogoutError(
        error?.message || "LexMiner could not complete the logout request.",
      );
    } finally {
      setLogoutLoading(false);
    }
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <>
      <div className="header-profile-dropdown-wrapper" ref={dropdownRef}>
        <button
          type="button"
          className={`header-profile-trigger ${
            dropdownOpen ? "header-profile-trigger-open" : ""
          }`}
          onClick={() => setDropdownOpen((current) => !current)}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
        >
          {profileLoading ? (
            <span className="header-profile-loading-avatar">
              <LoaderCircle size={19} className="profile-dropdown-spin" />
            </span>
          ) : (
            <UserAvatar user={currentUser} size={38} />
          )}

          <span className="header-profile-trigger-copy">
            <strong>{displayName}</strong>

            <small>
              {isAuthenticated ? "Registered User" : "Public access"}
            </small>
          </span>

          <ChevronDown
            size={16}
            className={dropdownOpen ? "header-profile-chevron-open" : ""}
          />
        </button>

        {dropdownOpen && (
          <div className="header-profile-dropdown" role="menu">
            {isAuthenticated ? (
              <>
                <div className="header-profile-account">
                  <UserAvatar user={currentUser} size={58} />

                  <div>
                    <strong>{displayName}</strong>

                    <span>{currentUser?.email}</span>

                    <small>
                      {String(currentUser?.role || "registered")
                        .replace(/_/g, " ")
                        .toLowerCase()}
                    </small>
                  </div>
                </div>

                {profileError && (
                  <div className="header-profile-inline-error">
                    {profileError}
                  </div>
                )}

                <div className="header-profile-menu-group">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigateToProtectedPage("/profile")}
                  >
                    <UserRound size={18} />

                    <span>
                      <strong>My Profile</strong>

                      <small>Manage your personal information</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigateToProtectedPage("/account-settings")}
                  >
                    <Settings size={18} />

                    <span>
                      <strong>Account Settings</strong>

                      <small>Update your account preferences</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigateToProtectedPage("/bookmarks")}
                  >
                    <Bookmark size={18} />

                    <span>
                      <strong>Saved Decisions</strong>

                      <small>Review bookmarked cases</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setDropdownOpen(false);

                      navigate("/case-collection");
                    }}
                  >
                    <FileSearch size={18} />

                    <span>
                      <strong>Case Collection</strong>

                      <small>Browse decisions by year and month</small>
                    </span>
                  </button>
                </div>

                <div className="header-profile-menu-footer">
                  <button
                    type="button"
                    role="menuitem"
                    className="header-profile-logout-button"
                    onClick={requestLogout}
                  >
                    <LogOut size={18} />
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="header-profile-guest">
                  <UserAvatar user={null} size={56} />

                  <div>
                    <strong>Guest Access</strong>

                    <span>Sign in to save decisions and use AI tools.</span>
                  </div>
                </div>

                <div className="header-profile-menu-group">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigateToAuthentication("LOGIN")}
                  >
                    <LogIn size={18} />

                    <span>
                      <strong>Sign In</strong>

                      <small>Access your LexMiner account</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => navigateToAuthentication("REGISTER")}
                  >
                    <UserRoundPlus size={18} />

                    <span>
                      <strong>Create Account</strong>

                      <small>Register for AI research tools</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setDropdownOpen(false);

                      navigate("/case-collection");
                    }}
                  >
                    <FileSearch size={18} />

                    <span>
                      <strong>Case Collection</strong>

                      <small>Browse public Supreme Court decisions</small>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {logoutModalOpen && (
        <div
          className="profile-logout-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !logoutLoading) {
              setLogoutModalOpen(false);
            }
          }}
        >
          <section
            className="profile-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-logout-title"
          >
            <button
              type="button"
              className="profile-logout-modal-close"
              onClick={() => setLogoutModalOpen(false)}
              disabled={logoutLoading}
              aria-label="Close logout confirmation"
            >
              <X size={18} />
            </button>

            <div className="profile-logout-modal-icon">
              <LogOut size={28} />
            </div>

            <span>End user session</span>

            <h2 id="profile-logout-title">Sign out of LexMiner?</h2>

            <p>You will return to public guest access after signing out.</p>

            {logoutError && (
              <div className="profile-logout-modal-error">{logoutError}</div>
            )}

            <div className="profile-logout-modal-actions">
              <button
                type="button"
                onClick={() => setLogoutModalOpen(false)}
                disabled={logoutLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="profile-logout-confirm-button"
                onClick={confirmLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <>
                    <LoaderCircle size={17} className="profile-dropdown-spin" />
                    Signing Out
                  </>
                ) : (
                  <>
                    <LogOut size={17} />
                    Sign Out
                  </>
                )}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
