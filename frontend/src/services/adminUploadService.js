import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/*
 * Change this to the exact refresh path shown in Swagger.
 *
 * Examples:
 * "/refresh"
 * "/api/auth/refresh"
 * "/api/admin/auth/refresh"
 */
const REFRESH_ENDPOINT = "/api/auth/refresh";

/* =====================================================
   UPLOAD API
===================================================== */

const adminUploadAPI = axios.create({
  baseURL: API_URL,

  timeout: 10 * 60 * 1000,

  headers: {
    Accept: "application/json",
  },
});

/*
 * Use a separate Axios instance for refresh requests.
 * This prevents the refresh request from entering the
 * same response interceptor.
 */
const refreshAPI = axios.create({
  baseURL: API_URL,

  timeout: 500000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

/* =====================================================
   SESSION HELPERS
===================================================== */

function getAccessToken() {
  return (
    localStorage.getItem("admin_token") ||
    localStorage.getItem("admin_access_token")
  );
}

function getRefreshToken() {
  return localStorage.getItem("admin_refresh_token");
}

function saveTokens(data) {
  const accessToken = data?.access_token;

  if (!accessToken) {
    throw new Error("The refresh response did not include an access token.");
  }

  localStorage.setItem("admin_token", accessToken);

  localStorage.setItem("admin_access_token", accessToken);

  if (data?.refresh_token) {
    localStorage.setItem("admin_refresh_token", data.refresh_token);
  }

  return accessToken;
}

export function clearAdminUploadSession() {
  localStorage.removeItem("admin_token");

  localStorage.removeItem("admin_access_token");

  localStorage.removeItem("admin_refresh_token");

  localStorage.removeItem("admin_user");
}

function redirectToAdminLogin() {
  if (window.location.pathname !== "/admin/login") {
    window.location.replace("/admin/login");
  }
}

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

adminUploadAPI.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    config.headers = config.headers || {};

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    config.headers.Accept = config.headers.Accept || "application/json";

    return config;
  },

  (error) => Promise.reject(error),
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

adminUploadAPI.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error?.config;

    const status = error?.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || "");

    const isRefreshRequest = requestUrl.includes(REFRESH_ENDPOINT);

    /*
     * Refresh only when:
     *
     * 1. The access token produced a 401.
     * 2. The request has not already been retried.
     * 3. The failed request is not the refresh request.
     */
    if (status !== 401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAdminUploadSession();

      redirectToAdminLogin();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Multiple failed requests share the same refresh call.
       */
      if (!refreshPromise) {
        refreshPromise = refreshAPI
          .post(REFRESH_ENDPOINT, {
            refresh_token: refreshToken,
          })
          .then((response) => saveTokens(response?.data || {}))
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      /*
       * Axios preserves the FormData body and upload
       * progress callback when retrying the original request.
       */
      return adminUploadAPI(originalRequest);
    } catch (refreshError) {
      clearAdminUploadSession();

      redirectToAdminLogin();

      return Promise.reject(refreshError);
    }
  },
);

/* =====================================================
   UPLOAD ADMIN DOCUMENTS
===================================================== */

/**
 * Upload one or more Supreme Court PDF documents.
 *
 * Backend endpoint:
 * POST /api/admin/datasets/upload-pdfs
 *
 * Form fields:
 * year: number
 * month: DecisionMonth value
 * files: one or more PDF files
 */
export async function uploadAdminDocuments({
  year,
  month,
  files,
  onUploadProgress,
}) {
  const numericYear = Number(year);

  if (!Number.isInteger(numericYear)) {
    throw new Error("A valid decision year is required.");
  }

  const normalizedMonth = String(month || "").trim();

  if (!normalizedMonth) {
    throw new Error("A valid decision month is required.");
  }

  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("At least one PDF document must be selected.");
  }

  const formData = new FormData();

  formData.append("year", String(numericYear));

  formData.append("month", normalizedMonth);

  files.forEach((file) => {
    if (!(file instanceof File)) {
      return;
    }

    formData.append("files", file, file.name);
  });

  const submittedFiles = formData.getAll("files");

  if (!submittedFiles.length) {
    throw new Error("No valid files were provided for upload.");
  }

  const response = await adminUploadAPI.post(
    "/api/admin/datasets/upload-pdfs",
    formData,
    {
      /*
       * Do not manually set multipart/form-data here.
       * Axios adds the correct multipart boundary.
       */
      onUploadProgress:
        typeof onUploadProgress === "function" ? onUploadProgress : undefined,
    },
  );

  return response.data;
}

export default adminUploadAPI;
