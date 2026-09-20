import axios from "axios";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// ============================================
// Get Access Token
// ============================================

const getAccessToken = () => {
  const token = localStorage.getItem("access_token");

  if (!token) {
    throw new Error("You must be logged in to use this feature.");
  }

  return token;
};

// ============================================
// Get Visitor Session ID
// ============================================

const getVisitorSessionId = () => {
  let sessionId = localStorage.getItem("visitor_session_id");

  if (!sessionId) {
    sessionId = crypto.randomUUID();

    localStorage.setItem("visitor_session_id", sessionId);
  }

  return sessionId;
};

// ============================================
// Visitor Log (Public)
// ============================================

export const recordVisitorLog = async (visitedPage) => {
  const response = await API.post(
    "/api/user/visitor-log",

    {
      session_id: getVisitorSessionId(),
      visited_page: visitedPage,
    },
  );

  return response.data;
};

// ============================================
// Semantic Search (Public)
// ============================================

export const semanticSearch = async (
  query,
  { limit = 20, year = null, division = null, caseNumber = null } = {},
) => {
  const normalizedQuery = String(query || "")
    .trim()
    .replace(/\s+/g, " ");

  const normalizedCaseNumber = String(caseNumber || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalizedQuery && !normalizedCaseNumber) {
    throw new Error("Enter a legal issue or a case number.");
  }

  const normalizedYear =
    year === null || year === undefined || year === "" ? null : Number(year);

  const normalizedDivision = String(division || "").trim() || null;

  const response = await API.post("/api/user/search", {
    query: normalizedQuery,

    limit: Math.min(Math.max(Number(limit) || 10, 1), 100),

    filters: {
      year: Number.isInteger(normalizedYear) ? normalizedYear : null,

      division: normalizedDivision,

      case_number: normalizedCaseNumber || null,
    },
  });

  return response.data;
};

// ============================================
// Generate AI Summary (Registered User Only)
// ============================================

export const generateSummary = async (caseId) => {
  const token = getAccessToken();

  const response = await API.post(
    "/api/user/generate-summary",

    {
      case_id: caseId,
    },

    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// ============================================
// Generate Legal Explanation (Registered User Only)
// ============================================

export const generateExplanation = async (caseId) => {
  const token = getAccessToken();

  const response = await API.post(
    "/api/user/explain-case",

    {
      case_id: caseId,
    },

    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// ============================================
// Generate Match Explanation
// Registered User Only
// ============================================

export const generateCaseMatchExplanation = async ({
  caseId,
  query,
  expandedQuery = "",
  matchedIntents = [],
  matchedIssues = [],
  matchedConcepts = [],
  matchedScenarios = [],
  matchedChunks = [],
}) => {
  const token = getAccessToken();

  const response = await API.post(
    "/api/user/case-viewer/generate-match-explanation",

    {
      case_id: Number(caseId),

      query: String(query || "").trim(),

      expanded_query: String(expandedQuery || "").trim() || null,

      matched_intents: Array.isArray(matchedIntents) ? matchedIntents : [],

      matched_issues: Array.isArray(matchedIssues) ? matchedIssues : [],

      matched_concepts: Array.isArray(matchedConcepts) ? matchedConcepts : [],

      matched_scenarios: Array.isArray(matchedScenarios)
        ? matchedScenarios
        : [],

      matched_chunks: Array.isArray(matchedChunks)
        ? matchedChunks.map((chunk) => ({
            document_id: chunk?.document_id || null,

            chunk_number: Number(chunk?.chunk_number),

            text: chunk?.text || null,

            distance: chunk?.distance ?? null,

            original_distance: chunk?.original_distance ?? null,

            expanded_distance: chunk?.expanded_distance ?? null,

            best_vector_distance: chunk?.best_vector_distance ?? null,

            reranker_score: chunk?.reranker_score ?? null,

            reranker_applied: Boolean(chunk?.reranker_applied),

            retrieval_sources: Array.isArray(chunk?.retrieval_sources)
              ? chunk.retrieval_sources
              : [],
          }))
        : [],
    },

    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  return response.data;
};

// ============================================
// Get Cleaned Case Text
// ============================================

export const getCaseViewer = async (caseId) => {
  const response = await API.post(
    "/api/user/case-viewer",

    {
      case_id: caseId,
    },
  );

  return response.data;
};
