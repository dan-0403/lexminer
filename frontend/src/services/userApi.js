import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const REFRESH_ENDPOINT = "/api/auth/refresh";

const userAPI = axios.create({
  baseURL: API_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

const refreshAPI = axios.create({
  baseURL: API_URL,

  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise = null;

/* =====================================================
   USER SESSION STORAGE KEYS
===================================================== */

const USER_TOKEN_KEY = "user_token";

const USER_REFRESH_TOKEN_KEY = "user_refresh_token";

const USER_DATA_KEY = "user";

/* =====================================================
   TOKEN NORMALIZATION
===================================================== */

function normalizeToken(value) {
  let token = String(value || "").trim();

  if (!token) {
    return "";
  }

  if (token.startsWith('"') && token.endsWith('"')) {
    try {
      const parsed = JSON.parse(token);

      if (typeof parsed === "string") {
        token = parsed.trim();
      }
    } catch {
      token = token.slice(1, -1).trim();
    }
  }

  return token.replace(/^Bearer\s+/i, "").trim();
}

/* =====================================================
   USER SESSION HELPERS
===================================================== */

export function getUserAccessToken() {
  return normalizeToken(localStorage.getItem(USER_TOKEN_KEY));
}

export function getUserRefreshToken() {
  return normalizeToken(localStorage.getItem(USER_REFRESH_TOKEN_KEY));
}

export function clearUserSession() {
  localStorage.removeItem(USER_TOKEN_KEY);

  localStorage.removeItem(USER_REFRESH_TOKEN_KEY);

  localStorage.removeItem(USER_DATA_KEY);
}

/* =====================================================
   REQUEST INTERCEPTOR
===================================================== */

userAPI.interceptors.request.use(
  (config) => {
    const token = getUserAccessToken();

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

userAPI.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error?.config;

    const status = error?.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || "");

    const isRefreshRequest = requestUrl.includes(REFRESH_ENDPOINT);

    if (status !== 401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getUserRefreshToken();

    console.log("Access request returned 401:", requestUrl);

    console.log("Refresh token exists:", Boolean(refreshToken));

    if (!refreshToken) {
      /*
       * Do not immediately redirect while debugging.
       * Let the page display the real authentication error.
       */
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
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

            localStorage.setItem(USER_TOKEN_KEY, newAccessToken);

            if (data.refresh_token) {
              localStorage.setItem(USER_REFRESH_TOKEN_KEY, data.refresh_token);
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

      return userAPI(originalRequest);
    } catch (refreshError) {
      console.error(
        "User token refresh failed:",
        refreshError?.response?.data || refreshError,
      );

      /*
       * Do not redirect yet while debugging.
       */
      return Promise.reject(refreshError);
    }
  },
);
