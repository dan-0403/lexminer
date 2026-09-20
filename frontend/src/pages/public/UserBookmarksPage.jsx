import { useEffect, useMemo, useState } from "react";

import {
  ArrowLeft,
  Bookmark,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileSearch,
  Filter,
  LoaderCircle,
  Search,
  SortAsc,
  Trash2,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import UserHomeHeader from "../../components/user/UserHomeHeader";

import ScrollToTopButton from "../../components/common/ScrollToTopButton";

import {
  getBookmarkErrorMessage,
  getBookmarkYears,
  getUserBookmarks,
  removeBookmark,
} from "../../services/bookmarkService";

import { getOriginalPdfUrl } from "../../services/userCaseViewerService";

import "../../styles/user-home.css";
import "../../styles/user-bookmarks.css";

const PAGE_SIZE = 12;

const EMPTY_FILTERS = {
  search: "",
  year: "",
  sort: "newest",
};

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

function formatValue(value) {
  const normalizedValue = String(value || "")
    .trim()
    .replace(/_/g, " ");

  if (!normalizedValue) {
    return "Not available";
  }

  return normalizedValue.replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
}

export default function UserBookmarksPage() {
  const navigate = useNavigate();

  const [bookmarks, setBookmarks] = useState([]);

  const [years, setYears] = useState([]);

  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);

  const [page, setPage] = useState(1);

  const [totalItems, setTotalItems] = useState(0);

  const [totalPages, setTotalPages] = useState(0);

  const [loading, setLoading] = useState(true);

  const [removingCaseId, setRemovingCaseId] = useState(null);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  /*
   * Increment this value when the current page
   * should be fetched again without changing
   * the filters or page number.
   */
  const [refreshVersion, setRefreshVersion] = useState(0);

  /* =========================================================
     LOAD BOOKMARKS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const request = getUserBookmarks({
      page,

      pageSize: PAGE_SIZE,

      search: appliedFilters.search,

      year: appliedFilters.year,

      sort: appliedFilters.sort,
    });

    request
      .then((result) => {
        if (cancelled) {
          return;
        }

        const loadedItems = Array.isArray(result?.items) ? result.items : [];

        const loadedTotalItems = Number(result?.total_items || 0);

        const loadedTotalPages = Number(result?.total_pages || 0);

        /*
         * If the current page becomes invalid after
         * deleting its final bookmark, move back to
         * the newest valid page.
         */
        if (loadedTotalPages > 0 && page > loadedTotalPages) {
          setLoading(true);

          setPage(loadedTotalPages);

          return;
        }

        setBookmarks(loadedItems);

        setTotalItems(loadedTotalItems);

        setTotalPages(loadedTotalPages);

        setError("");
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setBookmarks([]);

        setTotalItems(0);

        setTotalPages(0);

        setError(getBookmarkErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    page,
    appliedFilters.search,
    appliedFilters.year,
    appliedFilters.sort,
    refreshVersion,
  ]);

  /* =========================================================
     LOAD AVAILABLE YEARS
  ========================================================= */

  useEffect(() => {
    let cancelled = false;

    getBookmarkYears()
      .then((result) => {
        if (cancelled) {
          return;
        }

        setYears(Array.isArray(result?.years) ? result.years : []);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        console.error("Could not load bookmark years:", requestError);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshVersion]);

  /* =========================================================
     AUTO-HIDE SUCCESS MESSAGE
  ========================================================= */

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  /* =========================================================
     ACTIVE FILTER STATUS
  ========================================================= */

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      appliedFilters.search ||
      appliedFilters.year ||
      appliedFilters.sort !== "newest",
    );
  }, [appliedFilters.search, appliedFilters.year, appliedFilters.sort]);

  /* =========================================================
     FILTER INPUT
  ========================================================= */

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  /* =========================================================
     APPLY FILTERS
  ========================================================= */

  function handleApplyFilters(event) {
    event.preventDefault();

    const nextFilters = {
      search: filters.search.trim(),

      year: filters.year,

      sort: filters.sort,
    };

    setError("");

    setSuccessMessage("");

    setLoading(true);

    /*
     * If the user applies the same filters while already
     * on page one, force a refresh.
     */
    const filtersAreUnchanged =
      nextFilters.search === appliedFilters.search &&
      nextFilters.year === appliedFilters.year &&
      nextFilters.sort === appliedFilters.sort;

    if (page === 1 && filtersAreUnchanged) {
      setRefreshVersion((current) => current + 1);

      return;
    }

    setPage(1);

    setAppliedFilters(nextFilters);
  }

  /* =========================================================
     CLEAR FILTERS
  ========================================================= */

  function handleClearFilters() {
    const filtersAlreadyEmpty =
      appliedFilters.search === "" &&
      appliedFilters.year === "" &&
      appliedFilters.sort === "newest";

    setFilters({
      ...EMPTY_FILTERS,
    });

    setError("");

    setSuccessMessage("");

    setLoading(true);

    if (page === 1 && filtersAlreadyEmpty) {
      setRefreshVersion((current) => current + 1);

      return;
    }

    setAppliedFilters({
      ...EMPTY_FILTERS,
    });

    setPage(1);
  }

  /* =========================================================
     REMOVE BOOKMARK
  ========================================================= */

  async function handleRemoveBookmark(caseId) {
    if (removingCaseId !== null) {
      return;
    }

    const numericCaseId = Number(caseId);

    if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
      setError("A valid case ID is required.");

      return;
    }

    const confirmed = window.confirm("Remove this case from your bookmarks?");

    if (!confirmed) {
      return;
    }

    setRemovingCaseId(numericCaseId);

    setError("");

    setSuccessMessage("");

    try {
      const result = await removeBookmark(numericCaseId);

      setSuccessMessage(result?.message || "Bookmark removed successfully.");

      /*
       * Immediately remove the card from the current
       * view so the interface feels responsive.
       */
      const remainingBookmarks = bookmarks.filter(
        (bookmarkItem) => Number(bookmarkItem?.case?.id) !== numericCaseId,
      );

      setBookmarks(remainingBookmarks);

      setTotalItems((current) => Math.max(current - 1, 0));

      /*
       * If the final result on a later page was removed,
       * return to the previous page. Otherwise, refresh
       * the current page from the backend.
       */
      if (remainingBookmarks.length === 0 && page > 1) {
        setLoading(true);

        setPage((current) => Math.max(current - 1, 1));
      } else {
        setLoading(true);

        setRefreshVersion((current) => current + 1);
      }
    } catch (requestError) {
      setError(getBookmarkErrorMessage(requestError));
    } finally {
      setRemovingCaseId(null);
    }
  }

  /* =========================================================
     OPEN CASE VIEWER
  ========================================================= */

  function openCaseViewer(bookmarkItem) {
    const caseData = bookmarkItem?.case;

    const numericCaseId = Number(caseData?.id);

    if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
      setError("The bookmarked case does not have a valid case ID.");

      return;
    }

    navigate(`/case-viewer/${numericCaseId}`, {
      state: {
        case: caseData,
      },
    });
  }

  /* =========================================================
     PAGINATION
  ========================================================= */

  function goToPreviousPage() {
    if (loading || page <= 1) {
      return;
    }

    setError("");

    setLoading(true);

    setPage((current) => Math.max(current - 1, 1));
  }

  function goToNextPage() {
    if (loading || page >= totalPages) {
      return;
    }

    setError("");

    setLoading(true);

    setPage((current) => Math.min(current + 1, totalPages));
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="user-bookmarks-page">
      <UserHomeHeader />

      <main className="user-bookmarks-main">
        <div className="bookmarks-page-navigation">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            Back
          </button>

          <span>
            <Bookmark size={17} />
            Personal legal research library
          </span>
        </div>

        <section className="bookmarks-page-hero">
          <div>
            <span className="bookmarks-page-eyebrow">
              <Bookmark size={16} />
              Saved Decisions
            </span>

            <h1>My Bookmarks</h1>

            <p>
              Review and manage the Supreme Court decisions you saved for later
              research.
            </p>
          </div>

          <div className="bookmarks-total-card">
            <strong>{totalItems}</strong>

            <span>{totalItems === 1 ? "Saved case" : "Saved cases"}</span>
          </div>
        </section>

        {error && (
          <div className="bookmarks-message bookmarks-error" role="alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="bookmarks-message bookmarks-success" role="status">
            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Close success message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="bookmarks-filter-panel">
          <div className="bookmarks-section-heading">
            <div>
              <span>Research Filters</span>

              <h2>Find Saved Decisions</h2>
            </div>

            <Filter size={22} />
          </div>

          <form className="bookmarks-filter-form" onSubmit={handleApplyFilters}>
            <label className="bookmarks-search-field">
              <span>Search bookmarks</span>

              <div>
                <Search size={17} />

                <input
                  type="search"
                  name="search"
                  value={filters.search}
                  onChange={handleFilterChange}
                  placeholder="Search title, case number, or ponente"
                />
              </div>
            </label>

            <label>
              <span>Decision year</span>

              <div>
                <CalendarDays size={17} />

                <select
                  name="year"
                  value={filters.year}
                  onChange={handleFilterChange}
                >
                  <option value="">All years</option>

                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </label>

            <label>
              <span>Sort order</span>

              <div>
                <SortAsc size={17} />

                <select
                  name="sort"
                  value={filters.sort}
                  onChange={handleFilterChange}
                >
                  <option value="newest">Newest bookmarked</option>

                  <option value="oldest">Oldest bookmarked</option>
                </select>
              </div>
            </label>

            <div className="bookmarks-filter-actions">
              <button type="submit" disabled={loading}>
                {loading ? (
                  <LoaderCircle size={17} className="bookmarks-spin" />
                ) : (
                  <FileSearch size={17} />
                )}
                Apply Filters
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  disabled={loading}
                >
                  <X size={17} />
                  Clear
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="bookmarks-results-panel">
          <div className="bookmarks-section-heading">
            <div>
              <span>Saved Collection</span>

              <h2>Bookmarked Cases</h2>
            </div>

            <strong className="bookmarks-result-count">{totalItems}</strong>
          </div>

          {loading ? (
            <div className="bookmarks-loading-state">
              <LoaderCircle size={34} className="bookmarks-spin" />

              <strong>Loading bookmarks</strong>

              <span>Retrieving your saved Supreme Court decisions…</span>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="bookmarks-empty-state">
              <Bookmark size={40} />

              <strong>
                {hasActiveFilters
                  ? "No bookmarks match your filters"
                  : "No bookmarked cases yet"}
              </strong>

              <p>
                {hasActiveFilters
                  ? "Try changing or clearing the current filters."
                  : "Save cases from Search Results or the Case Viewer to build your research collection."}
              </p>

              <button
                type="button"
                onClick={
                  hasActiveFilters ? handleClearFilters : () => navigate("/")
                }
              >
                {hasActiveFilters ? "Clear Filters" : "Search Cases"}
              </button>
            </div>
          ) : (
            <div className="bookmarks-grid">
              {bookmarks.map((bookmarkItem) => {
                const caseData = bookmarkItem?.case || {};

                const numericCaseId = Number(caseData.id);

                const removing = removingCaseId === numericCaseId;

                return (
                  <article key={bookmarkItem.id} className="bookmark-case-card">
                    <div className="bookmark-case-card-top">
                      <div className="bookmark-case-icon">
                        <Bookmark size={21} fill="currentColor" />
                      </div>

                      <button
                        type="button"
                        className="bookmark-remove-icon-button"
                        onClick={() => handleRemoveBookmark(numericCaseId)}
                        disabled={removing || removingCaseId !== null}
                        aria-label="Remove bookmark"
                        title="Remove bookmark"
                      >
                        {removing ? (
                          <LoaderCircle size={17} className="bookmarks-spin" />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>

                    <div className="bookmark-case-copy">
                      <span>
                        {caseData.case_number || "Case number unavailable"}
                      </span>

                      <h3>{caseData.title || "Untitled Case"}</h3>

                      <p>{formatValue(caseData.division)}</p>
                    </div>

                    <dl className="bookmark-case-details">
                      <div>
                        <dt>Decision Date</dt>

                        <dd>{formatDate(caseData.decision_date)}</dd>
                      </div>

                      <div>
                        <dt>Ponente</dt>

                        <dd>{caseData.ponencia || "Not available"}</dd>
                      </div>

                      <div>
                        <dt>Bookmarked</dt>

                        <dd>{formatDate(bookmarkItem.bookmarked_at)}</dd>
                      </div>
                    </dl>

                    <div className="bookmark-case-actions">
                      <button
                        type="button"
                        onClick={() => openCaseViewer(bookmarkItem)}
                      >
                        <FileSearch size={17} />
                        View Case
                      </button>

                      <a
                        href={getOriginalPdfUrl(numericCaseId)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={17} />
                        Original PDF
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && totalPages > 1 && (
            <div className="bookmarks-pagination">
              <button
                type="button"
                onClick={goToPreviousPage}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft size={17} />
                Previous
              </button>

              <span>
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                onClick={goToNextPage}
                disabled={page >= totalPages || loading}
              >
                Next
                <ChevronRight size={17} />
              </button>
            </div>
          )}
        </section>
      </main>

      <ScrollToTopButton />
    </div>
  );
}
