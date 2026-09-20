import { authenticatedUserAPI } from "./userAuthService";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/* =========================================================
   CASE ID VALIDATION
========================================================= */

function validateCaseId(caseId) {
  const numericCaseId = Number(caseId);

  if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
    throw new Error("A valid case ID is required.");
  }

  return numericCaseId;
}

/* =========================================================
   MATCHED CHUNK NORMALIZATION
========================================================= */

function normalizeMatchedChunks(matchedChunks) {
  if (!Array.isArray(matchedChunks)) {
    return [];
  }

  return matchedChunks
    .map((chunk) => {
      const chunkNumber = Number(chunk?.chunk_number);

      if (!Number.isInteger(chunkNumber) || chunkNumber < 0) {
        return null;
      }

      return {
        document_id: chunk?.document_id || null,

        chunk_number: chunkNumber,

        text: chunk?.text || null,

        distance: chunk?.distance ?? chunk?.best_vector_distance ?? null,

        original_distance: chunk?.original_distance ?? null,

        expanded_distance: chunk?.expanded_distance ?? null,

        best_vector_distance:
          chunk?.best_vector_distance ?? chunk?.distance ?? null,

        vector_similarity_score: chunk?.vector_similarity_score ?? null,

        reranker_score: chunk?.reranker_score ?? null,

        reranker_applied: Boolean(chunk?.reranker_applied),

        retrieval_sources: Array.isArray(chunk?.retrieval_sources)
          ? chunk.retrieval_sources
          : [],
      };
    })
    .filter(Boolean);
}

/* =========================================================
   LOAD CASE VIEWER
========================================================= */

export async function loadCaseViewer({
  caseId,
  query = "",
  expandedQuery = "",
  similarityScore = null,
  matchedIntents = [],
  matchedIssues = [],
  matchedConcepts = [],
  matchedScenarios = [],
  matchedChunks = [],
}) {
  const numericCaseId = validateCaseId(caseId);

  const numericSimilarityScore =
    similarityScore === null || similarityScore === undefined
      ? null
      : Number(similarityScore);

  const response = await authenticatedUserAPI.post(
    `/api/user/case-viewer/cases/${numericCaseId}`,
    {
      query: String(query || "").trim(),

      expanded_query: String(expandedQuery || "").trim(),

      similarity_score: Number.isFinite(numericSimilarityScore)
        ? numericSimilarityScore
        : null,

      matched_intents: Array.isArray(matchedIntents) ? matchedIntents : [],

      matched_issues: Array.isArray(matchedIssues) ? matchedIssues : [],

      matched_concepts: Array.isArray(matchedConcepts) ? matchedConcepts : [],

      matched_scenarios: Array.isArray(matchedScenarios)
        ? matchedScenarios
        : [],

      matched_chunks: normalizeMatchedChunks(matchedChunks),

      sentence_limit: 5,

      minimum_similarity: 0.35,
    },
  );

  return response.data;
}

/* =========================================================
   GENERATE CASE SUMMARY
========================================================= */

export async function generateCaseSummary(caseId) {
  const numericCaseId = validateCaseId(caseId);

  const response = await authenticatedUserAPI.post(
    "/api/user/case-viewer/generate-summary",
    {
      case_id: numericCaseId,
    },
  );

  return response.data;
}

/* =========================================================
   GENERATE CASE EXPLANATION
========================================================= */

export async function generateCaseExplanation(caseId) {
  const numericCaseId = validateCaseId(caseId);

  const response = await authenticatedUserAPI.post(
    "/api/user/case-viewer/generate-explanation",
    {
      case_id: numericCaseId,
    },
  );

  return response.data;
}

/* =========================================================
   GENERATE MATCH EXPLANATION
========================================================= */

export async function generateCaseMatchExplanation({
  caseId,
  query = "",
  expandedQuery = "",
  matchedIntents = [],
  matchedIssues = [],
  matchedConcepts = [],
  matchedScenarios = [],
  matchedChunks = [],
}) {
  const numericCaseId = validateCaseId(caseId);

  const normalizedQuery = String(query || "")
    .trim()
    .replace(/\s+/g, " ");

  if (!normalizedQuery) {
    throw new Error("The original search query is required.");
  }

  const response = await authenticatedUserAPI.post(
    "/api/user/case-viewer/generate-match-explanation",
    {
      case_id: numericCaseId,

      query: normalizedQuery,

      expanded_query: String(expandedQuery || "").trim() || null,

      matched_intents: Array.isArray(matchedIntents) ? matchedIntents : [],

      matched_issues: Array.isArray(matchedIssues) ? matchedIssues : [],

      matched_concepts: Array.isArray(matchedConcepts) ? matchedConcepts : [],

      matched_scenarios: Array.isArray(matchedScenarios)
        ? matchedScenarios
        : [],

      matched_chunks: normalizeMatchedChunks(matchedChunks),
    },
  );

  return response.data;
}

/* =========================================================
   ORIGINAL PDF
========================================================= */

export function getOriginalPdfUrl(caseId) {
  const numericCaseId = Number(caseId);

  if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
    return "";
  }

  return `${API_BASE_URL}/api/user/cases/` + `${numericCaseId}/pdf`;
}

/* =========================================================
   ERROR MESSAGE
========================================================= */

export function getCaseViewerErrorMessage(error) {
  const statusCode = error?.response?.status;

  const detail = error?.response?.data?.detail;

  if (statusCode === 401) {
    return typeof detail === "string"
      ? detail
      : "Your session is missing or expired. Please sign in again.";
  }

  if (statusCode === 403) {
    return typeof detail === "string"
      ? detail
      : "Your account does not have permission to use this feature.";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        return item?.msg || item?.message || "Invalid request.";
      })
      .join(" ");
  }

  if (detail && typeof detail === "object") {
    return (
      detail.message ||
      detail.error ||
      "LexMiner could not complete this request."
    );
  }

  return error?.message || "LexMiner could not complete this request.";
}
