import { useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  ArrowLeft,
  BrainCircuit,
  CalendarDays,
  Check,
  CheckCircle2,
  ExternalLink,
  FileText,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";

import UserHomeHeader from "../../components/user/UserHomeHeader";

import ScrollToTopButton from "../../components/common/ScrollToTopButton";

import BookmarkButton from "../../components/user/BookmarkButton";

import {
  getStoredUser,
  getUserAccessToken,
} from "../../services/userAuthService";

import {
  generateCaseExplanation,
  generateCaseMatchExplanation,
  generateCaseSummary,
  getCaseViewerErrorMessage,
  getOriginalPdfUrl,
  loadCaseViewer,
} from "../../services/userCaseViewerService";

import "../../styles/user-home.css";
import "../../styles/user-case-viewer.css";

const CASE_VIEWER_LOADING_STEPS = [
  {
    id: 1,
    label: "Locating Supreme Court decision",
  },
  {
    id: 2,
    label: "Loading cleaned legal document",
  },
  {
    id: 3,
    label: "Mapping relevant legal passages",
  },
  {
    id: 4,
    label: "Preparing LexMiner Case Viewer",
  },
];

function getAuthenticatedUser() {
  const accessToken = getUserAccessToken();
  const storedUser = getStoredUser();

  if (!accessToken || !storedUser) {
    return null;
  }

  return storedUser;
}

function formatDate(value) {
  if (!value) {
    return "Not specified";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

function formatLegalLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getSentenceText(sentence) {
  if (typeof sentence === "string") {
    return sentence;
  }

  return sentence?.text || "";
}

function renderGeneratedContent(value) {
  const blocks = String(value || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block, index) => {
    if (block.startsWith("## ")) {
      return (
        <h3 key={`${index}-${block}`} className="case-generated-heading">
          {block.replace(/^##\s+/, "")}
        </h3>
      );
    }

    if (block.startsWith("Citation:")) {
      return (
        <div key={`${index}-${block}`} className="case-generated-citation">
          {block}
        </div>
      );
    }

    const lines = block.split("\n");

    const isBulletBlock = lines.every(
      (line) => line.trim().startsWith("-") || line.trim().startsWith("•"),
    );

    if (isBulletBlock) {
      return (
        <ul
          key={`${index}-${block.slice(0, 20)}`}
          className="case-generated-list"
        >
          {lines.map((line, lineIndex) => (
            <li key={lineIndex}>{line.trim().replace(/^[-•]\s*/, "")}</li>
          ))}
        </ul>
      );
    }

    return <p key={`${index}-${block.slice(0, 25)}`}>{block}</p>;
  });
}

function HighlightedChunkText({ text, matchingSentences = [] }) {
  const sentenceTexts = matchingSentences
    .map(getSentenceText)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  if (sentenceTexts.length === 0) {
    return text;
  }

  const parts = [
    {
      text,
      highlighted: false,
    },
  ];

  sentenceTexts.forEach((sentence) => {
    const updatedParts = [];

    parts.forEach((part) => {
      if (part.highlighted) {
        updatedParts.push(part);
        return;
      }

      const sourceText = part.text;
      const sourceLower = sourceText.toLowerCase();
      const sentenceLower = sentence.toLowerCase();

      const matchIndex = sourceLower.indexOf(sentenceLower);

      if (matchIndex < 0) {
        updatedParts.push(part);
        return;
      }

      const before = sourceText.slice(0, matchIndex);

      const match = sourceText.slice(matchIndex, matchIndex + sentence.length);

      const after = sourceText.slice(matchIndex + sentence.length);

      if (before) {
        updatedParts.push({
          text: before,
          highlighted: false,
        });
      }

      updatedParts.push({
        text: match,
        highlighted: true,
      });

      if (after) {
        updatedParts.push({
          text: after,
          highlighted: false,
        });
      }
    });

    parts.splice(0, parts.length, ...updatedParts);
  });

  return parts.map((part, index) =>
    part.highlighted ? (
      <mark key={index} className="case-phrase-highlight">
        {part.text}
      </mark>
    ) : (
      <span key={index}>{part.text}</span>
    ),
  );
}

export default function UserCaseViewerPage() {
  const { caseId } = useParams();

  const navigate = useNavigate();

  const location = useLocation();

  const [searchParams] = useSearchParams();

  const [currentUser] = useState(() => getAuthenticatedUser());

  const [pageLoading, setPageLoading] = useState(true);

  const [loadingStep, setLoadingStep] = useState(0);

  const [viewerData, setViewerData] = useState(null);

  const [loadError, setLoadError] = useState("");

  const [summary, setSummary] = useState("");

  const [summaryCitations, setSummaryCitations] = useState([]);

  const [summaryLoading, setSummaryLoading] = useState(false);

  const [summaryError, setSummaryError] = useState("");

  const [explanation, setExplanation] = useState("");

  const [explanationCitations, setExplanationCitations] = useState([]);

  const [explanationLoading, setExplanationLoading] = useState(false);

  const [explanationError, setExplanationError] = useState("");

  const [matchExplanation, setMatchExplanation] = useState("");

  const [matchExplanationCitations, setMatchExplanationCitations] = useState(
    [],
  );

  const [matchExplanationLoading, setMatchExplanationLoading] = useState(false);

  const [matchExplanationError, setMatchExplanationError] = useState("");

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [loginModalReason, setLoginModalReason] = useState("summary");

  const [pdfModalOpen, setPdfModalOpen] = useState(false);

  const [generationModal, setGenerationModal] = useState(null);

  const routeSearchResult = location.state?.searchResult || null;

  const routeSearchContext = location.state?.searchContext || {};

  const searchQuery =
    searchParams.get("q") || routeSearchContext.originalQuery || "";

  const [bookmarkMessage, setBookmarkMessage] = useState("");

  const requestContext = useMemo(() => {
    const routeMatchedChunks = routeSearchResult?.matched_chunks || [];

    return {
      query: searchQuery,

      expandedQuery: routeSearchContext.expandedQuery || "",

      similarityScore: routeSearchResult?.similarity_score ?? null,

      matchedIntents: routeSearchContext.matchedIntents || [],

      matchedIssues: routeSearchContext.matchedIssues || [],

      matchedConcepts: routeSearchContext.matchedConcepts || [],

      matchedScenarios: routeSearchContext.matchedScenarios || [],

      matchedChunks: routeMatchedChunks,
    };
  }, [
    routeSearchContext.expandedQuery,
    routeSearchContext.matchedConcepts,
    routeSearchContext.matchedIntents,
    routeSearchContext.matchedIssues,
    routeSearchContext.matchedScenarios,
    routeSearchResult?.matched_chunks,
    routeSearchResult?.similarity_score,
    searchQuery,
  ]);

  useEffect(() => {
    let cancelled = false;

    const stepTimer = window.setInterval(() => {
      setLoadingStep((current) =>
        Math.min(current + 1, CASE_VIEWER_LOADING_STEPS.length - 1),
      );
    }, 380);

    async function initializeViewer() {
      setPageLoading(true);
      setLoadError("");

      const minimumLoader = new Promise((resolve) => {
        window.setTimeout(resolve, 1500);
      });

      try {
        const [response] = await Promise.all([
          loadCaseViewer({
            caseId,
            ...requestContext,
          }),
          minimumLoader,
        ]);

        if (!cancelled) {
          setViewerData(response);
        }
      } catch (error) {
        await minimumLoader;

        if (!cancelled) {
          setLoadError(getCaseViewerErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setPageLoading(false);
        }
      }
    }

    initializeViewer();

    return () => {
      cancelled = true;
      window.clearInterval(stepTimer);
    };
  }, [caseId, requestContext]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setPdfModalOpen(false);
      setLoginModalOpen(false);
      setGenerationModal(null);
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    const modalOpen =
      pdfModalOpen || loginModalOpen || generationModal !== null;

    document.body.style.overflow = modalOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [loginModalOpen, pdfModalOpen, generationModal]);

  const caseData = viewerData?.case || {};

  const searchContext = viewerData?.search_context || {};

  const matchedChunkLookup = useMemo(() => {
    const lookup = new Map();

    (viewerData?.matched_chunks || []).forEach((chunk) => {
      lookup.set(chunk.chunk_number, chunk);
    });

    return lookup;
  }, [viewerData?.matched_chunks]);

  async function handleGenerateSummary() {
    const accessToken = getUserAccessToken();
    const storedUser = getStoredUser();

    if (!accessToken || !storedUser) {
      setLoginModalReason("summary");
      setLoginModalOpen(true);
      return;
    }

    if (summaryLoading) {
      return;
    }

    const selectedCaseId = Number(viewerData?.case?.id ?? caseId);

    if (!Number.isInteger(selectedCaseId) || selectedCaseId < 1) {
      setSummaryError(
        "LexMiner could not generate the summary because the case ID is invalid.",
      );
      return;
    }

    setSummaryLoading(true);
    setSummaryError("");

    try {
      const response = await generateCaseSummary(selectedCaseId);

      setSummary(response?.summary || "No summary was returned.");

      setSummaryCitations(
        Array.isArray(response?.citations) ? response.citations : [],
      );
    } catch (error) {
      console.error("Summary request failed:", error?.response?.data || error);

      setSummaryError(getCaseViewerErrorMessage(error));
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleGenerateExplanation() {
    // Check authentication at the moment the button is clicked
    const accessToken = getUserAccessToken();
    const storedUser = getStoredUser();

    if (!accessToken || !storedUser) {
      setLoginModalReason("explanation");
      setLoginModalOpen(true);
      return;
    }

    if (explanationLoading) {
      return;
    }

    const selectedCaseId = Number(viewerData?.case?.id ?? caseId);

    if (!Number.isInteger(selectedCaseId) || selectedCaseId < 1) {
      setExplanationError(
        "LexMiner could not generate the explanation because the case ID is invalid.",
      );
      return;
    }

    setExplanationLoading(true);
    setExplanationError("");

    try {
      const response = await generateCaseExplanation(selectedCaseId);

      setExplanation(response?.explanation || "No explanation was returned.");

      setExplanationCitations(
        Array.isArray(response?.citations) ? response.citations : [],
      );

      window.setTimeout(() => {
        if (window.innerWidth > 1024) {
          document
            .getElementById("generated-case-explanation")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        }
      }, 150);
    } catch (error) {
      console.error(
        "Explanation request failed:",
        error?.response?.data || error,
      );

      setExplanationError(getCaseViewerErrorMessage(error));
    } finally {
      setExplanationLoading(false);
    }
  }

  async function handleGenerateMatchExplanation() {
    const accessToken = getUserAccessToken();
    const storedUser = getStoredUser();

    if (!accessToken || !storedUser) {
      setLoginModalReason("match-explanation");
      setLoginModalOpen(true);
      return;
    }

    if (matchExplanationLoading) {
      return;
    }

    const selectedCaseId = Number(viewerData?.case?.id ?? caseId);

    if (!Number.isInteger(selectedCaseId) || selectedCaseId < 1) {
      setMatchExplanationError(
        "LexMiner could not explain the search match because the case ID is invalid.",
      );
      return;
    }

    const originalQuery = String(
      searchContext?.query ||
        routeSearchContext?.originalQuery ||
        searchQuery ||
        "",
    )
      .trim()
      .replace(/\s+/g, " ");

    if (!originalQuery) {
      setMatchExplanationError("The original search query is unavailable.");
      return;
    }

    const matchedChunks = Array.isArray(viewerData?.matched_chunks)
      ? viewerData.matched_chunks
      : Array.isArray(requestContext?.matchedChunks)
        ? requestContext.matchedChunks
        : [];

    if (matchedChunks.length === 0) {
      setMatchExplanationError(
        "No matching search passages are available for this case.",
      );
      return;
    }

    const expandedQuery =
      searchContext?.expanded_query ??
      searchContext?.expandedQuery ??
      requestContext?.expandedQuery ??
      "";

    const matchedIntents =
      searchContext?.matched_intents ??
      searchContext?.matchedIntents ??
      requestContext?.matchedIntents ??
      [];

    const matchedIssues =
      searchContext?.matched_issues ??
      searchContext?.matchedIssues ??
      requestContext?.matchedIssues ??
      [];

    const matchedConcepts =
      searchContext?.matched_concepts ??
      searchContext?.matchedConcepts ??
      requestContext?.matchedConcepts ??
      [];

    const matchedScenarios =
      searchContext?.matched_scenarios ??
      searchContext?.matchedScenarios ??
      requestContext?.matchedScenarios ??
      [];

    setMatchExplanationLoading(true);
    setMatchExplanationError("");
    setMatchExplanation("");
    setMatchExplanationCitations([]);

    try {
      const response = await generateCaseMatchExplanation({
        caseId: selectedCaseId,

        query: originalQuery,

        expandedQuery,

        matchedIntents,

        matchedIssues,

        matchedConcepts,

        matchedScenarios,

        matchedChunks,
      });

      setMatchExplanation(
        response?.explanation || "No match explanation was returned.",
      );

      setMatchExplanationCitations(
        Array.isArray(response?.citations) ? response.citations : [],
      );

      window.setTimeout(() => {
        if (window.innerWidth > 1024) {
          document
            .getElementById("generated-match-explanation")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        }
      }, 150);
    } catch (error) {
      console.error(
        "Match explanation request failed:",
        error?.response?.data || error,
      );

      setMatchExplanationError(getCaseViewerErrorMessage(error));
    } finally {
      setMatchExplanationLoading(false);
    }
  }

  function handleBookmarkLoginRequired() {
    setLoginModalReason("bookmark");

    setLoginModalOpen(true);
  }

  function handleBookmarkChange({ bookmarked, message }) {
    setBookmarkMessage(
      message ||
        (bookmarked
          ? "Case bookmarked successfully."
          : "Bookmark removed successfully."),
    );
  }

  useEffect(() => {
    if (!bookmarkMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setBookmarkMessage("");
    }, 3500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [bookmarkMessage]);

  function navigateToAuthentication(mode) {
    setLoginModalOpen(false);

    navigate("/authentication", {
      state: {
        authMode: mode,

        from: location.pathname + location.search,
      },
    });
  }

  function getLoginModalFeatureName() {
    if (loginModalReason === "bookmark") {
      return "bookmark this case";
    }

    if (loginModalReason === "explanation") {
      return "generate a case explanation";
    }

    if (loginModalReason === "match-explanation") {
      return "explain why this decision matched your search";
    }

    return "generate a case summary";
  }

  if (pageLoading) {
    const loadingPercentage =
      ((loadingStep + 1) / CASE_VIEWER_LOADING_STEPS.length) * 99;

    return (
      <div className="case-viewer-loader">
        <div className="case-loader-background">
          <div className="case-loader-grid" />

          <span className="case-loader-orb case-loader-orb-one" />
          <span className="case-loader-orb case-loader-orb-two" />
          <span className="case-loader-orb case-loader-orb-three" />
        </div>

        <div className="case-loader-card" role="status" aria-live="polite">
          <div className="case-loader-logo-shell">
            <span className="case-loader-ring case-loader-ring-one" />
            <span className="case-loader-ring case-loader-ring-two" />
            <span className="case-loader-ring case-loader-ring-three" />

            <div className="case-loader-logo-center">
              <img src={lexminerLogo} alt="LexMiner" />
            </div>
          </div>

          <span className="case-loader-eyebrow">
            AI-assisted Legal Case Review
          </span>

          <h1>LexMiner</h1>

          <p>
            Preparing the complete Supreme Court decision and semantic matching
            evidence.
          </p>

          <div className="case-loader-status">
            <LoaderCircle size={17} className="case-spin" />

            <span>{CASE_VIEWER_LOADING_STEPS[loadingStep]?.label}</span>
          </div>

          <div className="case-loader-progress">
            <span
              style={{
                width: `${loadingPercentage}%`,
              }}
            />
          </div>

          <div className="case-loader-progress-copy">
            <span>Preparing Case Viewer</span>

            <strong>{Math.round(loadingPercentage)}%</strong>
          </div>

          <div className="case-loader-steps">
            {CASE_VIEWER_LOADING_STEPS.map((step, index) => {
              const completed = index < loadingStep;

              const active = index === loadingStep;

              return (
                <div
                  key={step.id}
                  className={`case-loader-step ${
                    completed ? "case-loader-step-completed" : ""
                  } ${active ? "case-loader-step-active" : ""}`}
                >
                  <span>
                    {completed ? (
                      <Check size={14} />
                    ) : active ? (
                      <LoaderCircle size={14} className="case-spin" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <p>{step.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !viewerData) {
    return (
      <div className="user-case-viewer-page">
        <div className="case-viewer-error-state">
          <AlertCircle size={42} />

          <span>Case Viewer unavailable</span>

          <h1>{loadError || "The decision could not be loaded."}</h1>

          <div>
            <button type="button" onClick={() => window.location.reload()}>
              Try Again
            </button>

            <button type="button" onClick={() => navigate(-1)}>
              <ArrowLeft size={17} />
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="user-case-viewer-page">
      <div className="case-viewer-background">
        <span className="case-background-orb case-background-orb-one" />
        <span className="case-background-orb case-background-orb-two" />
        <span className="case-background-orb case-background-orb-three" />
        <div className="case-background-grid" />
      </div>

      <UserHomeHeader />

      <main className="case-viewer-main">
        <div className="case-viewer-navigation-bar">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            Back to Results
          </button>
        </div>

        <section className="case-viewer-identity">
          <div>
            <span className="case-viewer-eyebrow">
              <Scale size={16} />
              Philippine Supreme Court Decision
            </span>

            <h1>{caseData.title || "Untitled Case"}</h1>

            <div className="case-viewer-identity-meta">
              <span>
                <FileText size={15} />
                {caseData.case_number || "Case number unavailable"}
              </span>

              <span>
                <CalendarDays size={15} />
                {formatDate(caseData.decision_date)}
              </span>

              <span>
                <Scale size={15} />
                {caseData.division || "Division not specified"}
              </span>
            </div>
          </div>
        </section>

        <div className="case-viewer-workspace">
          <section className="case-document-column">
            <article className="case-metadata-card">
              <div className="case-section-heading">
                <div>
                  <span>Official case information</span>

                  <h2>Decision Metadata</h2>
                </div>

                <Scale size={21} />
              </div>

              <dl className="case-metadata-grid">
                <div>
                  <dt>Case Number</dt>
                  <dd>{caseData.case_number || "Not specified"}</dd>
                </div>

                <div>
                  <dt>Case Type</dt>
                  <dd>{caseData.case_type || "Not specified"}</dd>
                </div>

                <div>
                  <dt>Decision Date</dt>
                  <dd>{formatDate(caseData.decision_date)}</dd>
                </div>

                <div>
                  <dt>Division</dt>
                  <dd>{caseData.division || "Not specified"}</dd>
                </div>

                <div>
                  <dt>Ponente</dt>
                  <dd>{caseData.ponencia || "Not specified"}</dd>
                </div>

                <div>
                  <dt>Indexed Chunks</dt>
                  <dd>{viewerData.chunk_count}</dd>
                </div>
              </dl>
            </article>

            <article className="cleaned-decision-card">
              <div className="case-section-heading">
                <div>
                  <span>Reconstructed cleaned document</span>

                  <h2>Complete Cleaned Decision</h2>
                </div>

                <FileText size={21} />
              </div>

              <div className="case-highlight-legend">
                <span>
                  <i className="chunk-legend-color" />
                  Semantic matching chunk
                </span>

                <span>
                  <i className="phrase-legend-color" />
                  Matching sentence or phrase
                </span>
              </div>

              <div className="cleaned-decision-content">
                {viewerData.chunks.map((chunk) => {
                  const matchedChunk = matchedChunkLookup.get(
                    chunk.chunk_number,
                  );

                  return (
                    <section
                      key={chunk.document_id || chunk.id}
                      className={`cleaned-case-chunk ${
                        matchedChunk ? "cleaned-case-chunk-matched" : ""
                      }`}
                    >
                      <span className="cleaned-case-chunk-label">
                        Chunk {chunk.chunk_number}
                      </span>

                      {chunk.text
                        .split(/\n\s*\n/)
                        .map((paragraph, paragraphIndex) => (
                          <p key={paragraphIndex}>
                            {matchedChunk ? (
                              <HighlightedChunkText
                                text={paragraph}
                                matchingSentences={
                                  matchedChunk.matching_sentences || []
                                }
                              />
                            ) : (
                              paragraph
                            )}
                          </p>
                        ))}
                    </section>
                  );
                })}
              </div>
            </article>
          </section>

          <aside className="case-ai-column">
            <article className="case-match-card">
              <div className="case-section-heading">
                <div>
                  <span>Semantic retrieval evidence</span>

                  <h2>Why This Case Matched</h2>
                </div>

                <Fingerprint size={21} />
              </div>

              {searchContext.query ? (
                <div className="case-query-preview">
                  <Search size={16} />

                  <span>{searchContext.query}</span>
                </div>
              ) : (
                <div className="case-query-preview">
                  <Search size={16} />

                  <span>Opened without search context</span>
                </div>
              )}

              <div className="case-match-statistics">
                <div>
                  <strong>{viewerData.matched_chunk_count}</strong>

                  <span>Matching passages</span>
                </div>
              </div>

              <div className="case-match-group">
                <span>Matched Scenarios</span>

                <div className="case-match-chips">
                  {searchContext.matched_scenarios?.length > 0 ? (
                    searchContext.matched_scenarios.map((scenario) => (
                      <span key={scenario}>
                        <CheckCircle2 size={14} />

                        {formatLegalLabel(scenario)}
                      </span>
                    ))
                  ) : (
                    <p>No predefined scenario was detected.</p>
                  )}
                </div>
              </div>

              <div className="case-match-group">
                <span>Matched Concepts</span>

                <div className="case-match-chips">
                  {searchContext.matched_concepts?.length > 0 ? (
                    searchContext.matched_concepts.map((concept) => (
                      <span key={concept}>
                        <Scale size={14} />

                        {formatLegalLabel(concept)}
                      </span>
                    ))
                  ) : (
                    <p>No predefined concept was detected.</p>
                  )}
                </div>
              </div>
            </article>

            <article className="case-ai-tools-card">
              <div className="case-section-heading">
                <div>
                  <span>Registered-user features</span>

                  <h2>AI Research Tools</h2>
                </div>

                <BrainCircuit size={21} />
              </div>

              <BookmarkButton
                caseId={caseData.id || caseId}
                variant="case-ai-action"
                onChange={handleBookmarkChange}
                onRequireLogin={handleBookmarkLoginRequired}
              />

              {bookmarkMessage && (
                <div className="case-viewer-bookmark-message" role="status">
                  {bookmarkMessage}
                </div>
              )}

              <button
                type="button"
                className="case-ai-action"
                onClick={handleGenerateSummary}
                disabled={
                  summaryLoading ||
                  explanationLoading ||
                  matchExplanationLoading
                }
              >
                {summaryLoading ? (
                  <LoaderCircle size={18} className="case-spin" />
                ) : currentUser ? (
                  <Sparkles size={18} />
                ) : (
                  <LockKeyhole size={18} />
                )}

                <div>
                  <strong>
                    {summaryLoading
                      ? "Generating Summary..."
                      : "Generate Case Summary"}
                  </strong>

                  <span>
                    {currentUser
                      ? "Facts, issues, ruling, doctrine, and disposition"
                      : "Registered users only"}
                  </span>
                </div>
              </button>

              {summaryError && (
                <div className="case-inline-error">
                  <AlertCircle size={16} />
                  {summaryError}
                </div>
              )}

              {summary && (
                <>
                  {/* ============================================
        DESKTOP SUMMARY RESULT
    ============================================ */}

                  <section
                    id="generated-case-summary"
                    className="case-detailed-explanation case-ai-result-desktop"
                  >
                    <div className="case-section-heading">
                      <div>
                        <span>AI-assisted case analysis</span>

                        <h2>AI Case Summary</h2>
                      </div>

                      <Sparkles size={23} />
                    </div>

                    <div className="case-explanation-intro">
                      <Sparkles size={17} />

                      <span>
                        A structured summary of the Supreme Court decision
                        covering the case facts, procedural history, legal
                        issues, ruling, doctrine, and disposition.
                      </span>
                    </div>

                    <div className="case-generated-content">
                      {renderGeneratedContent(summary)}
                    </div>

                    {summaryCitations.length > 0 && (
                      <details className="case-explanation-citations">
                        <summary>Supporting case passages</summary>

                        {summaryCitations.map((citation) => (
                          <article
                            key={citation.document_id || citation.chunk_number}
                          >
                            <strong>Chunk {citation.chunk_number}</strong>

                            <p>{citation.excerpt}</p>
                          </article>
                        ))}
                      </details>
                    )}

                    <div className="case-ai-disclaimer">
                      <ShieldAlert size={17} />

                      <span>
                        This AI summary is generated only from the supplied
                        Supreme Court decision content and is intended for legal
                        research assistance. It does not constitute legal
                        advice.
                      </span>
                    </div>
                  </section>

                  {/* ============================================
        TABLET / MOBILE RESULT BUTTON
    ============================================ */}

                  <button
                    type="button"
                    className="case-generated-result-button"
                    onClick={() => setGenerationModal("summary")}
                  >
                    <Sparkles size={18} />

                    <div>
                      <strong>View AI Case Summary</strong>

                      <span>
                        Open the generated summary and supporting passages
                      </span>
                    </div>

                    <ExternalLink size={17} />
                  </button>
                </>
              )}

              <button
                type="button"
                className="case-ai-action"
                onClick={handleGenerateExplanation}
                disabled={
                  matchExplanationLoading ||
                  summaryLoading ||
                  explanationLoading
                }
              >
                {explanationLoading ? (
                  <LoaderCircle size={18} className="case-spin" />
                ) : currentUser ? (
                  <BrainCircuit size={18} />
                ) : (
                  <LockKeyhole size={18} />
                )}

                <div>
                  <strong>
                    {explanationLoading
                      ? "Generating Explanation..."
                      : "Generate Case Explanation"}
                  </strong>

                  <span>
                    {currentUser
                      ? "Understand what happened, how the case developed, and why the Court ruled this way"
                      : "Registered users only"}
                  </span>
                </div>
              </button>

              {explanationError && (
                <div className="case-inline-error">
                  <AlertCircle size={16} />
                  {explanationError}
                </div>
              )}

              {explanation && (
                <>
                  <section
                    id="generated-case-explanation"
                    className="case-detailed-explanation case-ai-result-desktop"
                  >
                    <div className="case-section-heading">
                      <div>
                        <span>AI-assisted case analysis</span>

                        <h2>Case Explanation</h2>
                      </div>

                      <BrainCircuit size={23} />
                    </div>

                    <div className="case-explanation-intro">
                      <Sparkles size={17} />

                      <span>
                        A plain-language explanation of what happened, how the
                        dispute developed, how the Supreme Court analyzed the
                        case, and why it reached its decision.
                      </span>
                    </div>

                    <div className="case-generated-content">
                      {renderGeneratedContent(explanation)}
                    </div>

                    {explanationCitations.length > 0 && (
                      <details className="case-explanation-citations">
                        <summary>Supporting case passages</summary>

                        {explanationCitations.map((citation) => (
                          <article
                            key={citation.document_id || citation.chunk_number}
                          >
                            <strong>Chunk {citation.chunk_number}</strong>

                            <p>{citation.excerpt}</p>
                          </article>
                        ))}
                      </details>
                    )}

                    <div className="case-ai-disclaimer">
                      <ShieldAlert size={17} />

                      <span>
                        This AI explanation is generated only from the supplied
                        Supreme Court decision content and is intended for legal
                        research assistance. It does not constitute legal
                        advice.
                      </span>
                    </div>
                  </section>

                  <button
                    type="button"
                    className="case-generated-result-button"
                    onClick={() => setGenerationModal("explanation")}
                  >
                    <BrainCircuit size={18} />

                    <div>
                      <strong>View Case Explanation</strong>
                      <span>
                        Open the complete AI-assisted case explanation
                      </span>
                    </div>

                    <ExternalLink size={17} />
                  </button>
                </>
              )}

              <button
                type="button"
                className="case-ai-action"
                onClick={handleGenerateMatchExplanation}
                disabled={
                  matchExplanationLoading ||
                  summaryLoading ||
                  explanationLoading
                }
              >
                {matchExplanationLoading ? (
                  <LoaderCircle size={18} className="case-spin" />
                ) : currentUser ? (
                  <Fingerprint size={18} />
                ) : (
                  <LockKeyhole size={18} />
                )}

                <div>
                  <strong>
                    {matchExplanationLoading
                      ? "Analyzing Search Match..."
                      : "Explain Why It Matched"}
                  </strong>

                  <span>
                    {currentUser
                      ? "Understand why this decision was retrieved for your search"
                      : "Registered users only"}
                  </span>
                </div>
              </button>

              {matchExplanationError && (
                <div className="case-inline-error">
                  <AlertCircle size={16} />
                  {matchExplanationError}
                </div>
              )}

              {matchExplanation && (
                <>
                  {/* ============================================
        DESKTOP RESULT
    ============================================ */}

                  <section
                    id="generated-match-explanation"
                    className="case-detailed-explanation case-ai-result-desktop"
                  >
                    <div className="case-section-heading">
                      <div>
                        <span>AI-assisted relevance analysis</span>

                        <h2>Why This Decision Matches Your Search</h2>
                      </div>

                      <Fingerprint size={23} />
                    </div>

                    <div className="case-explanation-intro">
                      <Sparkles size={17} />

                      <span>
                        An explanation of how the user's search connects to the
                        relevant passages retrieved from this Supreme Court
                        decision.
                      </span>
                    </div>

                    <div className="case-generated-content">
                      {renderGeneratedContent(matchExplanation)}
                    </div>

                    {matchExplanationCitations.length > 0 && (
                      <details className="case-explanation-citations">
                        <summary>Supporting case passages</summary>

                        {matchExplanationCitations.map((citation) => (
                          <article
                            key={citation.document_id || citation.chunk_number}
                          >
                            <strong>Chunk {citation.chunk_number}</strong>

                            <p>{citation.excerpt}</p>
                          </article>
                        ))}
                      </details>
                    )}

                    <div className="case-ai-disclaimer">
                      <ShieldAlert size={17} />

                      <span>
                        This AI match explanation is generated only from the
                        retrieved Supreme Court decision passages and is
                        intended for legal research assistance. It does not
                        constitute legal advice.
                      </span>
                    </div>
                  </section>

                  {/* ============================================
        TABLET / MOBILE RESULT BUTTON
    ============================================ */}

                  <button
                    type="button"
                    className="case-generated-result-button"
                    onClick={() => setGenerationModal("match-explanation")}
                  >
                    <Fingerprint size={18} />

                    <div>
                      <strong>View Match Explanation</strong>

                      <span>
                        Open the explanation of why this case matched your
                        search
                      </span>
                    </div>

                    <ExternalLink size={17} />
                  </button>
                </>
              )}

              <button
                type="button"
                className="case-original-pdf-button"
                onClick={() => setPdfModalOpen(true)}
                disabled={!caseData.pdf_url}
              >
                <ExternalLink size={18} />

                <div>
                  <strong>View Original PDF</strong>

                  <span>Verify the official decision</span>
                </div>
              </button>

              <div className="case-research-notice">
                <ShieldCheck size={17} />

                <span>
                  LexMiner supports legal research and does not provide legal
                  advice.
                </span>
              </div>
            </article>
          </aside>
        </div>
        <ScrollToTopButton />
      </main>

      {loginModalOpen && (
        <div
          className="case-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setLoginModalOpen(false);
            }
          }}
        >
          <section className="case-login-modal" role="dialog" aria-modal="true">
            <button
              type="button"
              className="case-modal-close"
              onClick={() => setLoginModalOpen(false)}
            >
              <X size={19} />
            </button>

            <div className="case-modal-icon">
              <LockKeyhole size={28} />
            </div>

            <span>Registered-user feature</span>

            <h2>Sign in to {getLoginModalFeatureName()}</h2>

            <p>
              {loginModalReason === "bookmark"
                ? "Sign in or create an account to save Supreme Court decisions to your personal legal research collection."
                : loginModalReason === "explanation"
                  ? "Sign in or create an account to generate an AI-assisted explanation of the Supreme Court decision."
                  : loginModalReason === "match-explanation"
                    ? "Sign in or create an account to understand why this Supreme Court decision matched your search."
                    : "Sign in or create an account to generate a structured AI-assisted case summary."}
            </p>

            <p>
              You may continue reading the complete cleaned decision and
              original PDF without signing in.
            </p>

            <div className="case-modal-actions">
              <button
                type="button"
                onClick={() => navigateToAuthentication("LOGIN")}
              >
                Sign In
              </button>

              <button
                type="button"
                onClick={() => navigateToAuthentication("REGISTER")}
              >
                Create Account
              </button>
            </div>
          </section>
        </div>
      )}

      {pdfModalOpen && (
        <div
          className="case-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPdfModalOpen(false);
            }
          }}
        >
          <section className="case-pdf-modal" role="dialog" aria-modal="true">
            <header>
              <div>
                <span>Original Supreme Court document</span>

                <strong>{caseData.case_number || caseData.title}</strong>
              </div>

              <button type="button" onClick={() => setPdfModalOpen(false)}>
                <X size={20} />
              </button>
            </header>

            <iframe
              src={getOriginalPdfUrl(caseId)}
              title={`Original PDF for ${
                caseData.case_number || caseData.title
              }`}
            />
          </section>
        </div>
      )}

      {generationModal && (
        <div
          className="case-modal-backdrop case-generation-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setGenerationModal(null);
            }
          }}
        >
          <section
            className="case-generation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="generation-modal-title"
          >
            <header className="case-generation-modal-header">
              <div>
                <span>
                  {generationModal === "summary"
                    ? "AI-assisted case summary"
                    : generationModal === "explanation"
                      ? "AI-assisted case explanation"
                      : "AI-assisted relevance analysis"}
                </span>

                <h2 id="generation-modal-title">
                  {generationModal === "summary"
                    ? "AI Case Summary"
                    : generationModal === "explanation"
                      ? "Case Explanation"
                      : "Why This Decision Matches Your Search"}
                </h2>
              </div>

              <button
                type="button"
                className="case-modal-close"
                onClick={() => setGenerationModal(null)}
                aria-label="Close generated result"
              >
                <X size={19} />
              </button>
            </header>

            {generationModal === "summary" ? (
              <div className="case-generation-modal-content">
                <div className="case-generation-modal-intro">
                  <Sparkles size={17} />

                  <span>
                    AI-generated summary based only on the supplied Supreme
                    Court decision content.
                  </span>
                </div>

                <div className="case-generated-content">
                  {renderGeneratedContent(summary)}
                </div>

                {summaryCitations.length > 0 && (
                  <details className="case-explanation-citations">
                    <summary>Supporting case passages</summary>

                    {summaryCitations.map((citation) => (
                      <article
                        key={citation.document_id || citation.chunk_number}
                      >
                        <strong>Chunk {citation.chunk_number}</strong>

                        <p>{citation.excerpt}</p>
                      </article>
                    ))}
                  </details>
                )}

                <div className="case-ai-disclaimer">
                  <ShieldAlert size={17} />

                  <span>
                    This AI summary is generated only from the supplied Supreme
                    Court decision content and is intended for legal research
                    assistance. It does not constitute legal advice.
                  </span>
                </div>
              </div>
            ) : generationModal === "explanation" ? (
              <div className="case-generation-modal-content">
                <div className="case-generation-modal-intro">
                  <BrainCircuit size={17} />

                  <span>
                    A plain-language explanation generated from the supplied
                    Supreme Court decision content.
                  </span>
                </div>

                <div className="case-generated-content">
                  {renderGeneratedContent(explanation)}
                </div>

                {explanationCitations.length > 0 && (
                  <details className="case-explanation-citations">
                    <summary>Supporting case passages</summary>

                    {explanationCitations.map((citation) => (
                      <article
                        key={citation.document_id || citation.chunk_number}
                      >
                        <strong>Chunk {citation.chunk_number}</strong>

                        <p>{citation.excerpt}</p>
                      </article>
                    ))}
                  </details>
                )}

                <div className="case-ai-disclaimer">
                  <ShieldAlert size={17} />

                  <span>
                    This AI explanation is generated only from the supplied
                    Supreme Court decision content and is intended for legal
                    research assistance. It does not constitute legal advice.
                  </span>
                </div>
              </div>
            ) : (
              <div className="case-generation-modal-content">
                <div className="case-generation-modal-intro">
                  <Fingerprint size={17} />

                  <span>
                    An AI-assisted explanation of why this Supreme Court
                    decision matched the user's semantic search.
                  </span>
                </div>

                <div className="case-generated-content">
                  {renderGeneratedContent(matchExplanation)}
                </div>

                {matchExplanationCitations.length > 0 && (
                  <details className="case-explanation-citations">
                    <summary>Supporting case passages</summary>

                    {matchExplanationCitations.map((citation) => (
                      <article
                        key={citation.document_id || citation.chunk_number}
                      >
                        <strong>Chunk {citation.chunk_number}</strong>

                        <p>{citation.excerpt}</p>
                      </article>
                    ))}
                  </details>
                )}

                <div className="case-ai-disclaimer">
                  <ShieldAlert size={17} />

                  <span>
                    This AI match explanation is generated only from the
                    retrieved Supreme Court decision passages and is intended
                    for legal research assistance. It does not constitute legal
                    advice.
                  </span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
