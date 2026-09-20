import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRight,
  Bookmark,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleUserRound,
  FileSearch,
  Fingerprint,
  Globe2,
  History,
  LoaderCircle,
  LogIn,
  LogOut,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserRoundPlus,
  X,
  ArrowUpRight,
  BookOpen,
  ExternalLink,
  Landmark,
  Mail,
  Scale,
} from "lucide-react";

import { NavLink, useLocation, useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";

import {
  getStoredUser,
  getUserAccessToken,
  logoutUser,
} from "../../services/userAuthService";

import {
  getVisitorSessionId,
  recordVisitorVisit,
} from "../../services/visitorLogService";

import { semanticSearch } from "../../services/userService";

import "../../styles/user-home.css";

import UserProfileDropdown from "../../components/user/UserProfileDropdown";

import ScrollToTopButton from "../../components/common/ScrollToTopButton";

/* =========================================================
   PAGE LOADER STEPS
========================================================= */

const PAGE_LOADING_STEPS = [
  {
    id: 1,
    label: "Initializing semantic legal search",
  },
  {
    id: 2,
    label: "Connecting Supreme Court case repository",
  },
  {
    id: 3,
    label: "Loading legal intelligence tools",
  },
  {
    id: 4,
    label: "Preparing LexMiner homepage",
  },
];

/* =========================================================
   SEARCH FILTER DEFAULTS
========================================================= */

const DEFAULT_SEARCH_FILTERS = {
  year: "",
  division: "",
  caseNumber: "",
  sortBy: "relevance",
};

const SEARCH_RESULT_LIMIT = 10;

const SEARCH_DROPDOWN = {
  HEADER: "HEADER",
  HERO: "HERO",
};

const CASE_NUMBER_CHOICES = [
  { value: "", label: "Any case classification" },
  { value: "G.R.", label: "G.R. — General Register" },
  { value: "A.C.", label: "A.C. — Administrative Case" },
  { value: "A.M.", label: "A.M. — Administrative Matter" },
];

const DIVISION_CHOICES = [
  { value: "", label: "All divisions" },
  { value: "En Banc", label: "En Banc" },
  { value: "First Division", label: "First Division" },
  { value: "Second Division", label: "Second Division" },
  { value: "Third Division", label: "Third Division" },
];

function createYearChoices() {
  const currentYear = new Date().getFullYear();
  const earliestYear = 2016;

  return Array.from(
    { length: currentYear - earliestYear + 1 },
    (_, index) => currentYear - index,
  );
}

/* =========================================================
   FIRST VISIT LOGIN MODAL KEY
========================================================= */

const FIRST_VISIT_MODAL_KEY = "lexminer-first-visit-login-modal-shown";

/* =========================================================
   AUTH STORAGE CHECK
========================================================= */

function getAuthenticatedUser() {
  const accessToken = getUserAccessToken();

  const storedUser = getStoredUser();

  if (!accessToken || !storedUser) {
    return null;
  }

  return storedUser;
}

/* =========================================================
   USER DISPLAY NAME
========================================================= */

function getUserDisplayName(user) {
  if (!user) {
    return "Guest";
  }

  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  if (fullName) {
    return fullName;
  }

  if (user.email) {
    return String(user.email).split("@")[0];
  }

  return "LexMiner User";
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function UserHomePage() {
  const navigate = useNavigate();

  const location = useLocation();

  const headerFilterRef = useRef(null);

  const heroFilterRef = useRef(null);

  const searchRequestRef = useRef(false);

  /* =======================================================
     PAGE LOADER
  ======================================================= */

  const [pageLoading, setPageLoading] = useState(true);

  const [loadingStep, setLoadingStep] = useState(0);

  /* =======================================================
     AUTHENTICATION STATE
  ======================================================= */

  const [currentUser, setCurrentUser] = useState(() => getAuthenticatedUser());

  /* =======================================================
     HEADER STATE
  ======================================================= */

  const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);

  /* =======================================================
     LOGIN MODAL STATE
  ======================================================= */

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [loginModalReason, setLoginModalReason] = useState("first-visit");

  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false);

  const [logoutError, setLogoutError] = useState("");

  /* =======================================================
     SEARCH STATE
  ======================================================= */

  const [searchQuery, setSearchQuery] = useState("");

  const [searchFilters, setSearchFilters] = useState(DEFAULT_SEARCH_FILTERS);

  const [searchLoading, setSearchLoading] = useState(false);

  const [searchError, setSearchError] = useState("");

  const searchYears = useMemo(() => createYearChoices(), []);

  const activeFilterCount = useMemo(
    () =>
      [
        searchFilters.year,
        searchFilters.division,
        searchFilters.caseNumber,
      ].filter(Boolean).length,
    [searchFilters.year, searchFilters.division, searchFilters.caseNumber],
  );

  /* =======================================================
     VISITOR LOG STATE
  ======================================================= */

  const [visitorLogging, setVisitorLogging] = useState(false);

  const [visitorLogCompleted, setVisitorLogCompleted] = useState(false);

  /* =======================================================
     CURRENT USER LABEL
  ======================================================= */

  const currentUserName = useMemo(
    () => getUserDisplayName(currentUser),
    [currentUser],
  );

  /* =======================================================
     INITIAL PAGE LOADER
  ======================================================= */

  useEffect(() => {
    if (!pageLoading) {
      return undefined;
    }

    const stepInterval = window.setInterval(() => {
      setLoadingStep((current) => {
        if (current >= PAGE_LOADING_STEPS.length - 1) {
          window.clearInterval(stepInterval);

          return current;
        }

        return current + 1;
      });
    }, 360);

    const finishTimer = window.setTimeout(() => {
      setPageLoading(false);
    }, 1750);

    return () => {
      window.clearInterval(stepInterval);

      window.clearTimeout(finishTimer);
    };
  }, [pageLoading]);

  /* =======================================================
     REFRESH AUTHENTICATION STATE
  ======================================================= */

  useEffect(() => {
    function syncAuthenticationState() {
      setCurrentUser(getAuthenticatedUser());
    }

    window.addEventListener("storage", syncAuthenticationState);

    window.addEventListener("lexminer-auth-changed", syncAuthenticationState);

    return () => {
      window.removeEventListener("storage", syncAuthenticationState);

      window.removeEventListener(
        "lexminer-auth-changed",
        syncAuthenticationState,
      );
    };
  }, []);

  /* =======================================================
     RECORD VISITOR LOG
  ======================================================= */

  useEffect(() => {
    if (pageLoading || visitorLogCompleted || visitorLogging) {
      return undefined;
    }

    let cancelled = false;

    async function createVisitorLog() {
      setVisitorLogging(true);

      try {
        await recordVisitorVisit(`${location.pathname}${location.search}`);

        if (!cancelled) {
          setVisitorLogCompleted(true);
        }
      } finally {
        if (!cancelled) {
          setVisitorLogging(false);
        }
      }
    }

    createVisitorLog();

    return () => {
      cancelled = true;
    };
  }, [
    location.pathname,
    location.search,
    pageLoading,
    visitorLogCompleted,
    visitorLogging,
  ]);

  /* =======================================================
     FIRST-VISIT LOGIN MODAL
  ======================================================= */

  useEffect(() => {
    if (pageLoading || currentUser) {
      return;
    }

    const modalAlreadyShown = sessionStorage.getItem(FIRST_VISIT_MODAL_KEY);

    if (modalAlreadyShown === "true") {
      return;
    }

    const modalTimer = window.setTimeout(() => {
      setLoginModalReason("first-visit");

      setLoginModalOpen(true);

      sessionStorage.setItem(FIRST_VISIT_MODAL_KEY, "true");
    }, 700);

    return () => {
      window.clearTimeout(modalTimer);
    };
  }, [currentUser, pageLoading]);

  /* =======================================================
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
  ======================================================= */

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      const clickedHeaderFilter = headerFilterRef.current?.contains(
        event.target,
      );
      const clickedHeroFilter = heroFilterRef.current?.contains(event.target);

      if (!clickedHeaderFilter && !clickedHeroFilter) {
        setActiveFilterDropdown(null);
      }
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
    };
  }, []);

  /* =======================================================
     ESCAPE KEY
  ======================================================= */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setActiveFilterDropdown(null);

      setLoginModalOpen(false);
      setLogoutConfirmationOpen(false);
      setSearchError("");
      setLogoutError("");
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /* =======================================================
     FILTER CHANGE
  ======================================================= */

  function handleFilterChange(fieldName, value) {
    setSearchFilters((current) => ({
      ...current,
      [fieldName]: value,
    }));

    setSearchError("");
  }

  /* =======================================================
     CASE NUMBER CLASSIFICATION
  ======================================================= */

  function handleCaseNumberTypeChange(event) {
    setSearchFilters((current) => ({
      ...current,
      caseNumber: event.target.value,
    }));

    setSearchError("");
  }

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  function resetSearchFilters() {
    setSearchFilters({ ...DEFAULT_SEARCH_FILTERS });
    setSearchError("");
  }

  /* =======================================================
     SEARCH ERROR MESSAGE
  ======================================================= */

  function getSearchErrorMessage(requestError) {
    const detail = requestError?.response?.data?.detail;

    if (typeof detail === "string") {
      return detail;
    }

    if (Array.isArray(detail)) {
      return detail
        .map((item) => item?.msg || item?.message || "Invalid search value.")
        .join(" ");
    }

    return (
      requestError?.message ||
      "LexMiner could not complete the semantic search. Please try again."
    );
  }

  /* =======================================================
     SEARCH SUBMIT
  ======================================================= */

  async function handleSearchSubmit(event) {
    event?.preventDefault?.();

    if (searchLoading || searchRequestRef.current) {
      return;
    }

    const normalizedQuery = String(searchQuery || "")
      .trim()
      .replace(/\s+/g, " ");

    const normalizedCaseNumber = String(searchFilters.caseNumber || "")
      .trim()
      .replace(/\s+/g, " ");

    if (!normalizedQuery && !normalizedCaseNumber) {
      setSearchError(
        "Enter a legal issue, factual situation, doctrine, or case number.",
      );
      return;
    }

    searchRequestRef.current = true;
    setSearchLoading(true);
    setSearchError("");
    setActiveFilterDropdown(null);

    try {
      const response = await semanticSearch(normalizedQuery, {
        limit: SEARCH_RESULT_LIMIT,
        year: searchFilters.year || null,
        division: searchFilters.division || null,
        caseNumber: normalizedCaseNumber || null,
      });

      const params = new URLSearchParams();

      if (normalizedQuery) params.set("q", normalizedQuery);
      if (searchFilters.year) params.set("year", searchFilters.year);
      if (searchFilters.division) {
        params.set("division", searchFilters.division);
      }
      if (normalizedCaseNumber) {
        params.set("caseNumber", normalizedCaseNumber);
      }
      if (searchFilters.sortBy) params.set("sortBy", searchFilters.sortBy);

      params.set("limit", String(SEARCH_RESULT_LIMIT));

      navigate(`/search/result?${params.toString()}`, {
        state: {
          semanticSearchResponse: response,
          searchRequest: {
            query: normalizedQuery,
            limit: SEARCH_RESULT_LIMIT,
            filters: {
              year: searchFilters.year || null,
              division: searchFilters.division || null,
              case_number: normalizedCaseNumber || null,
            },
            sortBy: searchFilters.sortBy,
          },
        },
      });
    } catch (requestError) {
      setSearchError(getSearchErrorMessage(requestError));
    } finally {
      searchRequestRef.current = false;
      setSearchLoading(false);
    }
  }

  /* =======================================================
     SEARCH FILTER DROPDOWN
  ======================================================= */

  function renderSearchFilterDropdown(dropdownType) {
    const dropdownId =
      dropdownType === SEARCH_DROPDOWN.HEADER
        ? "header-search-filters"
        : "hero-search-filters";

    return (
      <div
        id={dropdownId}
        className="semantic-search-filter-dropdown"
        role="dialog"
        aria-label="Semantic search filters"
      >
        <div className="semantic-filter-dropdown-header">
          <div>
            <strong>Refine Legal Search</strong>
            <span>Apply optional Supreme Court case metadata.</span>
          </div>

          <button
            type="button"
            className="semantic-filter-reset"
            onClick={resetSearchFilters}
            disabled={activeFilterCount === 0}
          >
            Reset
          </button>
        </div>

        <div className="semantic-filter-dropdown-content">
          <label className="semantic-filter-field">
            <span>Case Classification</span>
            <select
              value={
                CASE_NUMBER_CHOICES.some(
                  (choice) => choice.value === searchFilters.caseNumber,
                )
                  ? searchFilters.caseNumber
                  : ""
              }
              onChange={handleCaseNumberTypeChange}
            >
              {CASE_NUMBER_CHOICES.map((choice) => (
                <option key={choice.value || "all"} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
            <small>Choose G.R., A.C., or A.M.</small>
          </label>

          <label className="semantic-filter-field semantic-filter-field-wide">
            <span>Specific Case Number</span>
            <div className="semantic-case-number-input">
              <FileSearch size={17} />
              <input
                type="text"
                value={searchFilters.caseNumber}
                onChange={(event) =>
                  handleFilterChange("caseNumber", event.target.value)
                }
                placeholder="Example: G.R. No. 123456"
                autoComplete="off"
              />
            </div>
            <small>
              Use a partial prefix or enter the complete case number.
            </small>
          </label>

          <label className="semantic-filter-field">
            <span>Decision Year</span>
            <select
              value={searchFilters.year}
              onChange={(event) =>
                handleFilterChange("year", event.target.value)
              }
            >
              <option value="">All years</option>
              {searchYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>

          <label className="semantic-filter-field">
            <span>Supreme Court Division</span>
            <select
              value={searchFilters.division}
              onChange={(event) =>
                handleFilterChange("division", event.target.value)
              }
            >
              {DIVISION_CHOICES.map((choice) => (
                <option key={choice.value || "all"} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </select>
          </label>

          <label className="semantic-filter-field">
            <span>Result Order</span>
            <select
              value={searchFilters.sortBy}
              onChange={(event) =>
                handleFilterChange("sortBy", event.target.value)
              }
            >
              <option value="relevance">Most relevant</option>
              <option value="newest">Newest decisions</option>
              <option value="oldest">Oldest decisions</option>
            </select>
          </label>
        </div>

        <div className="semantic-filter-dropdown-footer">
          <span>
            {activeFilterCount > 0
              ? `${activeFilterCount} metadata ${
                  activeFilterCount === 1 ? "filter" : "filters"
                } selected`
              : "All metadata filters are optional"}
          </span>

          <button
            type="button"
            className="semantic-filter-apply"
            onClick={() => setActiveFilterDropdown(null)}
          >
            <Check size={16} />
            Apply Filters
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     SHARED SEMANTIC SEARCH
  ======================================================= */

  function renderSemanticSearch(locationType) {
    const isHeader = locationType === SEARCH_DROPDOWN.HEADER;
    const dropdownOpen = activeFilterDropdown === locationType;
    const filterRef = isHeader ? headerFilterRef : heroFilterRef;

    return (
      <form
        className={isHeader ? "header-semantic-search" : "hero-semantic-search"}
        onSubmit={handleSearchSubmit}
        noValidate
      >
        <div
          className={
            isHeader ? "header-semantic-search-input" : "hero-search-input-area"
          }
        >
          {searchLoading ? (
            <LoaderCircle size={isHeader ? 19 : 23} className="home-spin" />
          ) : (
            <Search size={isHeader ? 19 : 23} />
          )}

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setSearchError("");
            }}
            placeholder={
              isHeader
                ? "Describe a legal issue or enter a case number..."
                : "Describe a legal issue, case scenario, doctrine, or case number..."
            }
            aria-label="Search Philippine Supreme Court decisions"
            disabled={searchLoading}
          />
        </div>

        <div
          className={
            isHeader ? "header-semantic-search-actions" : "hero-search-actions"
          }
          ref={filterRef}
        >
          <button
            type="button"
            className={`${
              isHeader ? "header-semantic-filter-button" : "hero-filter-button"
            } ${
              dropdownOpen
                ? isHeader
                  ? "header-semantic-filter-button-active"
                  : "hero-filter-button-active"
                : ""
            }`}
            onClick={() =>
              setActiveFilterDropdown((current) =>
                current === locationType ? null : locationType,
              )
            }
            aria-expanded={dropdownOpen}
            aria-controls={
              isHeader ? "header-search-filters" : "hero-search-filters"
            }
            disabled={searchLoading}
          >
            <SlidersHorizontal size={17} />
            <span>Filters</span>

            {activeFilterCount > 0 && (
              <strong className="semantic-filter-count">
                {activeFilterCount}
              </strong>
            )}

            <ChevronDown
              size={16}
              className={dropdownOpen ? "dropdown-chevron-open" : ""}
            />
          </button>

          <button
            type="submit"
            className={
              isHeader ? "header-semantic-search-submit" : "hero-search-submit"
            }
            disabled={searchLoading}
          >
            {searchLoading ? (
              <LoaderCircle size={18} className="home-spin" />
            ) : (
              <Search size={18} />
            )}

            <span>
              {searchLoading
                ? "Searching..."
                : isHeader
                  ? "Search"
                  : "Search Cases"}
            </span>

            {!searchLoading && <ArrowRight size={17} />}
          </button>

          {dropdownOpen && renderSearchFilterDropdown(locationType)}
        </div>
      </form>
    );
  }

  /* =======================================================
     OPEN LOGIN MODAL
  ======================================================= */

  const openLoginModal = useCallback((reason = "protected-feature") => {
    setLoginModalReason(reason);

    setLoginModalOpen(true);
  }, []);

  /* =======================================================
     BOOKMARK NAVIGATION
  ======================================================= */

  /* =======================================================
     PROFILE NAVIGATION
  ======================================================= */

  /* =======================================================
     LOGIN NAVIGATION
  ======================================================= */

  function handleLoginNavigation() {
    setLoginModalOpen(false);

    navigate("/authentication", {
      state: {
        authMode: "LOGIN",
        from: location.pathname + location.search,
      },
    });
  }

  /* =======================================================
     REGISTER NAVIGATION
  ======================================================= */

  function handleRegisterNavigation() {
    setLoginModalOpen(false);

    navigate("/authentication", {
      state: {
        authMode: "REGISTER",
        from: location.pathname + location.search,
      },
    });
  }

  /* =======================================================
     CONTINUE AS GUEST
  ======================================================= */

  function handleContinueAsGuest() {
    getVisitorSessionId();

    setLoginModalOpen(false);

    sessionStorage.setItem(FIRST_VISIT_MODAL_KEY, "true");
  }

  /* =======================================================
     LOGOUT
  ======================================================= */

  function closeLogoutConfirmation() {
    if (logoutLoading) {
      return;
    }

    setLogoutConfirmationOpen(false);
    setLogoutError("");
  }

  async function confirmLogout() {
    if (logoutLoading) {
      return;
    }

    setLogoutLoading(true);
    setLogoutError("");

    try {
      await logoutUser();
    } catch (requestError) {
      // The auth service is expected to clear local tokens even when
      // the server logout request fails. Continue with local logout.
      console.error("Logout request failed:", requestError);
    } finally {
      setCurrentUser(null);
      setLogoutLoading(false);
      setLogoutConfirmationOpen(false);

      window.dispatchEvent(new Event("lexminer-auth-changed"));

      navigate("/", {
        replace: true,
      });
    }
  }

  /* =======================================================
     PAGE LOADER UI
  ======================================================= */

  if (pageLoading) {
    const loadingPercentage =
      ((loadingStep + 1) / PAGE_LOADING_STEPS.length) * 99;

    return (
      <div className="user-home-loader">
        {/* ===============================================
          ANIMATED BACKGROUND
      =============================================== */}

        <div className="home-loader-background">
          <div className="home-loader-grid" />

          <span className="home-loader-orb home-loader-orb-one" />

          <span className="home-loader-orb home-loader-orb-two" />

          <span className="home-loader-orb home-loader-orb-three" />

          <span className="home-loader-particle loader-particle-one" />

          <span className="home-loader-particle loader-particle-two" />

          <span className="home-loader-particle loader-particle-three" />
        </div>

        {/* ===============================================
          LOADER CARD
      =============================================== */}

        <div
          className="home-loader-card"
          role="status"
          aria-live="polite"
          aria-label="Loading LexMiner homepage"
        >
          {/* =============================================
            LOGO VISUAL
        ============================================= */}

          <div className="home-loader-logo-shell">
            <span className="home-loader-ring home-loader-ring-one" />

            <span className="home-loader-ring home-loader-ring-two" />

            <span className="home-loader-ring home-loader-ring-three" />

            <div className="home-loader-logo-center">
              <img src={lexminerLogo} alt="LexMiner" />
            </div>
          </div>

          {/* =============================================
            BRAND
        ============================================= */}

          <span className="home-loader-eyebrow">
            AI-assisted Philippine legal intelligence
          </span>

          <h1>LexMiner</h1>

          <p className="home-loader-description">
            AI Adaptive Language Case Decision Miner
          </p>

          {/* =============================================
            CURRENT LOADING MESSAGE
        ============================================= */}

          <div className="home-loader-current-status">
            <LoaderCircle size={17} className="home-spin" />

            <span>
              {PAGE_LOADING_STEPS[loadingStep]?.label ||
                "Preparing LexMiner homepage"}
            </span>
          </div>

          {/* =============================================
            PROGRESS BAR
        ============================================= */}

          <div
            className="home-loader-progress"
            aria-valuemin="0"
            aria-valuemax="99"
            aria-valuenow={Math.round(loadingPercentage)}
            role="progressbar"
          >
            <span
              style={{
                width: `${loadingPercentage}%`,
              }}
            />
          </div>

          <div className="home-loader-progress-copy">
            <span>Loading secure legal research tools</span>

            <strong>{Math.round(loadingPercentage)}%</strong>
          </div>

          {/* =============================================
            LOADING STEPS
        ============================================= */}

          <div className="home-loader-steps">
            {PAGE_LOADING_STEPS.map((step, index) => {
              const completed = index < loadingStep;

              const active = index === loadingStep;

              return (
                <div
                  key={step.id}
                  className={`home-loader-step ${
                    completed ? "home-loader-step-completed" : ""
                  } ${active ? "home-loader-step-active" : ""}`}
                >
                  <span className="home-loader-step-marker">
                    {completed ? (
                      <Check size={14} />
                    ) : active ? (
                      <LoaderCircle size={14} className="home-spin" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <span className="home-loader-step-copy">{step.label}</span>
                </div>
              );
            })}
          </div>

          <div className="home-loader-security">
            <ShieldCheck size={16} />

            <span>Establishing a secure LexMiner session</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="user-home-page">
      {/* =====================================================
    Animated Background
===================================================== */}

      <div className="home-background">
        <span className="floating-orb orb-one" />

        <span className="floating-orb orb-two" />

        <span className="floating-orb orb-three" />

        <span className="grid-overlay" />
      </div>

      {/* =====================================================
    HEADER
===================================================== */}

      <header className="user-home-header">
        {/* ==========================================
    TOP HEADER
========================================== */}

        <div className="header-top">
          {/* LEFT */}

          <div className="header-brand" onClick={() => navigate("/")}>
            <div>
              <h2>LexMiner</h2>

              <span>AI Assisted Legal Argument Mining System</span>
            </div>
          </div>

          {/* ==========================================
    SEARCH
========================================== */}

          <div className="header-search-area">
            {renderSemanticSearch(SEARCH_DROPDOWN.HEADER)}

            {searchError && (
              <div className="header-search-error" role="alert">
                <X size={15} />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* ==========================================
    PROFILE
========================================== */}

          <UserProfileDropdown />
        </div>

        {/* ==========================================
    SECOND HEADER
========================================== */}

        <div className="header-bottom">
          <nav className="left-navigation">
            <NavLink to="/">Home</NavLink>

            <button
              onClick={() => {
                document.getElementById("about")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              About
            </button>

            <button
              onClick={() => {
                document.getElementById("contact")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Contact
            </button>

            <button
              onClick={() => {
                document.getElementById("tradition")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Challenges
            </button>
          </nav>

          <div className="center-logo" onClick={() => navigate("/")}>
            <img src={lexminerLogo} alt="LexMiner" />
          </div>

          <nav className="right-navigation">
            <button
              onClick={() => {
                document.getElementById("workflow")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Workflow
            </button>

            <button
              onClick={() => {
                document.getElementById("tutorial")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Operation
            </button>

            <button
              onClick={() => {
                document.getElementById("impact")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Purpose
            </button>

            <button
              onClick={() => {
                document.getElementById("link")?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
            >
              Links
            </button>
          </nav>
        </div>
      </header>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="user-home-main">
        {/* =================================================
            HERO SECTION
        ================================================= */}

        <section className="home-hero-section">
          <div className="hero-background-effects">
            <span className="hero-orbit hero-orbit-one" />

            <span className="hero-orbit hero-orbit-two" />

            <span className="hero-glow hero-glow-one" />

            <span className="hero-glow hero-glow-two" />

            <span className="hero-particle hero-particle-one" />

            <span className="hero-particle hero-particle-two" />

            <span className="hero-particle hero-particle-three" />
          </div>

          <div className="hero-content" id="search">
            <div className="hero-badge">
              <Sparkles size={17} />

              <span>AI-powered Philippine legal intelligence</span>
            </div>

            <div className="hero-logo-visual">
              <span className="hero-logo-ring hero-logo-ring-one" />

              <span className="hero-logo-ring hero-logo-ring-two" />

              <span className="hero-logo-ring hero-logo-ring-three" />

              <div className="hero-logo-center">
                <img src={lexminerLogo} alt="LexMiner" />
              </div>
            </div>

            <h1>
              Search Philippine Supreme Court decisions with
              <span> semantic intelligence.</span>
            </h1>

            <p className="hero-description">
              LexMiner understands legal issues, facts, arguments, and outcomes
              beyond exact keyword matching. Describe your legal concern in
              natural language and discover relevant case decisions faster.
            </p>

            {/* ===============================================
                MAIN HERO SEARCH
            =============================================== */}

            <div className="hero-semantic-search-area">
              {renderSemanticSearch(SEARCH_DROPDOWN.HERO)}

              {searchError && (
                <div className="semantic-search-error" role="alert">
                  <X size={17} />
                  <span>{searchError}</span>
                  <button
                    type="button"
                    onClick={() => setSearchError("")}
                    aria-label="Close search error"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}
            </div>

            {/* ===============================================
                HERO FILTER SUMMARY
            =============================================== */}

            <div className="hero-filter-summary">
              <div>
                <ShieldCheck size={16} />

                <span>Semantic matching</span>
              </div>

              <div>
                <BrainCircuit size={16} />

                <span>Legal concept expansion</span>
              </div>

              <div>
                <FileSearch size={16} />

                <span>Supreme Court-focused results</span>
              </div>
            </div>

            {/* ===============================================
                GUEST ACCESS STATUS
            =============================================== */}

            {!currentUser && (
              <div className="hero-guest-access">
                <Globe2 size={17} />

                <span>
                  You are browsing as a guest. Public case decisions and
                  semantic search remain available.
                </span>

                <button
                  type="button"
                  onClick={() => openLoginModal("hero-account")}
                >
                  Sign in to access AI Features.
                </button>
              </div>
            )}

            {currentUser && (
              <div className="hero-authenticated-access">
                <Fingerprint size={17} />

                <span>
                  Signed in as
                  <strong> {currentUserName}</strong>
                </span>

                <button type="button">
                  Enjoy the AI Fetures of our System
                </button>
              </div>
            )}
          </div>

          {/* =================================================
              HERO FEATURE CARDS
          ================================================= */}

          <div className="hero-feature-grid">
            <article className="hero-feature-card">
              <span className="hero-feature-icon">
                <BrainCircuit size={23} />
              </span>

              <div>
                <strong>Semantic Understanding</strong>

                <p>
                  Search using legal situations, facts, and natural-language
                  descriptions instead of exact keywords.
                </p>
              </div>
            </article>

            <article className="hero-feature-card">
              <span className="hero-feature-icon">
                <Fingerprint size={23} />
              </span>

              <div>
                <strong>Legal Argument Mining</strong>

                <p>
                  Identify case issues, arguments, legal basis, reasoning, and
                  final rulings.
                </p>
              </div>
            </article>

            <article className="hero-feature-card">
              <span className="hero-feature-icon">
                <ShieldCheck size={23} />
              </span>

              <div>
                <strong>Reliable Research Workflow</strong>

                <p>
                  Review the original decision alongside AI-assisted research
                  insights.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* =================================================
            TRADITIONAL LEGAL RESEARCH CHALLENGES
        ================================================= */}

        <section className="traditional-method-section" id="tradition">
          <div className="home-section-heading home-section-heading-centered">
            <div>
              <span className="home-section-eyebrow">
                <History size={16} />
                Traditional legal research
              </span>

              <h2>Why conventional case research can be difficult</h2>

              <p>
                Traditional legal research often depends on exact keywords,
                manual document review, and repeated comparison of lengthy
                decisions. This can make relevant precedents harder to discover.
              </p>
            </div>
          </div>

          <div className="traditional-method-layout">
            <article className="traditional-method-overview">
              <div className="traditional-overview-visual">
                <span className="traditional-visual-ring traditional-ring-one" />

                <span className="traditional-visual-ring traditional-ring-two" />

                <div className="traditional-visual-center">
                  <History size={34} />
                </div>
              </div>

              <span className="traditional-method-label">
                Conventional workflow
              </span>

              <h3>
                Manual searching requires significant time and repeated effort.
              </h3>

              <p>
                Researchers may need to open many documents, identify useful
                passages manually, and compare legal reasoning across several
                decisions before finding a relevant precedent.
              </p>

              <div className="traditional-method-statistics">
                <div>
                  <strong>Multiple</strong>
                  <span>documents to inspect</span>
                </div>

                <div>
                  <strong>Exact</strong>
                  <span>keywords often required</span>
                </div>

                <div>
                  <strong>Manual</strong>
                  <span>case comparison</span>
                </div>
              </div>
            </article>

            <div className="traditional-challenge-flow">
              <article className="traditional-challenge-card">
                <span className="traditional-challenge-number">01</span>

                <div className="traditional-challenge-icon">
                  <FileSearch size={23} />
                </div>

                <div>
                  <h3>Large volumes of case decisions</h3>

                  <p>
                    Researchers must examine many lengthy Supreme Court
                    decisions to determine whether each case is relevant.
                  </p>
                </div>
              </article>

              <span className="traditional-flow-connector">
                <ArrowRight size={18} />
              </span>

              <article className="traditional-challenge-card">
                <span className="traditional-challenge-number">02</span>

                <div className="traditional-challenge-icon">
                  <Search size={23} />
                </div>

                <div>
                  <h3>Exact keyword dependence</h3>

                  <p>
                    Relevant decisions may use different terminology even when
                    they discuss the same legal issue or factual situation.
                  </p>
                </div>
              </article>

              <span className="traditional-flow-connector">
                <ArrowRight size={18} />
              </span>

              <article className="traditional-challenge-card">
                <span className="traditional-challenge-number">03</span>

                <div className="traditional-challenge-icon">
                  <History size={23} />
                </div>

                <div>
                  <h3>Time-consuming comparison</h3>

                  <p>
                    Legal issues, arguments, rulings, and doctrines must often
                    be compared manually across multiple decisions.
                  </p>
                </div>
              </article>

              <span className="traditional-flow-connector">
                <ArrowRight size={18} />
              </span>

              <article className="traditional-challenge-card">
                <span className="traditional-challenge-number">04</span>

                <div className="traditional-challenge-icon">
                  <X size={23} />
                </div>

                <div>
                  <h3>Relevant precedents may be missed</h3>

                  <p>
                    A case can remain undiscovered when its language differs
                    from the researcher’s original search terms.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =================================================
            LEXMINER SOLUTION PROCESS
        ================================================= */}

        <section className="lexminer-method-section" id="workflow">
          <div className="lexminer-method-background">
            <span className="method-background-orb method-orb-one" />
            <span className="method-background-orb method-orb-two" />
            <span className="method-background-grid" />
          </div>

          <div className="home-section-heading method-section-heading">
            <div>
              <span className="home-section-eyebrow method-section-eyebrow">
                <BrainCircuit size={16} />
                LexMiner intelligent workflow
              </span>

              <h2>
                A semantic research process designed to reduce manual effort
              </h2>

              <p>
                LexMiner expands the user’s legal query, identifies related
                legal concepts, retrieves semantically similar decision
                passages, and organizes results for faster review.
              </p>
            </div>

            <button
              type="button"
              className="home-section-action method-section-action"
              onClick={() => navigate("/case-collection")}
            >
              Explore decisions
              <ArrowRight size={17} />
            </button>
          </div>

          <div className="lexminer-process-grid">
            <article className="lexminer-process-card">
              <span className="lexminer-process-step">Step 01</span>

              <div className="lexminer-process-icon">
                <Search size={25} />
              </div>

              <h3>Describe the legal issue</h3>

              <p>
                Enter a legal concern, factual scenario, doctrine, or case
                situation using natural language.
              </p>

              <span className="lexminer-process-line" />
            </article>

            <article className="lexminer-process-card">
              <span className="lexminer-process-step">Step 02</span>

              <div className="lexminer-process-icon">
                <BrainCircuit size={25} />
              </div>

              <h3>Interpret legal meaning</h3>

              <p>
                The query is expanded using related legal concepts, common
                terminology, and recognized case scenarios.
              </p>

              <span className="lexminer-process-line" />
            </article>

            <article className="lexminer-process-card">
              <span className="lexminer-process-step">Step 03</span>

              <div className="lexminer-process-icon">
                <Fingerprint size={25} />
              </div>

              <h3>Match semantic case content</h3>

              <p>
                LexMiner compares the query with embedded case passages based on
                contextual similarity rather than exact words alone.
              </p>

              <span className="lexminer-process-line" />
            </article>

            <article className="lexminer-process-card">
              <span className="lexminer-process-step">Step 04</span>

              <div className="lexminer-process-icon">
                <FileSearch size={25} />
              </div>

              <h3>Rank relevant decisions</h3>

              <p>
                Matching case decisions are grouped and ranked using their most
                relevant passages and similarity scores.
              </p>

              <span className="lexminer-process-line" />
            </article>

            <article className="lexminer-process-card">
              <span className="lexminer-process-step">Step 05</span>

              <div className="lexminer-process-icon">
                <ShieldCheck size={25} />
              </div>

              <h3>Review legal intelligence</h3>

              <p>
                Users can review the full decision with AI-assisted summaries,
                identified arguments, legal bases, and rulings.
              </p>
            </article>
          </div>

          <div className="method-comparison-panel">
            <div className="method-comparison-side traditional-comparison-side">
              <span className="comparison-label">Traditional method</span>

              <h3>Search, open, inspect, and compare manually</h3>

              <ul>
                <li>
                  <X size={16} />
                  Depends heavily on exact legal wording
                </li>

                <li>
                  <X size={16} />
                  Requires opening many unrelated results
                </li>

                <li>
                  <X size={16} />
                  Manual issue and ruling extraction
                </li>

                <li>
                  <X size={16} />
                  Repeated document comparison
                </li>
              </ul>
            </div>

            <div className="method-comparison-center">
              <span>VS</span>
            </div>

            <div className="method-comparison-side lexminer-comparison-side">
              <span className="comparison-label">LexMiner method</span>

              <h3>Understand, match, rank, and explain intelligently</h3>

              <ul>
                <li>
                  <Check size={16} />
                  Natural-language semantic searching
                </li>

                <li>
                  <Check size={16} />
                  Context-aware case passage retrieval
                </li>

                <li>
                  <Check size={16} />
                  Legal argument identification
                </li>

                <li>
                  <Check size={16} />
                  Organized and ranked case results
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* =================================================
            HOW THE SYSTEM WORKS
        ================================================= */}

        <section className="how-system-works-section" id="tutorial">
          <div className="home-section-heading home-section-heading-centered">
            <div>
              <span className="home-section-eyebrow">
                <Fingerprint size={16} />
                How LexMiner works
              </span>

              <h2>From legal question to relevant Supreme Court decisions</h2>

              <p>
                LexMiner combines structured case metadata, semantic embeddings,
                legal concept matching, and AI-assisted analysis into one
                research workflow.
              </p>
            </div>
          </div>

          <div className="system-workflow-timeline">
            <article className="system-workflow-item">
              <span className="system-workflow-number">01</span>

              <div className="system-workflow-marker">
                <Search size={22} />
              </div>

              <div className="system-workflow-content">
                <span>User input</span>

                <h3>Submit a legal question</h3>

                <p>
                  Users describe the issue using ordinary language, legal
                  terminology, or a factual situation.
                </p>
              </div>
            </article>

            <article className="system-workflow-item">
              <span className="system-workflow-number">02</span>

              <div className="system-workflow-marker">
                <BrainCircuit size={22} />
              </div>

              <div className="system-workflow-content">
                <span>Query understanding</span>

                <h3>Expand concepts and scenarios</h3>

                <p>
                  The system associates the query with related Philippine legal
                  concepts, terminology, and possible case scenarios.
                </p>
              </div>
            </article>

            <article className="system-workflow-item">
              <span className="system-workflow-number">03</span>

              <div className="system-workflow-marker">
                <Fingerprint size={22} />
              </div>

              <div className="system-workflow-content">
                <span>Semantic retrieval</span>

                <h3>Compare with embedded case passages</h3>

                <p>
                  The query embedding is compared with indexed decision chunks
                  stored in the vector database.
                </p>
              </div>
            </article>

            <article className="system-workflow-item">
              <span className="system-workflow-number">04</span>

              <div className="system-workflow-marker">
                <FileSearch size={22} />
              </div>

              <div className="system-workflow-content">
                <span>Case ranking</span>

                <h3>Group and organize matching results</h3>

                <p>
                  Relevant passages are grouped by case and ranked according to
                  semantic similarity.
                </p>
              </div>
            </article>

            <article className="system-workflow-item">
              <span className="system-workflow-number">05</span>

              <div className="system-workflow-marker">
                <ShieldCheck size={22} />
              </div>

              <div className="system-workflow-content">
                <span>Research review</span>

                <h3>Examine the original decision and AI insights</h3>

                <p>
                  Users can inspect the complete case text together with
                  summaries, legal issues, arguments, rulings, and highlighted
                  relevant sections.
                </p>
              </div>
            </article>
          </div>
        </section>
        {/* =================================================
            IMPACT AND ADVANTAGES
        ================================================= */}

        <section className="impact-advantages-section" id="impact">
          <div className="home-section-heading">
            <div>
              <span className="home-section-eyebrow">
                <Sparkles size={16} />
                Research impact
              </span>

              <h2>
                Designed to make Philippine legal research faster and clearer
              </h2>

              <p>
                LexMiner combines semantic retrieval, legal argument mining,
                case metadata, and AI-assisted explanations to support a more
                efficient research process.
              </p>
            </div>
          </div>

          <div className="impact-advantages-grid">
            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <Search size={24} />
              </span>

              <strong>Natural-language searching</strong>

              <p>
                Search using legal questions, facts, and scenarios without
                relying only on exact case terminology.
              </p>
            </article>

            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <BrainCircuit size={24} />
              </span>

              <strong>Semantic case matching</strong>

              <p>
                Discover decisions that discuss related legal meaning even when
                they use different wording.
              </p>
            </article>

            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <Fingerprint size={24} />
              </span>

              <strong>Legal argument mining</strong>

              <p>
                Identify legal issues, arguments, reasoning, legal bases, and
                final rulings from relevant cases.
              </p>
            </article>

            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <FileSearch size={24} />
              </span>

              <strong>Focused case discovery</strong>

              <p>
                Review ranked cases and matching passages rather than sorting
                through large groups of unrelated documents.
              </p>
            </article>

            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <History size={24} />
              </span>

              <strong>Reduced manual effort</strong>

              <p>
                Shorten the time required to inspect, compare, and organize
                Supreme Court decisions.
              </p>
            </article>

            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <ShieldCheck size={24} />
              </span>

              <strong>Original-decision access</strong>

              <p>
                AI-generated insights remain connected to the full Supreme Court
                decision for verification and responsible research.
              </p>
            </article>

            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <Bookmark size={24} />
              </span>

              <strong>Personalized research tools</strong>

              <p>
                Registered users can save cases, review bookmarks, and return to
                previous research activity.
              </p>
            </article>

            <article className="impact-advantage-card">
              <span className="impact-advantage-icon">
                <Globe2 size={24} />
              </span>

              <strong>Public research access</strong>

              <p>
                Guests can browse and search public decisions while account-only
                tools remain protected.
              </p>
            </article>
          </div>

          <div className="impact-summary-panel">
            <div>
              <span>Semantic retrieval</span>

              <strong>Context-aware</strong>

              <small>Finds legal meaning beyond exact words</small>
            </div>

            <div>
              <span>Case intelligence</span>

              <strong>Structured</strong>

              <small>Organizes issues, arguments, and rulings</small>
            </div>

            <div>
              <span>Research workflow</span>

              <strong>Efficient</strong>

              <small>Reduces repeated manual document review</small>
            </div>

            <div>
              <span>Philippine focus</span>

              <strong>Specialized</strong>

              <small>Built around Supreme Court decisions</small>
            </div>
          </div>
        </section>

        {/* =================================================
            ABOUT LEXMINER
        ================================================= */}

        <section className="about-lexminer-section" id="about">
          <div className="about-lexminer-visual">
            <div className="about-visual-grid" />

            <span className="about-visual-orbit about-orbit-one" />

            <span className="about-visual-orbit about-orbit-two" />

            <span className="about-visual-glow" />

            <div className="about-visual-logo">
              <img src={lexminerLogo} alt="LexMiner" />
            </div>

            <div className="about-visual-card about-card-one">
              <BrainCircuit size={20} />

              <div>
                <strong>Domain-Adaptive AI</strong>

                <span>Legal-language understanding</span>
              </div>
            </div>

            <div className="about-visual-card about-card-two">
              <Fingerprint size={20} />

              <div>
                <strong>Argument Mining</strong>

                <span>Issues, reasoning, and rulings</span>
              </div>
            </div>

            <div className="about-visual-card about-card-three">
              <FileSearch size={20} />

              <div>
                <strong>Semantic Retrieval</strong>

                <span>Contextual case matching</span>
              </div>
            </div>
          </div>

          <div className="about-lexminer-content">
            <span className="home-section-eyebrow">
              <CircleUserRound size={16} />
              About the platform
            </span>

            <h2>
              A legal research system built for Philippine Supreme Court
              decisions
            </h2>

            <p>
              LexMiner is an AI-assisted semantic legal research and argument
              mining platform. It helps users discover relevant Supreme Court
              decisions by understanding the legal context of a query rather
              than depending only on literal keyword matches.
            </p>

            <p>
              The platform combines cleaned decision text, document chunks,
              semantic embeddings, structured metadata, legal concept matching,
              and AI-generated research assistance into a unified workflow.
            </p>

            <div className="about-lexminer-points">
              <div>
                <Check size={16} />

                <span>
                  Semantic legal search using natural-language queries
                </span>
              </div>

              <div>
                <Check size={16} />

                <span>Case ranking based on matching legal passages</span>
              </div>

              <div>
                <Check size={16} />

                <span>AI-assisted summaries and legal explanations</span>
              </div>

              <div>
                <Check size={16} />

                <span>Original case text available for verification</span>
              </div>
            </div>

            <div className="about-lexminer-actions">
              <button
                type="button"
                className="about-primary-action"
                onClick={() => navigate("/case-collection")}
              >
                <FileSearch size={18} />
                Browse Case Decisions
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                className="about-secondary-action"
                onClick={() => {
                  document.getElementById("workflow")?.scrollIntoView({
                    behavior: "smooth",
                  });
                }}
              >
                <BrainCircuit size={18} />
                Review the Process
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="lexminer-footer">
        <div className="lexminer-footer-glow" />

        <div className="lexminer-footer-container">
          <div className="lexminer-footer-grid">
            {/* =================================================
          BRAND AND PURPOSE
      ================================================= */}

            <section className="lexminer-footer-brand">
              <div className="lexminer-footer-brand-heading">
                <div className="lexminer-footer-logo-shell">
                  <Scale size={24} />
                </div>

                <div>
                  <strong>LexMiner</strong>

                  <span>AI-Assisted Legal Argument Mining System</span>
                </div>
              </div>

              <p>
                A semantic legal research platform for exploring, analyzing, and
                understanding Philippine Supreme Court decisions.
              </p>

              <div className="lexminer-footer-trust">
                <ShieldCheck size={17} />

                <span>
                  Built for academic legal research and responsible AI-assisted
                  case analysis.
                </span>
              </div>
            </section>

            {/* =================================================
          RESEARCH LINKS
      ================================================= */}

            <section className="lexminer-footer-column">
              <h3>Research</h3>

              <nav aria-label="Research links">
                <a href="/case-collection">
                  <FileSearch size={15} />
                  Case Decision Collection
                </a>

                <a href="/#search">
                  <BookOpen size={15} />
                  Semantic Case Search
                </a>

                <a href="/bookmarks">
                  <BookOpen size={15} />
                  Saved Decisions
                </a>

                <a href="/#workflow">
                  <Scale size={15} />
                  Research Workflow
                </a>
              </nav>
              <h3 className="contact">Contact</h3>

              <nav aria-label="Contact information" id="contact">
                <a href="mailto:YOUR_EMAIL@gmail.com">
                  <Mail size={15} />
                  lexminer.ph@gmail.com
                </a>

                <small className="lexminer-footer-contact-note">
                  For academic inquiries, technical concerns, or feedback
                  regarding LexMiner.
                </small>
              </nav>
            </section>

            {/* =================================================
          OFFICIAL SOURCES
      ================================================= */}

            <section className="lexminer-footer-column">
              <h3>Official Sources</h3>

              <nav aria-label="Official legal sources" id="link">
                <a
                  href="https://elibrary.judiciary.gov.ph/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Landmark size={15} />
                  Supreme Court E-Library
                  <ArrowUpRight size={13} />
                </a>

                <a
                  href="https://sc.judiciary.gov.ph/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Landmark size={15} />
                  Supreme Court of the Philippines
                  <ArrowUpRight size={13} />
                </a>

                <a
                  href="https://elibrary.judiciary.gov.ph/thebookshelf"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <FileSearch size={15} />
                  Decisions and Resolutions
                  <ArrowUpRight size={13} />
                </a>
              </nav>
            </section>

            {/* =================================================
          PLATFORM AND LEGAL
      ================================================= */}

            <section className="lexminer-footer-column">
              <h3>Platform</h3>

              <nav aria-label="Platform links">
                <a href="/#about">About LexMiner</a>

                <a href="/#tutorial">How It Works</a>

                <a href="/privacy-policy">Privacy Policy</a>

                <a href="/terms-of-use">Terms of Use</a>
              </nav>
            </section>
          </div>

          {/* =================================================
        SOURCE ATTRIBUTION
    ================================================= */}

          <section className="lexminer-footer-source">
            <div className="lexminer-footer-source-icon">
              <ExternalLink size={19} />
            </div>

            <div>
              <strong>Decision Source Attribution</strong>

              <p>
                Original Philippine Supreme Court decisions and signed
                resolutions displayed by LexMiner are sourced from the official
                Supreme Court E-Library. LexMiner does not claim ownership of
                official judicial documents.
              </p>
            </div>

            <a
              href="https://elibrary.judiciary.gov.ph/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Visit Official Source
              <ArrowUpRight size={15} />
            </a>
          </section>

          {/* =================================================
        BOTTOM BAR
    ================================================= */}

          <div className="lexminer-footer-bottom">
            <span>
              © {new Date().getFullYear()} LexMiner. AI Assisted Legal Argument
              Mining System.
            </span>

            <span>
              AI-generated summaries and explanations do not constitute legal
              advice.
            </span>
          </div>
        </div>
      </footer>

      <ScrollToTopButton />

      {/* ===================================================
          LOGIN / GUEST ACCESS MODAL
      =================================================== */}

      {loginModalOpen && (
        <div
          className="home-login-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-login-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLoginModalOpen(false);
            }
          }}
        >
          <div className="home-login-modal">
            <button
              type="button"
              className="home-login-modal-close"
              onClick={() => setLoginModalOpen(false)}
              aria-label="Close authentication dialog"
            >
              <X size={20} />
            </button>

            <div className="home-login-modal-visual">
              <span className="home-login-modal-ring modal-ring-one" />
              <span className="home-login-modal-ring modal-ring-two" />

              <div className="home-login-modal-icon">
                {loginModalReason === "bookmarks" ? (
                  <Bookmark size={31} />
                ) : loginModalReason === "profile" ? (
                  <CircleUserRound size={31} />
                ) : (
                  <Fingerprint size={31} />
                )}
              </div>
            </div>

            <span className="home-login-modal-eyebrow">
              Secure LexMiner access
            </span>

            <h2 id="home-login-modal-title">
              {loginModalReason === "bookmarks" &&
                "Sign in to access bookmarks"}

              {loginModalReason === "profile" &&
                "Sign in to access your profile"}

              {loginModalReason !== "bookmarks" &&
                loginModalReason !== "profile" &&
                "Welcome to LexMiner"}
            </h2>

            <p>
              {loginModalReason === "bookmarks" &&
                "Bookmarks are available to registered users so saved cases can be connected to a secure account."}

              {loginModalReason === "profile" &&
                "A registered LexMiner account is required to view and manage profile information."}

              {loginModalReason !== "bookmarks" &&
                loginModalReason !== "profile" &&
                "Sign in to unlock saved cases, bookmarks, and personalized account tools. You may also continue browsing as a guest."}
            </p>

            <div className="home-login-modal-benefits">
              <div>
                <Bookmark size={17} />
                Save case decisions
              </div>

              <div>
                <History size={17} />
                AI summaries and insights
              </div>

              <div>
                <History size={17} />
                AI plain language explanations
              </div>

              <div>
                <ShieldCheck size={17} />
                Maintain a secure session
              </div>
            </div>

            <button
              type="button"
              className="home-login-modal-primary"
              onClick={handleLoginNavigation}
            >
              <LogIn size={18} />
              Sign In
              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="home-login-modal-register"
              onClick={handleRegisterNavigation}
            >
              <UserRoundPlus size={18} />
              Create an Account
            </button>

            <div className="home-login-modal-divider">
              <span />
              <strong>or</strong>
              <span />
            </div>

            <button
              type="button"
              className="home-login-modal-guest"
              onClick={handleContinueAsGuest}
            >
              <Globe2 size={18} />
              Continue as Guest
            </button>

            <small>
              Guest activity may be recorded for security and aggregate platform
              analytics according to the Privacy Policy.
            </small>
          </div>
        </div>
      )}

      {logoutConfirmationOpen && (
        <div
          className="home-logout-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="home-logout-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeLogoutConfirmation();
            }
          }}
        >
          <div className="home-logout-modal">
            <button
              type="button"
              className="home-logout-modal-close"
              onClick={closeLogoutConfirmation}
              disabled={logoutLoading}
              aria-label="Close logout confirmation"
            >
              <X size={19} />
            </button>

            <div className="home-logout-modal-icon">
              <LogOut size={31} />
            </div>

            <span className="home-logout-modal-eyebrow">Secure session</span>

            <h2 id="home-logout-modal-title">Sign out of LexMiner?</h2>

            <p>
              You will need to sign in again to access your bookmarks, profile,
              saved research activity, and account-only AI features.
            </p>

            {logoutError && (
              <div className="home-logout-modal-error" role="alert">
                {logoutError}
              </div>
            )}

            <div className="home-logout-modal-actions">
              <button
                type="button"
                className="home-logout-cancel"
                onClick={closeLogoutConfirmation}
                disabled={logoutLoading}
              >
                Stay Signed In
              </button>

              <button
                type="button"
                className="home-logout-confirm"
                onClick={confirmLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <LoaderCircle size={18} className="home-spin" />
                ) : (
                  <LogOut size={18} />
                )}
                {logoutLoading ? "Signing Out..." : "Yes, Sign Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
