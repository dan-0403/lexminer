import axios from "axios";

/* =====================================================
   API CONFIGURATION
===================================================== */

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

/*
 * Use the exact refresh path shown in Swagger.
 *
 * Change this only when your router prefix produces
 * a different endpoint.
 */
const REFRESH_ENDPOINT = "/api/auth/refresh";

const VECTOR_INDEX_REBUILD_ENDPOINT =
  "/api/admin/datasets/vector-index/rebuild";

/* =====================================================
   AUTHENTICATED VECTOR INDEX API
===================================================== */

const vectorIndexAPI = axios.create({
  baseURL: API_URL,

  /*
   * Rebuilding embeddings may take several minutes.
   */
  timeout: 30 * 60 * 1000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/*
 * Refresh requests use a separate Axios instance so they
 * do not enter the vectorIndexAPI response interceptor.
 */
const refreshAPI = axios.create({
  baseURL: API_URL,

  timeout: 30000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

/* =====================================================
   TOKEN HELPERS
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

function saveRefreshedTokens(data) {
  const accessToken = data?.access_token;

  if (!accessToken) {
    throw new Error("The refresh response did not include an access token.");
  }

  /*
   * Keep admin_token because the existing administrator
   * pages currently use this key.
   */
  localStorage.setItem("admin_token", accessToken);

  localStorage.setItem("admin_access_token", accessToken);

  /*
   * Store a rotated refresh token when the backend returns
   * one. Otherwise, keep the existing refresh token.
   */
  if (data?.refresh_token) {
    localStorage.setItem("admin_refresh_token", data.refresh_token);
  }

  return accessToken;
}

/* =====================================================
   CLEAR ADMIN SESSION
===================================================== */

export function clearVectorIndexAdminSession() {
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
   REQUEST INTERCEPTOR
===================================================== */

vectorIndexAPI.interceptors.request.use(
  (config) => {
    const accessToken = getAccessToken();

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

vectorIndexAPI.interceptors.response.use(
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
     * Only refresh when:
     *
     * 1. The API returns 401.
     * 2. The request has not already been retried.
     * 3. The request is not the refresh endpoint.
     */
    if (responseStatus !== 401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearVectorIndexAdminSession();

      redirectToAdminLogin();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * If several requests return 401 simultaneously,
       * they share one refresh request.
       */
      if (!refreshPromise) {
        refreshPromise = refreshAPI
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
       * Retry the failed rebuild or analytics request using
       * the new access token.
       */
      return vectorIndexAPI(originalRequest);
    } catch (refreshError) {
      clearVectorIndexAdminSession();

      redirectToAdminLogin();

      return Promise.reject(refreshError);
    }
  },
);

/* =====================================================
   VECTOR INDEX ERROR MESSAGE
===================================================== */

export function getVectorIndexErrorMessage(error) {
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

        return item?.msg || item?.message || "Invalid vector index request.";
      })
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return (
      detail.message || detail.error || "The vector index request was rejected."
    );
  }

  switch (error?.response?.status) {
    case 400:
      return "The vector index request is invalid.";

    case 401:
      return "Your administrator session expired and could not be refreshed.";

    case 403:
      return "You are not authorized to rebuild the vector index.";

    case 404:
      return "The vector index rebuild endpoint could not be found.";

    case 409:
      return "The vector index cannot be rebuilt because no PostgreSQL case chunks are available.";

    case 422:
      return "The vector index request contains invalid values.";

    case 500:
      return "The server encountered an error while rebuilding the vector index.";

    default:
      return error?.message || "An unexpected vector index error occurred.";
  }
}

/* =====================================================
   NORMALIZE REBUILD RESULT
===================================================== */

function normalizeRebuildResult(data) {
  return {
    message: String(data?.message || "Vector index rebuild completed."),

    cases_processed: Number(data?.cases_processed) || 0,

    chunks_processed: Number(data?.chunks_processed) || 0,

    vectors_created: Number(data?.vectors_created) || 0,

    failed_chunks: Number(data?.failed_chunks) || 0,
  };
}

/* =====================================================
   REBUILD VECTOR INDEX
===================================================== */

export async function rebuildVectorIndex() {
  const response = await vectorIndexAPI.post(VECTOR_INDEX_REBUILD_ENDPOINT, {});

  return normalizeRebuildResult(response?.data || {});
}

/* =====================================================
   EXPORT AUTHENTICATED API INSTANCE
===================================================== */

export { vectorIndexAPI };

export default vectorIndexAPI;
