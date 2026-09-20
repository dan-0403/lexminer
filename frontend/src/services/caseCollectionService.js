import axios from "axios";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000",
).replace(/\/+$/, "");

const MIN_DATASET_YEAR = 2016;
const MAX_DATASET_YEAR = 2026;

/* =========================================================
   HELPERS
========================================================= */

function normalizeInteger(value, fieldName) {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue)) {
    throw new Error(`${fieldName} must be a valid integer.`);
  }

  return numericValue;
}

function normalizeArchiveYear(value, fieldName) {
  const numericYear = normalizeInteger(value, fieldName);

  if (numericYear < MIN_DATASET_YEAR || numericYear > MAX_DATASET_YEAR) {
    throw new Error(
      `${fieldName} must be between ` +
        `${MIN_DATASET_YEAR} and ` +
        `${MAX_DATASET_YEAR}.`,
    );
  }

  return numericYear;
}

/* =========================================================
   GET ARCHIVE
========================================================= */

export async function getCaseCollectionArchive({
  startYear = MIN_DATASET_YEAR,

  endYear = MAX_DATASET_YEAR,
} = {}) {
  const normalizedStartYear = normalizeArchiveYear(startYear, "Start year");

  const normalizedEndYear = normalizeArchiveYear(endYear, "End year");

  if (normalizedEndYear < normalizedStartYear) {
    throw new Error("End year must be greater than or equal to start year.");
  }

  const response = await axios.get(
    `${API_BASE_URL}/api/user/case-collection/archive`,
    {
      params: {
        start_year: normalizedStartYear,

        end_year: normalizedEndYear,
      },

      timeout: 60000,

      headers: {
        Accept: "application/json",
      },
    },
  );

  return response.data;
}

/* =========================================================
   GET CASES FOR SELECTED MONTH
========================================================= */

export async function getCollectionMonthCases({ year, month }) {
  const normalizedYear = normalizeArchiveYear(year, "Year");

  const normalizedMonth = normalizeInteger(month, "Month");

  if (normalizedMonth < 1 || normalizedMonth > 12) {
    throw new Error("Month must be between 1 and 12.");
  }

  const response = await axios.get(
    `${API_BASE_URL}/api/user/case-collection/cases`,
    {
      params: {
        year: normalizedYear,

        month: normalizedMonth,
      },

      timeout: 60000,

      headers: {
        Accept: "application/json",
      },
    },
  );

  return response.data;
}

/* =========================================================
   GET INLINE PDF URL
========================================================= */

export function getCollectionPdfUrl(datasetId) {
  const normalizedDatasetId = String(datasetId || "").trim();

  if (!normalizedDatasetId) {
    return "";
  }

  return (
    `${API_BASE_URL}` +
    `/api/user/case-collection/` +
    `datasets/` +
    `${encodeURIComponent(normalizedDatasetId)}/pdf`
  );
}

/* =========================================================
   ERROR MESSAGE
========================================================= */

export function getCaseCollectionErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  const statusCode = error?.response?.status;

  if (error?.code === "ECONNABORTED") {
    return "The case collection request took too long. " + "Please try again.";
  }

  if (statusCode === 404) {
    return typeof detail === "string"
      ? detail
      : "The requested case or PDF could not be found.";
  }

  if (statusCode === 503) {
    return typeof detail === "string"
      ? detail
      : "The case dataset is currently unavailable.";
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || "Invalid request.")
      .join(" ");
  }

  if (!error?.response && error?.message === "Network Error") {
    return "LexMiner could not connect to the backend server.";
  }

  return error?.message || "LexMiner could not load the case collection.";
}
