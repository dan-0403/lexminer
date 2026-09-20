import axios from "axios";

/* =====================================================
   API CONFIGURATION
===================================================== */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

const DATASET_ENDPOINT = "/api/admin/datasets";

/*
 * Based on the background-job route created earlier:
 *
 * @router.post("/dataset-import-jobs")
 * @router.get("/dataset-import-jobs/{job_id}")
 *
 * with the admin router prefix "/api/admin".
 */
const DATASET_IMPORT_JOB_ENDPOINT = "/api/admin/datasets/import-jobs";

/*
 * Change this only when Swagger shows a different path.
 *
 * Possible values:
 * "/refresh"
 * "/api/auth/refresh"
 * "/api/admin/auth/refresh"
 */
const REFRESH_ENDPOINT = "/api/auth/refresh";

/* =====================================================
   AUTHENTICATED DATASET API
===================================================== */

const datasetApi = axios.create({
  baseURL: API_BASE_URL,

  timeout: 180000,

  headers: {
    Accept: "application/json",
  },
});

/*
 * Refresh requests use a separate Axios instance so
 * they do not enter the datasetApi response interceptor.
 */
const refreshApi = axios.create({
  baseURL: API_BASE_URL,

  timeout: 30000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/*
 * When several requests fail with 401 at the same time,
 * they will share one refresh request.
 */
let refreshPromise = null;

/* =====================================================
   CLEAR ADMIN SESSION
===================================================== */

export function clearAdminSession() {
  localStorage.removeItem("admin_token");

  localStorage.removeItem("admin_access_token");

  localStorage.removeItem("admin_refresh_token");

  localStorage.removeItem("admin_user");
}

/* =====================================================
   REDIRECT TO ADMIN LOGIN
===================================================== */

function redirectToAdminLogin() {
  if (window.location.pathname !== "/admin/login") {
    window.location.replace("/admin/login");
  }
}

/* =====================================================
   GET ACCESS TOKEN
===================================================== */

function getStoredAccessToken() {
  return (
    localStorage.getItem("admin_token") ||
    localStorage.getItem("admin_access_token")
  );
}

/* =====================================================
   GET REFRESH TOKEN
===================================================== */

function getStoredRefreshToken() {
  return localStorage.getItem("admin_refresh_token");
}

/* =====================================================
   SAVE NEW TOKENS
===================================================== */

function saveRefreshedTokens(data) {
  const accessToken = data?.access_token;

  if (!accessToken) {
    throw new Error("The refresh response did not include an access token.");
  }

  /*
   * Keep admin_token because your existing pages already
   * read that key.
   */
  localStorage.setItem("admin_token", accessToken);

  localStorage.setItem("admin_access_token", accessToken);

  /*
   * Some backends rotate the refresh token while others
   * return only a new access token.
   */
  if (data?.refresh_token) {
    localStorage.setItem("admin_refresh_token", data.refresh_token);
  }

  return accessToken;
}

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

datasetApi.interceptors.request.use(
  (config) => {
    const accessToken = getStoredAccessToken();

    config.headers = config.headers || {};

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    config.headers.Accept = config.headers.Accept || "application/json";

    return config;
  },

  (error) => Promise.reject(error),
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

datasetApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error?.config;

    const responseStatus = error?.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || "");

    const isRefreshRequest = requestUrl.includes(REFRESH_ENDPOINT);

    /*
     * A refresh is attempted only when:
     *
     * 1. The API returned 401.
     * 2. The original request has not already been retried.
     * 3. The failed request is not the refresh endpoint.
     */
    if (responseStatus !== 401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getStoredRefreshToken();

    if (!refreshToken) {
      clearAdminSession();

      redirectToAdminLogin();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Only one refresh request is created even when
       * multiple API calls expire simultaneously.
       */
      if (!refreshPromise) {
        refreshPromise = refreshApi
          .post(REFRESH_ENDPOINT, {
            refresh_token: refreshToken,
          })
          .then((response) => saveRefreshedTokens(response?.data || {}))
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      /*
       * Retry the request that originally returned 401.
       */
      return datasetApi(originalRequest);
    } catch (refreshError) {
      clearAdminSession();

      redirectToAdminLogin();

      return Promise.reject(refreshError);
    }
  },
);

/* =====================================================
   ERROR MESSAGE
===================================================== */

export function getAdminDatasetErrorMessage(error) {
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

        return item?.msg || item?.message || "Invalid request value.";
      })
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.message || detail.error || "The server rejected the request.";
  }

  switch (error?.response?.status) {
    case 400:
      return "The dataset request is invalid.";

    case 401:
      return "Your administrator session expired and could not be refreshed.";

    case 403:
      return "Your account is not authorized to perform this dataset operation.";

    case 404:
      return "The requested dataset or PDF file could not be found.";

    case 409:
      return "The dataset operation conflicts with its current processing state.";

    case 422:
      return "One or more dataset request values are invalid.";

    case 500:
      return "The server encountered an error while processing the dataset.";

    default:
      return (
        error?.message || "An unexpected dataset management error occurred."
      );
  }
}

