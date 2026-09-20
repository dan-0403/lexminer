import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleX,
  FileSearch,
  Filter,
  Gavel,
  Layers3,
  LoaderCircle,
  MapPin,
  RefreshCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  X,
} from "lucide-react";

import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";

import { semanticSearch } from "../../services/userService";

import "../../styles/search-results.css";
import UserHomeHeader from "../../components/user/UserHomeHeader";
import ScrollToTopButton from "../../components/common/ScrollToTopButton";

/* =========================================================
   CONSTANTS
========================================================= */

const DEFAULT_RESULT_LIMIT = 10;

const DEFAULT_FILTERS = {
  year: "",
  division: "",
  caseNumber: "",
  sortBy: "relevance",
};

const DIVISION_OPTIONS = [
  {
    value: "",
    label: "All divisions",
  },
  {
    value: "En Banc",
    label: "En Banc",
  },
  {
    value: "First Division",
    label: "First Division",
  },
  {
    value: "Second Division",
    label: "Second Division",
  },
  {
    value: "Third Division",
    label: "Third Division",
  },
];

const CASE_NUMBER_OPTIONS = [
  {
    value: "",
    label: "Any case classification",
  },
  {
    value: "G.R.",
    label: "G.R. — General Register",
  },
  {
    value: "A.C.",
    label: "A.C. — Administrative Case",
  },
  {
    value: "A.M.",
    label: "A.M. — Administrative Matter",
  },
];

const SEARCH_LOADING_STEPS = [
  "Expanding legal concepts",
  "Matching legal scenarios",
  "Searching semantic embeddings",
  "Applying case metadata filters",
  "Ranking relevant decisions",
];

/* =========================================================
   FORMATTERS
========================================================= */

