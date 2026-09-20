import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/*
 * Change this to the exact path shown in Swagger.
 *
 * Examples:
 * "/refresh"
 * "/api/auth/refresh"
 * "/api/admin/auth/refresh"
 */
const REFRESH_ENDPOINT = "api/auth/refresh";

const adminAPI = axios.create({
  baseURL: API_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

/*
 * Use plain axios for refresh requests.
 * Do not use adminAPI here, or the refresh request
 * could trigger the same response interceptor.
 */
const refreshAPI = axios.create({
  baseURL: API_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

/* =====================================================
   CLEAR ADMIN SESSION
===================================================== */

export function clearAdminSession() {
  localStorage.removeItem("admin_token");

  localStorage.removeItem("admin_refresh_token");

  localStorage.removeItem("admin_user");
}

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

adminAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("admin_token");

    if (token) {
      config.headers = config.headers || {};

      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },

  (error) => Promise.reject(error),
);

/* =====================================================
   RESPONSE INTERCEPTOR
===================================================== */

adminAPI.interceptors.response.use(
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
     * Only refresh for an expired/invalid access token.
     * Prevent retry loops using _retry.
     */
    if (status !== 401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("admin_refresh_token");

    if (!refreshToken) {
      clearAdminSession();

      window.location.replace("/admin/login");

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      /*
       * Reuse one refresh request when several API calls
       * receive 401 at the same time.
       */
      if (!refreshPromise) {
        refreshPromise = refreshAPI
          .post(REFRESH_ENDPOINT, {
            refresh_token: refreshToken,
          })
          .then((response) => {
            const data = response?.data || {};

            const newAccessToken = data.access_token;

            if (!newAccessToken) {
              throw new Error(
                "Refresh response did not include an access token.",
              );
            }

            localStorage.setItem("admin_token", newAccessToken);

            /*
             * Save a new refresh token only when your
             * backend rotates and returns one.
             */
            if (data.refresh_token) {
              localStorage.setItem("admin_refresh_token", data.refresh_token);
            }

            return newAccessToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newAccessToken = await refreshPromise;

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      /*
       * Retry the original analytics, dataset,
       * profile, or vector-index request.
       */
      return adminAPI(originalRequest);
    } catch (refreshError) {
      clearAdminSession();

      window.location.replace("/admin/login");

      return Promise.reject(refreshError);
    }
  },
);

/* =====================================================
   ADMIN ANALYTICS
===================================================== */

export async function getAdminAnalytics() {
  const response = await adminAPI.get("/api/admin/analytics");

  return response.data;
}

/* =====================================================
   VECTOR INDEX
===================================================== */

export async function rebuildVectorIndex() {
  const response = await adminAPI.post("/api/admin/vector-index/rebuild");

  return response.data;
}

export default adminAPI;