/* =====================================================
   NORMALIZE PAGE NUMBER
===================================================== */

function normalizePage(page) {
  return Math.max(Number(page) || 1, 1);
}

/* =====================================================
   NORMALIZE PAGE SIZE
===================================================== */

function normalizePageSize(pageSize) {
  return Math.min(Math.max(Number(pageSize) || 25, 1), 100);
}

/* =====================================================
   BUILD DATASET QUERY PARAMETERS
===================================================== */

function buildDatasetParams({
  page = 1,
  pageSize = 25,
  filename = "",
  importStatus = "",
  year = "",
  month = "",
  isIndexed = "",
} = {}) {
  const safePage = normalizePage(page);

  const safePageSize = normalizePageSize(pageSize);

  const params = {
    skip: (safePage - 1) * safePageSize,

    limit: safePageSize,
  };

  const cleanFilename = String(filename || "").trim();

  if (cleanFilename) {
    params.filename = cleanFilename;
  }

  if (importStatus) {
    params.import_status = String(importStatus);
  }

  if (year !== "" && year !== null && year !== undefined) {
    const numericYear = Number(year);

    if (Number.isInteger(numericYear)) {
      params.year = numericYear;
    }
  }

  const cleanMonth = String(month || "").trim();

  if (cleanMonth) {
    params.month = cleanMonth;
  }

  if (isIndexed !== "" && isIndexed !== null && isIndexed !== undefined) {
    params.is_indexed = isIndexed === true || isIndexed === "true";
  }

  return params;
}

/* =====================================================
   VALIDATE DATASET ID
===================================================== */

function requireDatasetId(datasetId) {
  const normalizedId = String(datasetId || "").trim();

  if (!normalizedId) {
    throw new Error("A dataset ID is required.");
  }

  return normalizedId;
}

/* =====================================================
   VALIDATE IMPORT JOB ID
===================================================== */

function requireImportJobId(jobId) {
  const normalizedId = String(jobId || "").trim();

  if (!normalizedId) {
    throw new Error("A dataset import job ID is required.");
  }

  return normalizedId;
}

/* =====================================================
   GET DATASET PAGE
===================================================== */

export async function getAdminDatasetPage({
  page = 1,
  pageSize = 25,
  filename = "",
  importStatus = "",
  year = "",
  month = "",
  isIndexed = "",
} = {}) {
  const params = buildDatasetParams({
    page,
    pageSize,
    filename,
    importStatus,
    year,
    month,
    isIndexed,
  });

  const response = await datasetApi.get(DATASET_ENDPOINT, {
    params,
  });

  const data = response?.data || {};

  return {
    total: Number(data.total || 0),

    skip: Number(data.skip || 0),

    limit: Number(data.limit || params.limit),

    datasets: Array.isArray(data.datasets) ? data.datasets : [],
  };
}

/* =====================================================
   GET ONE DATASET
===================================================== */

export async function getAdminDataset(datasetId) {
  const id = requireDatasetId(datasetId);

  const response = await datasetApi.get(`${DATASET_ENDPOINT}/${id}`);

  return response.data;
}

/* =====================================================
   LEGACY SYNCHRONOUS IMPORT
===================================================== */

/*
 * Keep this temporarily only when another page still uses
 * the old synchronous import endpoint.
 *
 * The progress modal should use:
 * startAdminDatasetImportJob()
 */
export async function importAdminDatasets() {
  const response = await datasetApi.post(`${DATASET_ENDPOINT}/import`, {});

  return response.data;
}

/* =====================================================
   PROCESS PENDING DATASET
===================================================== */

export async function processAdminDataset(datasetId) {
  const id = requireDatasetId(datasetId);

  const response = await datasetApi.post(
    `${DATASET_ENDPOINT}/${id}/process`,
    {},
  );

  return response.data;
}

/* =====================================================
   RETRY FAILED DATASET
===================================================== */

