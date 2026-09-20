import { useEffect, useMemo, useRef, useState } from "react";

import {
  ArrowRight,
  Check,
  ChevronDown,
  FileSearch,
  LoaderCircle,
  LogOut,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import { logoutUser } from "../../services/userAuthService";

import { semanticSearch } from "../../services/userService";

import "../../styles/user-home.css";

import UserProfileDropdown from "../../components/user/UserProfileDropdown";

const SEARCH_RESULT_LIMIT = 25;

const DEFAULT_SEARCH_FILTERS = {
  caseType: "",
  caseNumber: "",
  year: "",
  division: "",
  sortBy: "relevance",
};

const CASE_TYPE_CHOICES = [
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

function getSearchErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || "Invalid search value.")
      .join(" ");
  }

  return (
    error?.message ||
    "LexMiner could not complete the semantic search. Please try again."
  );
}

export default function UserHomeHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const filterRef = useRef(null);

  const searchRequestRef = useRef(false);

  const [filterOpen, setFilterOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState(() => {
    return new URLSearchParams(location.search).get("q") || "";
  });

  const [searchFilters, setSearchFilters] = useState(DEFAULT_SEARCH_FILTERS);

  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const searchYears = useMemo(() => createYearChoices(), []);

  const activeFilterCount = useMemo(
    () =>
      [
        searchFilters.caseType,
        searchFilters.caseNumber,
        searchFilters.year,
        searchFilters.division,
      ].filter(Boolean).length,
    [
      searchFilters.caseType,
      searchFilters.caseNumber,
      searchFilters.year,
      searchFilters.division,
    ],
  );

  useEffect(() => {
    function syncAuthenticationState() {}

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

  useEffect(() => {
    function handlePointerDown(event) {
      if (!filterRef.current?.contains(event.target)) {
        setFilterOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setFilterOpen(false);

      setLogoutOpen(false);
      setSearchError("");
      setLogoutError("");
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  function handleFilterChange(fieldName, value) {
    setSearchFilters((current) => ({
      ...current,
      [fieldName]: value,
    }));

    setSearchError("");
  }

  function resetFilters() {
    setSearchFilters({ ...DEFAULT_SEARCH_FILTERS });
    setSearchError("");
  }

  function buildCaseNumberFilter() {
    const caseType = String(searchFilters.caseType || "").trim();
    const caseNumber = String(searchFilters.caseNumber || "")
      .trim()
      .replace(/\s+/g, " ");

    if (!caseNumber) {
      return caseType;
    }

    if (!caseType || caseNumber.toUpperCase().startsWith(caseType)) {
      return caseNumber;
    }

    return `${caseType} ${caseNumber}`.trim();
  }

  async function handleSearchSubmit(event) {
    event.preventDefault();

    if (searchLoading || searchRequestRef.current) {
      return;
    }

    const normalizedQuery = String(searchQuery || "")
      .trim()
      .replace(/\s+/g, " ");

    const normalizedCaseNumber = buildCaseNumberFilter();

    if (!normalizedQuery && !normalizedCaseNumber) {
      setSearchError(
        "Enter a legal issue, factual situation, doctrine, or case number.",
      );
      return;
    }

    searchRequestRef.current = true;
    setSearchLoading(true);
    setSearchError("");
    setFilterOpen(false);

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
      if (searchFilters.sortBy) {
        params.set("sortBy", searchFilters.sortBy);
      }

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
    } catch (error) {
      setSearchError(getSearchErrorMessage(error));
    } finally {
      searchRequestRef.current = false;
      setSearchLoading(false);
    }
  }

  async function confirmLogout() {
    if (logoutLoading) {
      return;
    }

    setLogoutLoading(true);
    setLogoutError("");

    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setLogoutLoading(false);
      setLogoutOpen(false);
      window.dispatchEvent(new Event("lexminer-auth-changed"));
      navigate("/", { replace: true });
    }
  }

  function renderFilterDropdown() {
    return (
      <div
        id="shared-header-search-filters"
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
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
          >
            Reset
          </button>
        </div>

        <div className="semantic-filter-dropdown-content">
          <label className="semantic-filter-field">
            <span>Case Classification</span>
            <select
              value={searchFilters.caseType}
              onChange={(event) =>
                handleFilterChange("caseType", event.target.value)
              }
            >
              {CASE_TYPE_CHOICES.map((choice) => (
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
                placeholder="Example: No. 123456 or G.R. No. 123456"
                autoComplete="off"
              />
            </div>
            <small>Enter a partial prefix or the complete case number.</small>
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
            onClick={() => setFilterOpen(false)}
          >
            <Check size={16} />
            Apply Filters
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="user-home-header">
        <div className="header-top">
          <div
            className="header-brand"
            onClick={() => navigate("/")}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                navigate("/");
              }
            }}
          >
            <div>
              <h2>LexMiner</h2>
              <span>AI Assisted Legal Argument Mining System</span>
            </div>
          </div>

          <div className="header-search-area">
            <form
              className="header-semantic-search"
              onSubmit={handleSearchSubmit}
              noValidate
            >
              <div className="header-semantic-search-input">
                {searchLoading ? (
                  <LoaderCircle size={19} className="home-spin" />
                ) : (
                  <Search size={19} />
                )}

                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchError("");
                  }}
                  placeholder="Describe a legal issue or enter a case number..."
                  aria-label="Search Philippine Supreme Court decisions"
                  disabled={searchLoading}
                />
              </div>

              <div className="header-semantic-search-actions" ref={filterRef}>
                <button
                  type="button"
                  className={`header-semantic-filter-button ${
                    filterOpen ? "header-semantic-filter-button-active" : ""
                  }`}
                  onClick={() => setFilterOpen((current) => !current)}
                  aria-expanded={filterOpen}
                  aria-controls="shared-header-search-filters"
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
                    className={filterOpen ? "dropdown-chevron-open" : ""}
                  />
                </button>

                <button
                  type="submit"
                  className="header-semantic-search-submit"
                  disabled={searchLoading}
                >
                  {searchLoading ? (
                    <LoaderCircle size={18} className="home-spin" />
                  ) : (
                    <Search size={18} />
                  )}

                  <span>{searchLoading ? "Searching..." : "Search"}</span>

                  {!searchLoading && <ArrowRight size={17} />}
                </button>

                {filterOpen && renderFilterDropdown()}
              </div>
            </form>

            {searchError && (
              <div className="header-search-error" role="alert">
                <X size={15} />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          <UserProfileDropdown />
        </div>
      </header>

      {logoutOpen && (
        <div
          className="home-logout-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !logoutLoading) {
              setLogoutOpen(false);
            }
          }}
        >
          <section
            className="home-logout-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="shared-header-logout-title"
          >
            <button
              type="button"
              className="home-logout-modal-close"
              onClick={() => setLogoutOpen(false)}
              disabled={logoutLoading}
              aria-label="Close logout confirmation"
            >
              <X size={18} />
            </button>

            <div className="home-logout-modal-icon">
              <LogOut size={30} />
            </div>

            <span className="home-logout-modal-eyebrow">End user session</span>

            <h2 id="shared-header-logout-title">Sign out of LexMiner?</h2>

            <p>You will return to guest access after signing out.</p>

            {logoutError && (
              <div className="home-logout-modal-error">{logoutError}</div>
            )}

            <div className="home-logout-modal-actions">
              <button
                type="button"
                className="home-logout-cancel"
                onClick={() => setLogoutOpen(false)}
                disabled={logoutLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="home-logout-confirm"
                onClick={confirmLogout}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <>
                    <LoaderCircle size={17} className="home-spin" />
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
