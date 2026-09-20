import { useEffect, useState } from "react";

import { Bookmark, LoaderCircle, LockKeyhole } from "lucide-react";

import { useLocation, useNavigate } from "react-router-dom";

import {
  getBookmarkErrorMessage,
  getBookmarkStatus,
  toggleBookmark,
} from "../../services/bookmarkService";

import { getUserAccessToken } from "../../services/userAuthService";

import "../../styles/bookmark-button.css";

export default function BookmarkButton({
  caseId,

  initialBookmarked = null,

  showLabel = true,

  onChange,

  onRequireLogin,

  variant = "default",

  className = "",
}) {
  const navigate = useNavigate();

  const location = useLocation();

  const authenticated = Boolean(getUserAccessToken());

  const hasInitialStatus = typeof initialBookmarked === "boolean";

  const [bookmarked, setBookmarked] = useState(() =>
    hasInitialStatus ? initialBookmarked : false,
  );

  const [loading, setLoading] = useState(
    () => authenticated && !hasInitialStatus,
  );

  const [error, setError] = useState("");

  /* =====================================================
     LOAD BOOKMARK STATUS
  ===================================================== */

  useEffect(() => {
    if (!authenticated || hasInitialStatus) {
      return undefined;
    }

    const numericCaseId = Number(caseId);

    if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
      return undefined;
    }

    let cancelled = false;

    getBookmarkStatus(numericCaseId)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setBookmarked(Boolean(result?.bookmarked));

        setError("");
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        if (requestError?.response?.status === 401) {
          return;
        }

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
  }, [authenticated, caseId, hasInitialStatus]);

  /* =====================================================
     REQUIRE LOGIN
  ===================================================== */

  function handleGuestClick() {
    if (typeof onRequireLogin === "function") {
      onRequireLogin();

      return;
    }

    navigate("/authentication", {
      state: {
        authMode: "LOGIN",

        from: location.pathname + location.search,
      },
    });
  }

  /* =====================================================
     TOGGLE BOOKMARK
  ===================================================== */

  async function handleToggle() {
    if (loading) {
      return;
    }

    if (!authenticated) {
      handleGuestClick();

      return;
    }

    const numericCaseId = Number(caseId);

    if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
      setError("A valid case ID is required.");

      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await toggleBookmark({
        caseId: numericCaseId,

        bookmarked,
      });

      const nextBookmarked = Boolean(result?.bookmarked);

      setBookmarked(nextBookmarked);

      onChange?.({
        caseId: numericCaseId,

        bookmarked: nextBookmarked,

        message: result?.message || "",
      });
    } catch (requestError) {
      setError(getBookmarkErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  /* =====================================================
     CASE VIEWER VARIANT
  ===================================================== */

  if (variant === "case-ai-action") {
    return (
      <div className={`case-bookmark-action-wrapper ${className}`}>
        <button
          type="button"
          className={`case-ai-action case-bookmark-action ${
            bookmarked ? "case-bookmark-action-active" : ""
          }`}
          onClick={handleToggle}
          disabled={loading}
          aria-pressed={authenticated ? bookmarked : false}
        >
          {loading ? (
            <LoaderCircle size={18} className="case-spin" />
          ) : !authenticated ? (
            <LockKeyhole size={18} />
          ) : (
            <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
          )}

          <div>
            <strong>
              {!authenticated
                ? "Bookmark This Case"
                : bookmarked
                  ? "Case Bookmarked"
                  : "Bookmark This Case"}
            </strong>

            <span>
              {!authenticated
                ? "Registered users only"
                : bookmarked
                  ? "Saved in your legal research collection"
                  : "Save this decision for later research"}
            </span>
          </div>
        </button>

        {error && (
          <div className="case-inline-error" role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }

  /* =====================================================
     DEFAULT VARIANT
  ===================================================== */

  return (
    <div className={`bookmark-button-wrapper ${className}`}>
      <button
        type="button"
        className={`bookmark-toggle-button ${
          bookmarked ? "bookmark-toggle-button-active" : ""
        }`}
        onClick={handleToggle}
        disabled={loading}
        aria-pressed={authenticated ? bookmarked : false}
        title={
          !authenticated
            ? "Sign in to bookmark this case"
            : bookmarked
              ? "Remove bookmark"
              : "Bookmark this case"
        }
      >
        {loading ? (
          <LoaderCircle size={17} className="bookmark-button-spin" />
        ) : !authenticated ? (
          <LockKeyhole size={18} />
        ) : (
          <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
        )}

        {showLabel && (
          <span>
            {!authenticated
              ? "Bookmark Case"
              : bookmarked
                ? "Bookmarked"
                : "Bookmark Case"}
          </span>
        )}
      </button>

      {error && (
        <span className="bookmark-button-error" role="alert">
          s{error}
        </span>
      )}
    </div>
  );
}