export async function retryAdminDataset(datasetId) {
  const id = requireDatasetId(datasetId);

  const response = await datasetApi.post(`${DATASET_ENDPOINT}/${id}/retry`, {});

  return response.data;
}

/* =====================================================
   REPROCESS DATASET
===================================================== */

export async function reprocessAdminDataset(datasetId) {
  const id = requireDatasetId(datasetId);

  const response = await datasetApi.post(
    `${DATASET_ENDPOINT}/${id}/reprocess`,
    {},
  );

  return response.data;
}

/* =====================================================
   DELETE DATASET
===================================================== */

export async function deleteAdminDataset(
  datasetId,
  { deleteFile = false } = {},
) {
  const id = requireDatasetId(datasetId);

  const response = await datasetApi.delete(`${DATASET_ENDPOINT}/${id}`, {
    params: {
      delete_file: Boolean(deleteFile),
    },
  });

  return response.data;
}

/* =====================================================
   GET PDF BLOB
===================================================== */

async function getDatasetPdfBlob(datasetId, endpoint) {
  const id = requireDatasetId(datasetId);

  const response = await datasetApi.get(
    `${DATASET_ENDPOINT}/${id}/${endpoint}`,
    {
      responseType: "blob",
    },
  );

  return response.data;
}

/* =====================================================
   OPEN DATASET PDF
===================================================== */

export async function openAdminDatasetPdf(datasetId) {
  const pdfBlob = await getDatasetPdfBlob(datasetId, "pdf");

  const pdfUrl = URL.createObjectURL(pdfBlob);

  const popup = window.open(pdfUrl, "_blank", "noopener,noreferrer");

  if (!popup) {
    URL.revokeObjectURL(pdfUrl);

    throw new Error(
      "The browser blocked the PDF window. Allow pop-ups and try again.",
    );
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 60000);
}

/* =====================================================
   DOWNLOAD DATASET PDF
===================================================== */

export async function downloadAdminDatasetPdf(
  datasetId,
  filename = "dataset.pdf",
) {
  const pdfBlob = await getDatasetPdfBlob(datasetId, "download");

  const pdfUrl = URL.createObjectURL(pdfBlob);

  const link = document.createElement("a");

  link.href = pdfUrl;

  link.download = String(filename || "dataset.pdf");

  document.body.appendChild(link);

  link.click();

  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(pdfUrl);
  }, 1000);
}

/* =====================================================
   GET DATASET QUEUE
===================================================== */

export async function getAdminDatasetQueue({
  page = 1,
  pageSize = 25,
  queueStatus = "",
  filename = "",
  year = "",
  month = "",
} = {}) {
  const safePage = normalizePage(page);

  const safePageSize = normalizePageSize(pageSize);

  const params = {
    skip: (safePage - 1) * safePageSize,

    limit: safePageSize,
  };

  const cleanFilename = String(filename || "").trim();

  if (cleanFilename) {
    params.filename = cleanFilename;
  }

  if (queueStatus) {
    params.queue_status = String(queueStatus).trim();
  }

  if (year !== "" && year !== null && year !== undefined) {
    const numericYear = Number(year);

    if (Number.isInteger(numericYear)) {
      params.year = numericYear;
    }
  }

  const cleanMonth = String(month || "").trim();

  if (cleanMonth) {
    params.month = cleanMonth;
  }

  const response = await datasetApi.get(`${DATASET_ENDPOINT}/queue`, {
    params,
  });

  const data = response?.data || {};

  return {
    summary: {
      pending: Number(data?.summary?.pending || 0),

      failed: Number(data?.summary?.failed || 0),

      total: Number(data?.summary?.total || 0),
    },

    total: Number(data.total || 0),

    skip: Number(data.skip || 0),

    limit: Number(data.limit || safePageSize),

    items: Array.isArray(data.items) ? data.items : [],
  };
}

/* =====================================================
   START DATASET IMPORT JOB
===================================================== */

export async function startAdminDatasetImportJob() {
  const response = await datasetApi.post(DATASET_IMPORT_JOB_ENDPOINT, {});

  return response.data;
}

/* =====================================================
   GET DATASET IMPORT JOB
===================================================== */

export async function getAdminDatasetImportJob(jobId) {
  const id = requireImportJobId(jobId);

  const response = await datasetApi.get(`${DATASET_IMPORT_JOB_ENDPOINT}/${id}`);

  return response.data;
}

/* =====================================================
   EXPORT AUTHENTICATED INSTANCE
===================================================== */

export { datasetApi };

export default datasetApi;