function normalizeText(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

function formatDecisionDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/* =========================================================
   SEMANTIC RELEVANCE FORMATTERS
========================================================= */

function getCaseTitle(caseData) {
  return (
    caseData?.title ||
    caseData?.case_number ||
    "Untitled Supreme Court Decision"
  );
}

function getMatchedChunkText(result) {
  const matchedChunks = Array.isArray(result?.matched_chunks)
    ? result.matched_chunks
    : [];

  const firstChunk = matchedChunks[0];

  if (!firstChunk?.text) {
    return "No matching legal excerpt is available for this result.";
  }

  return firstChunk.text;
}

function createYearOptions() {
  const currentYear = new Date().getFullYear();

  return Array.from(
    {
      length: currentYear - 1899,
    },
    (_, index) => currentYear - index,
  );
}

/* =========================================================
   ERROR MESSAGE
========================================================= */

function getSearchErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.msg || item?.message || "Invalid search value.";
      })
      .join(" ");
  }

  if (detail && typeof detail === "object") {
    return (
      detail.message ||
      detail.error ||
      "The server rejected the semantic search."
    );
  }

  switch (error?.response?.status) {
    case 400:
      return "The semantic search request is invalid.";

    case 404:
      return "No matching Supreme Court decisions were found.";

    case 422:
      return "Enter a legal issue or valid case number.";

    case 500:
      return "LexMiner encountered an error while searching the case collection.";

    default:
      return (
        error?.message || "LexMiner could not complete the semantic search."
      );
  }
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SearchResultsPage() {
  const navigate = useNavigate();

  const location = useLocation();

  const [searchParams, setSearchParams] = useSearchParams();

  const requestStartedRef = useRef(false);

  const initialFetchAttemptedRef = useRef(false);

  const filterPanelRef = useRef(null);

  /* =======================================================
     QUERY STATE
  ======================================================= */

  const [searchQuery, setSearchQuery] = useState(() =>
    normalizeText(searchParams.get("q")),
  );

  const [searchFilters, setSearchFilters] = useState(() => ({
    year: searchParams.get("year") || "",

    division: searchParams.get("division") || "",

    caseNumber: searchParams.get("caseNumber") || "",

    sortBy: searchParams.get("sortBy") || "relevance",
  }));

  /* =======================================================
     RESPONSE STATE
  ======================================================= */

  const [searchResponse, setSearchResponse] = useState(() => {
    return location.state?.semanticSearchResponse || null;
  });

  const [searchLoading, setSearchLoading] = useState(
    !location.state?.semanticSearchResponse,
  );

  const [loadingStep, setLoadingStep] = useState(0);

  const [searchError, setSearchError] = useState("");

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);

  const [expandedResultIds, setExpandedResultIds] = useState(() => new Set());

  const yearOptions = useMemo(() => createYearOptions(), []);

  /* =======================================================
     RESPONSE VALUES
  ======================================================= */

  const results = useMemo(() => {
    return Array.isArray(searchResponse?.results) ? searchResponse.results : [];
  }, [searchResponse]);

  const matchedConcepts = useMemo(() => {
    return Array.isArray(searchResponse?.matched_concepts)
      ? searchResponse.matched_concepts
      : [];
  }, [searchResponse]);

  const matchedScenarios = useMemo(() => {
    return Array.isArray(searchResponse?.matched_scenarios)
      ? searchResponse.matched_scenarios
      : [];
  }, [searchResponse]);

  const matchedIssues = useMemo(() => {
    return Array.isArray(searchResponse?.matched_issues)
      ? searchResponse.matched_issues
      : [];
  }, [searchResponse]);

  const sortedResults = useMemo(() => {
    const copiedResults = [...results];

    if (searchFilters.sortBy === "newest") {
      copiedResults.sort((first, second) => {
        const firstTime = new Date(first?.case?.decision_date || 0).getTime();

        const secondTime = new Date(second?.case?.decision_date || 0).getTime();

        return secondTime - firstTime;
      });
    }

    if (searchFilters.sortBy === "oldest") {
      copiedResults.sort((first, second) => {
        const firstTime = new Date(first?.case?.decision_date || 0).getTime();

        const secondTime = new Date(second?.case?.decision_date || 0).getTime();

        return firstTime - secondTime;
      });
    }

    if (searchFilters.sortBy === "relevance") {
      copiedResults.sort(
        (first, second) =>
          Number(second?.similarity_score || 0) -
          Number(first?.similarity_score || 0),
      );
    }

    return copiedResults;
  }, [results, searchFilters.sortBy]);

  const activeFilterCount = useMemo(() => {
    return [
      searchFilters.year,
      searchFilters.division,
      searchFilters.caseNumber,
    ].filter(Boolean).length;
  }, [searchFilters.year, searchFilters.division, searchFilters.caseNumber]);

  /* =======================================================
     EXECUTE SEMANTIC SEARCH
  ======================================================= */

  const executeSemanticSearch = useCallback(
    async ({ query, filters = DEFAULT_FILTERS, updateUrl = true }) => {
      const normalizedQuery = normalizeText(query);

      const normalizedCaseNumber = normalizeText(filters?.caseNumber);

      if (!normalizedQuery && !normalizedCaseNumber) {
        setSearchError(
          "Enter a legal issue, factual situation, doctrine, or case number.",
        );

        setSearchLoading(false);

        return;
      }

      if (requestStartedRef.current) {
        return;
      }

      requestStartedRef.current = true;

      setSearchLoading(true);
      setSearchError("");
      setFilterPanelOpen(false);
      setLoadingStep(0);

      try {
        const response = await semanticSearch(normalizedQuery, {
          limit: DEFAULT_RESULT_LIMIT,
          year: filters?.year || null,
          division: filters?.division || null,
          caseNumber: normalizedCaseNumber || null,
        });

        setSearchResponse(response);
        setExpandedResultIds(new Set());

        if (updateUrl) {
          const params = new URLSearchParams();

          if (normalizedQuery) {
            params.set("q", normalizedQuery);
          }

          if (filters?.year) {
            params.set("year", String(filters.year));
          }

          if (filters?.division) {
            params.set("division", filters.division);
          }

          if (normalizedCaseNumber) {
            params.set("caseNumber", normalizedCaseNumber);
          }

          params.set("sortBy", filters?.sortBy || "relevance");

          params.set("limit", String(DEFAULT_RESULT_LIMIT));

          setSearchParams(params, {
            replace: true,
          });
        }
      } catch (error) {
        setSearchResponse(null);
        setSearchError(getSearchErrorMessage(error));
      } finally {
        requestStartedRef.current = false;
        setSearchLoading(false);
      }
    },
    [setSearchParams],
  );

  /* =======================================================
     INITIAL FETCH AFTER REFRESH
  ======================================================= */

  useEffect(() => {
    if (searchResponse || initialFetchAttemptedRef.current) {
      return undefined;
    }

    const normalizedQuery = normalizeText(searchQuery);
    const normalizedCaseNumber = normalizeText(searchFilters.caseNumber);

    if (!normalizedQuery && !normalizedCaseNumber) {
      initialFetchAttemptedRef.current = true;

      const errorTimer = window.setTimeout(() => {
        setSearchLoading(false);
        setSearchError("No search query was provided.");
      }, 0);

      return () => {
        window.clearTimeout(errorTimer);
      };
    }

    initialFetchAttemptedRef.current = true;

    const fetchTimer = window.setTimeout(() => {
      executeSemanticSearch({
        query: normalizedQuery,
        filters: {
          year: searchFilters.year,
          division: searchFilters.division,
          caseNumber: normalizedCaseNumber,
          sortBy: searchFilters.sortBy,
        },
        updateUrl: false,
      });
    }, 0);

    return () => {
      window.clearTimeout(fetchTimer);
    };
  }, [
    executeSemanticSearch,
    searchFilters.caseNumber,
    searchFilters.division,
    searchFilters.sortBy,
    searchFilters.year,
    searchQuery,
    searchResponse,
  ]);

  /* =======================================================
     SEARCH LOADING STEPS
  ======================================================= */

  useEffect(() => {
    if (!searchLoading) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setLoadingStep((currentStep) => {
        const lastStepIndex = SEARCH_LOADING_STEPS.length - 1;

        if (currentStep >= lastStepIndex) {
          return currentStep;
        }

        return currentStep + 1;
      });
    }, 520);

    return () => {
      window.clearInterval(timer);
    };
  }, [searchLoading]);

  /* =======================================================
     CLOSE FILTER PANEL
  ======================================================= */

  useEffect(() => {
    function handlePointerDown(event) {
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(event.target)
      ) {
        setFilterPanelOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
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

      setFilterPanelOpen(false);

      setSearchError("");
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  /* =======================================================
     HANDLERS
  ======================================================= */

  function handleSearchSubmit(event) {
    event.preventDefault();

    executeSemanticSearch({
      query: searchQuery,

      filters: searchFilters,

      updateUrl: true,
    });
  }

  function handleFilterChange(fieldName, value) {
    setSearchFilters((current) => ({
      ...current,
      [fieldName]: value,
    }));

    setSearchError("");
  }

  function handleCaseClassificationChange(event) {
    setSearchFilters((current) => ({
      ...current,
      caseNumber: event.target.value,
    }));
  }

  function resetFilters() {
    setSearchFilters(DEFAULT_FILTERS);

    setSearchError("");
  }

  function toggleResultExcerpt(resultId) {
    setExpandedResultIds((current) => {
      const next = new Set(current);

      if (next.has(resultId)) {
        next.delete(resultId);
      } else {
        next.add(resultId);
      }

      return next;
    });
  }

  function handleViewCase(result) {
    const caseData = result?.case;

    if (!caseData?.id) {
      setSearchError(
        "LexMiner could not open this case because its case ID is unavailable.",
      );

      return;
    }

    const originalQuery = normalizeText(
      searchResponse?.original_query || searchQuery || searchFilters.caseNumber,
    );

    const params = new URLSearchParams();

    if (originalQuery) {
      params.set("q", originalQuery);
    }

    const viewerUrl = params.toString()
      ? `/case-viewer/${caseData.id}?${params.toString()}`
      : `/case-viewer/${caseData.id}`;

    navigate(viewerUrl, {
      state: {
        searchResult: {
          ...result,

          case: {
            ...caseData,
          },

          matched_chunks: Array.isArray(result?.matched_chunks)
            ? result.matched_chunks
            : [],
        },

        searchContext: {
          originalQuery,

          normalizedQuery: normalizeText(
            searchResponse?.normalized_query || originalQuery,
          ),

          expandedQuery: normalizeText(
            searchResponse?.expanded_query || originalQuery,
          ),

          primaryIntent: searchResponse?.primary_intent || null,

          primaryIssue: searchResponse?.primary_issue || null,

          matchedIntents: Array.isArray(searchResponse?.matched_intents)
            ? searchResponse.matched_intents
            : [],

          matchedIssues: Array.isArray(searchResponse?.matched_issues)
            ? searchResponse.matched_issues
            : [],

          matchedConcepts: Array.isArray(searchResponse?.matched_concepts)
            ? searchResponse.matched_concepts
            : [],

          matchedScenarios: Array.isArray(searchResponse?.matched_scenarios)
            ? searchResponse.matched_scenarios
            : [],

          appliedFilters: {
            year:
              searchResponse?.applied_filters?.year ??
              (searchFilters.year || null),

            division:
              searchResponse?.applied_filters?.division ??
              (searchFilters.division || null),

            caseNumber:
              searchResponse?.applied_filters?.case_number ??
              (searchFilters.caseNumber || null),
          },

          sortBy: searchFilters.sortBy || "relevance",
        },
      },
    });
  }

  function handleReturnHome() {
    navigate("/");
  }

  /* =======================================================
     PAGE
  ======================================================= */

  return (
    <div className="search-results-page">
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="search-results-background">
        <div className="search-results-grid" />

        <span className="search-results-orb results-orb-one" />

        <span className="search-results-orb results-orb-two" />

        <span className="search-results-orb results-orb-three" />
      </div>

      {/* =================================================
          HEADER
      ================================================= */}

      <UserHomeHeader />

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="search-results-main">
        {/* ===============================================
            PAGE INTRODUCTION
        =============================================== */}

        <section className="search-results-intro">
          <span className="results-eyebrow">
            <BrainCircuit size={17} />
            AI-assisted Semantic Case Retrieval
          </span>

          <h1>Semantic Search Results</h1>

          <p>
            Review Philippine Supreme Court decisions ranked by semantic
            similarity to your legal issue, facts, or selected case metadata.
          </p>
        </section>

        {/* ===============================================
            SEARCH TOOLBAR
        =============================================== */}

        <section className="results-search-toolbar">
          <form
            className="results-semantic-search"
            onSubmit={handleSearchSubmit}
            noValidate
          >
            <div className="results-search-input">
              {searchLoading ? (
                <LoaderCircle size={21} className="results-spin" />
              ) : (
                <Search size={21} />
              )}

              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);

                  setSearchError("");
                }}
                placeholder="Describe a legal issue or enter a case number..."
                disabled={searchLoading}
              />
            </div>

            <div className="results-search-actions" ref={filterPanelRef}>
              <button
                type="button"
                className={`results-filter-button ${
                  filterPanelOpen ? "results-filter-button-active" : ""
                }`}
                onClick={() => setFilterPanelOpen((current) => !current)}
                disabled={searchLoading}
              >
                <SlidersHorizontal size={17} />
                Filters
                {activeFilterCount > 0 && <strong>{activeFilterCount}</strong>}
                <ChevronDown
                  size={16}
                  className={filterPanelOpen ? "results-chevron-open" : ""}
                />
              </button>

              <button
                type="submit"
                className="results-search-button"
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <LoaderCircle size={18} className="results-spin" />
                ) : (
                  <Search size={18} />
                )}

                {searchLoading ? "Searching..." : "Search Cases"}

                {!searchLoading && <ArrowRight size={17} />}
              </button>

              {/* =========================================
                  FILTER PANEL
              ========================================= */}

              {filterPanelOpen && (
                <div className="results-filter-panel">
                  <div className="results-filter-header">
                    <div>
                      <strong>Search Filters</strong>

                      <span>All metadata filters are optional.</span>
                    </div>

                    <button
                      type="button"
                      onClick={resetFilters}
                      disabled={activeFilterCount === 0}
                    >
                      Reset
                    </button>
                  </div>

                  <div className="results-filter-content">
                    <label>
                      <span>Case Classification</span>

                      <select
                        value={
                          CASE_NUMBER_OPTIONS.some(
                            (option) =>
                              option.value === searchFilters.caseNumber,
                          )
                            ? searchFilters.caseNumber
                            : ""
                        }
                        onChange={handleCaseClassificationChange}
                      >
                        {CASE_NUMBER_OPTIONS.map((option) => (
                          <option
                            key={option.value || "all"}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="results-filter-wide">
                      <span>Specific Case Number</span>

                      <div className="results-case-number-input">
                        <FileSearch size={17} />

                        <input
                          type="text"
                          value={searchFilters.caseNumber}
                          onChange={(event) =>
                            handleFilterChange("caseNumber", event.target.value)
                          }
                          placeholder="Example: G.R. No. 123456"
                        />
                      </div>
                    </label>

                    <label>
                      <span>Decision Year</span>

                      <select
                        value={searchFilters.year}
                        onChange={(event) =>
                          handleFilterChange("year", event.target.value)
                        }
                      >
                        <option value="">All years</option>

                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span>Supreme Court Division</span>

                      <select
                        value={searchFilters.division}
                        onChange={(event) =>
                          handleFilterChange("division", event.target.value)
                        }
                      >
                        {DIVISION_OPTIONS.map((option) => (
                          <option
                            key={option.value || "all"}
                            value={option.value}
                          >
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
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

                  <div className="results-filter-footer">
                    <span>
                      {activeFilterCount > 0
                        ? `${activeFilterCount} active ${
                            activeFilterCount === 1 ? "filter" : "filters"
                          }`
                        : "No metadata filters selected"}
                    </span>

                    <button
                      type="button"
                      onClick={() => setFilterPanelOpen(false)}
                    >
                      <CheckCircle2 size={16} />
                      Apply Filters
                    </button>
                  </div>
                </div>
              )}
            </div>
          </form>

          {searchError && (
            <div className="results-error-alert" role="alert">
              <AlertCircle size={19} />

              <span>{searchError}</span>

              <button type="button" onClick={() => setSearchError("")}>
                <X size={17} />
              </button>
            </div>
          )}
        </section>

        {/* ===============================================
            LOADING PREVIEW
        =============================================== */}

        {searchLoading && (
          <section className="results-loading-preview">
            <div className="results-loading-visual">
              <span className="results-loading-ring results-ring-one" />

              <span className="results-loading-ring results-ring-two" />

              <div className="results-loading-center">
                <BrainCircuit size={34} />
              </div>
            </div>

            <span className="results-loading-eyebrow">
              Semantic operation in progress
            </span>

            <h2>Searching Supreme Court decisions</h2>

            <p>
              LexMiner is evaluating legal concepts, scenarios, embeddings, and
              case metadata.
            </p>

            <div className="results-loading-steps">
              {SEARCH_LOADING_STEPS.map((step, index) => {
                const completed = index < loadingStep;

                const active = index === loadingStep;

                return (
                  <div
                    key={step}
                    className={`results-loading-step ${
                      completed ? "results-loading-step-complete" : ""
                    } ${active ? "results-loading-step-active" : ""}`}
                  >
                    <span>
                      {completed ? (
                        <CheckCircle2 size={15} />
                      ) : active ? (
                        <LoaderCircle size={15} className="results-spin" />
                      ) : (
                        index + 1
                      )}
                    </span>

                    {step}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ===============================================
            RESPONSE
        =============================================== */}

        {!searchLoading && searchResponse && (
          <>
            {/* =========================================
                  SEARCH SUMMARY
              ========================================= */}

            <section className="results-query-summary">
              <div className="results-query-summary-main">
                <span>Search query</span>

                <h2>
                  “
                  {searchResponse.original_query ||
                    searchQuery ||
                    searchFilters.caseNumber}
                  ”
                </h2>

                {searchResponse.expanded_query &&
                  searchResponse.expanded_query !==
                    searchResponse.original_query && (
                    <p>
                      <Sparkles size={16} />
                      Expanded legal query:{" "}
                      <strong>{searchResponse.expanded_query}</strong>
                    </p>
                  )}
              </div>

              <div className="results-count-card">
                <strong>{sortedResults.length}</strong>

                <span>Ranked Cases</span>
              </div>
            </section>

            {/* =========================================
                  CONCEPTS AND SCENARIOS
              ========================================= */}

            <section className="results-intelligence-grid">
              <article className="results-intelligence-card">
                <div className="results-intelligence-heading">
                  <BrainCircuit size={20} />

                  <div>
                    <strong>Matching Concepts</strong>

                    <span>Legal concepts recognized from the query</span>
                  </div>
                </div>

                <div className="results-tag-list">
                  {matchedConcepts.length > 0 ? (
                    matchedConcepts.map((concept) => (
                      <span key={concept}>
                        <Scale size={14} />

                        {concept}
                      </span>
                    ))
                  ) : (
                    <small>No specific concepts were identified.</small>
                  )}
                </div>
              </article>

              {matchedIssues.length > 0 && (
                <article className="results-intelligence-card">
                  <div className="results-intelligence-heading">
                    <Gavel size={20} />

                    <div>
                      <strong>Matching Issues</strong>

                      <span>Possible legal issues detected</span>
                    </div>
                  </div>

                  <div className="results-tag-list">
                    {matchedIssues.map((issue) => (
                      <span key={issue}>
                        <BadgeCheck size={14} />

                        {issue}
                      </span>
                    ))}
                  </div>
                </article>
              )}

              <article className="results-intelligence-card">
                <div className="results-intelligence-heading">
                  <Target size={20} />

                  <div>
                    <strong>Matching Scenarios</strong>

                    <span>Relevant legal scenarios matched by LexMiner</span>
                  </div>
                </div>

                <div className="results-tag-list">
                  {matchedScenarios.length > 0 ? (
                    matchedScenarios.map((scenario) => (
                      <span key={scenario}>
                        <Layers3 size={14} />

                        {scenario}
                      </span>
                    ))
                  ) : (
                    <small>No specific scenarios were identified.</small>
                  )}
                </div>
              </article>
            </section>

            {/* =========================================
                  RESULT HEADING
              ========================================= */}

            <section className="ranked-results-heading">
              <div>
                <span className="results-eyebrow">
                  <FileSearch size={16} />
                  Ranked legal precedents
                </span>

                <h2>Relevant Supreme Court Decisions</h2>

                <p>
                  Cases are ranked according to their semantic relationship to
                  your search.
                </p>
              </div>

              <div className="results-sort-preview">
                <Filter size={16} />

                <span>Sorted by</span>

                <strong>
                  {searchFilters.sortBy === "newest"
                    ? "Newest"
                    : searchFilters.sortBy === "oldest"
                      ? "Oldest"
                      : "Semantic Relevance"}
                </strong>
              </div>
            </section>

            {/* =========================================
                  RANKED CASES
              ========================================= */}

            {sortedResults.length > 0 ? (
              <section className="ranked-case-list">
                {sortedResults.map((result, index) => {
                  const caseData = result?.case || {};

                  const resultId = caseData.id || index;

                  const expanded = expandedResultIds.has(resultId);

                  const excerpt = getMatchedChunkText(result);

                  return (
                    <article className="ranked-case-card" key={resultId}>
                      <div className="ranked-case-position">
                        <span>Rank</span>

                        <strong>{String(index + 1).padStart(2, "0")}</strong>
                      </div>

                      <div className="ranked-case-content">
                        <div className="ranked-case-top">
                          <div className="ranked-case-title-area">
                            <span className="ranked-case-number">
                              <Scale size={15} />

                              {caseData.case_number ||
                                "Case number unavailable"}
                            </span>

                            <h3>{getCaseTitle(caseData)}</h3>
                          </div>
                        </div>

                        <div className="ranked-case-metadata">
                          <span>
                            <CalendarDays size={15} />

                            {formatDecisionDate(caseData.decision_date)}
                          </span>

                          <span>
                            <MapPin size={15} />

                            {caseData.division || "Division unavailable"}
                          </span>

                          <span>
                            <Gavel size={15} />

                            {caseData.ponencia || "Ponencia unavailable"}
                          </span>

                          <span>
                            <Layers3 size={15} />
                            {Number(result?.matching_chunks || 0)} matching{" "}
                            {Number(result?.matching_chunks || 0) === 1
                              ? "section"
                              : "sections"}
                          </span>
                        </div>

                        <div
                          className={`ranked-case-excerpt ${
                            expanded ? "ranked-case-excerpt-expanded" : ""
                          }`}
                        >
                          <div className="ranked-case-excerpt-heading">
                            <BookOpen size={17} />

                            <strong>Best Matching Legal Excerpt</strong>
                          </div>

                          <p>{excerpt}</p>
                        </div>

                        <div className="ranked-case-actions">
                          <button
                            type="button"
                            className="result-excerpt-toggle"
                            onClick={() => toggleResultExcerpt(resultId)}
                          >
                            {expanded ? (
                              <ChevronUp size={17} />
                            ) : (
                              <ChevronDown size={17} />
                            )}

                            {expanded ? "Show Less" : "Read Matching Excerpt"}
                          </button>

                          <button
                            type="button"
                            className="view-case-button"
                            onClick={() => handleViewCase(result)}
                          >
                            <BookOpen size={18} />
                            View Case
                            <ArrowRight size={17} />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            ) : (
              <section className="no-search-results">
                <div className="no-search-results-icon">
                  <CircleX size={42} />
                </div>

                <span className="results-eyebrow">No matching cases</span>

                <h2>No Supreme Court decisions matched your search</h2>

                <p>
                  Try using broader factual details, removing some metadata
                  filters, or entering a partial case number.
                </p>

                <div className="no-search-results-actions">
                  <button type="button" onClick={resetFilters}>
                    <RefreshCcw size={17} />
                    Clear Filters
                  </button>

                  <button type="button" onClick={handleReturnHome}>
                    <ArrowLeft size={17} />
                    Return Home
                  </button>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="search-results-footer">
        <div>
          <img src={lexminerLogo} alt="" />

          <span>LexMiner Semantic Legal Research</span>
        </div>

        <p>
          Search results are generated from indexed Philippine Supreme Court
          decisions.
        </p>
      </footer>
      <ScrollToTopButton />
    </div>
  );
}
