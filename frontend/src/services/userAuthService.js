import axios from "axios";

/* =========================================================
   API CONFIGURATION
========================================================= */

const API_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000",
).replace(/\/+$/, "");

const REQUEST_TIMEOUT = 500000;

/* =========================================================
   USER STORAGE KEYS
========================================================= */

const USER_ACCESS_TOKEN_KEY = "user_access_token";

const USER_REFRESH_TOKEN_KEY = "user_refresh_token";

const USER_DATA_KEY = "user_data";

const USER_REMEMBER_KEY = "user_remember_session";

/* =========================================================
   ADMIN STORAGE KEYS
========================================================= */

const ADMIN_ACCESS_TOKEN_KEY = "admin_token";

const ADMIN_REFRESH_TOKEN_KEY = "admin_refresh_token";

const ADMIN_DATA_KEY = "admin_user";

/* =========================================================
   STORAGE HELPERS
========================================================= */

function removeFromBothStorages(key) {
  localStorage.removeItem(key);

  sessionStorage.removeItem(key);
}

function getRememberSession() {
  return localStorage.getItem(USER_REMEMBER_KEY) === "true";
}

function clearUserStorage({ dispatchEvent = true } = {}) {
  removeFromBothStorages(USER_ACCESS_TOKEN_KEY);

  removeFromBothStorages(USER_REFRESH_TOKEN_KEY);

  removeFromBothStorages(USER_DATA_KEY);

  /*
   * Remove old user-data keys that may exist
   * from previous frontend implementations.
   */
  removeFromBothStorages("user");

  removeFromBothStorages("current_user");

  removeFromBothStorages(USER_REMEMBER_KEY);

  if (dispatchEvent) {
    window.dispatchEvent(new Event("lexminer-auth-changed"));
  }
}

function clearAdminStorage() {
  localStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);

  localStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);

  localStorage.removeItem(ADMIN_DATA_KEY);

  sessionStorage.removeItem(ADMIN_ACCESS_TOKEN_KEY);

  sessionStorage.removeItem(ADMIN_REFRESH_TOKEN_KEY);

  sessionStorage.removeItem(ADMIN_DATA_KEY);
}

/* =========================================================
   GET TOKENS
========================================================= */

export function getUserAccessToken() {
  return (
    localStorage.getItem(USER_ACCESS_TOKEN_KEY) ||
    sessionStorage.getItem(USER_ACCESS_TOKEN_KEY)
  );
}

export function getUserRefreshToken() {
  return (
    localStorage.getItem(USER_REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(USER_REFRESH_TOKEN_KEY)
  );
}

/* =========================================================
   GET STORED USER
========================================================= */

export function getStoredUser() {
  const rawUser =
    localStorage.getItem(USER_DATA_KEY) ||
    sessionStorage.getItem(USER_DATA_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(rawUser);

    if (!parsedUser || typeof parsedUser !== "object") {
      removeFromBothStorages(USER_DATA_KEY);

      return null;
    }

    return parsedUser;
  } catch {
    removeFromBothStorages(USER_DATA_KEY);

    return null;
  }
}

/* =========================================================
   AUTHENTICATION STATE
========================================================= */

export function isUserAuthenticated() {
  return Boolean(getUserAccessToken());
}

/* =========================================================
   CLEAR USER SESSION
========================================================= */

export function clearUserSession() {
  clearUserStorage({
    dispatchEvent: true,
  });
}

/* =========================================================
   SAVE COMPLETE USER SESSION
========================================================= */

export function saveUserSession({
  accessToken,
  refreshToken,
  user,
  rememberMe = false,
}) {
  const normalizedAccessToken = String(accessToken || "").trim();

  const normalizedRefreshToken = String(refreshToken || "").trim();

  if (!normalizedAccessToken) {
    throw new Error(
      "The authentication response did not include an access token.",
    );
  }

  if (!normalizedRefreshToken) {
    throw new Error(
      "The authentication response did not include a refresh token.",
    );
  }

  /*
   * Do not dispatch an authentication-change event
   * until the new session has been saved.
   */
  clearUserStorage({
    dispatchEvent: false,
  });

  const storage = rememberMe ? localStorage : sessionStorage;

  localStorage.setItem(USER_REMEMBER_KEY, String(Boolean(rememberMe)));

  storage.setItem(USER_ACCESS_TOKEN_KEY, normalizedAccessToken);

  storage.setItem(USER_REFRESH_TOKEN_KEY, normalizedRefreshToken);

  if (user && typeof user === "object") {
    storage.setItem(USER_DATA_KEY, JSON.stringify(user));
  }

  window.dispatchEvent(new Event("lexminer-auth-changed"));

  if (user && typeof user === "object") {
    window.dispatchEvent(
      new CustomEvent("lexminer-user-updated", {
        detail: user,
      }),
    );
  }
}

/* =========================================================
   SAVE UPDATED USER DATA
========================================================= */

export function saveStoredUser(user) {
  if (!user || typeof user !== "object") {
    return;
  }

  const serializedUser = JSON.stringify(user);

  const localAccessToken = localStorage.getItem(USER_ACCESS_TOKEN_KEY);

  const sessionAccessToken = sessionStorage.getItem(USER_ACCESS_TOKEN_KEY);

  if (localAccessToken) {
    localStorage.setItem(USER_DATA_KEY, serializedUser);

    sessionStorage.removeItem(USER_DATA_KEY);
  } else if (sessionAccessToken) {
    sessionStorage.setItem(USER_DATA_KEY, serializedUser);

    localStorage.removeItem(USER_DATA_KEY);
  } else {
    /*
     * Do not create user data without an
     * authenticated session.
     */
    return;
  }

  window.dispatchEvent(
    new CustomEvent("lexminer-user-updated", {
      detail: user,
    }),
  );
}

/* =========================================================
   AXIOS CLIENTS
========================================================= */

const userAuthAPI = axios.create({
  baseURL: API_URL,

  timeout: REQUEST_TIMEOUT,

  headers: {
    Accept: "application/json",

    "Content-Type": "application/json",
  },
});

export const authenticatedUserAPI = axios.create({
  baseURL: API_URL,

  timeout: REQUEST_TIMEOUT,

  headers: {
    Accept: "application/json",

    "Content-Type": "application/json",
  },
});

const refreshAPI = axios.create({
  baseURL: API_URL,

  timeout: REQUEST_TIMEOUT,

  headers: {
    Accept: "application/json",

    "Content-Type": "application/json",
  },
});

/* =========================================================
   AUTHENTICATED REQUEST INTERCEPTOR
========================================================= */

authenticatedUserAPI.interceptors.request.use(
  (config) => {
    const accessToken = getUserAccessToken();

    config.headers = config.headers || {};

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    /*
     * When sending FormData, remove the default JSON
     * content type. The browser must generate the
     * multipart boundary automatically.
     */
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];

      delete config.headers["content-type"];
    }

    return config;
  },

  (error) => Promise.reject(error),
);

/* =========================================================
   REFRESH-TOKEN QUEUE
========================================================= */

let refreshInProgress = false;

let refreshSubscribers = [];

function resolveRefreshSubscribers(token) {
  refreshSubscribers.forEach(({ resolve }) => resolve(token));

  refreshSubscribers = [];
}

function rejectRefreshSubscribers(error) {
  refreshSubscribers.forEach(({ reject }) => reject(error));

  refreshSubscribers = [];
}

function subscribeToRefresh() {
  return new Promise((resolve, reject) => {
    refreshSubscribers.push({
      resolve,
      reject,
    });
  });
}

/* =========================================================
   REFRESH USER SESSION
========================================================= */

async function refreshUserSession() {
  const currentRefreshToken = getUserRefreshToken();

  if (!currentRefreshToken) {
    throw new Error("No refresh token is available.");
  }

  const response = await refreshAPI.post("/api/auth/refresh", {
    refresh_token: currentRefreshToken,
  });

  const newAccessToken = response?.data?.access_token;

  const newRefreshToken = response?.data?.refresh_token || currentRefreshToken;

  if (!newAccessToken) {
    throw new Error("Refresh response did not include an access token.");
  }

  const previousUser = getStoredUser();

  const rememberMe = getRememberSession();

  saveUserSession({
    accessToken: newAccessToken,

    refreshToken: newRefreshToken,

    user: previousUser,

    rememberMe,
  });

  return newAccessToken;
}

/* =========================================================
   AUTHENTICATED RESPONSE INTERCEPTOR
========================================================= */

authenticatedUserAPI.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error?.config;

    const status = error?.response?.status;

    if (status !== 401 || !originalRequest || originalRequest._userRetry) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || "");

    /*
     * Never retry a refresh request through the
     * same refresh process.
     */
    if (requestUrl.includes("/api/auth/refresh")) {
      clearUserSession();

      return Promise.reject(error);
    }

    originalRequest._userRetry = true;

    if (refreshInProgress) {
      try {
        const newAccessToken = await subscribeToRefresh();

        originalRequest.headers = originalRequest.headers || {};

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

        return authenticatedUserAPI(originalRequest);
      } catch (refreshError) {
        return Promise.reject(refreshError);
      }
    }

    refreshInProgress = true;

    try {
      const newAccessToken = await refreshUserSession();

      resolveRefreshSubscribers(newAccessToken);

      originalRequest.headers = originalRequest.headers || {};

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

      return authenticatedUserAPI(originalRequest);
    } catch (refreshError) {
      rejectRefreshSubscribers(refreshError);

      clearUserSession();

      window.dispatchEvent(new CustomEvent("lexminer:user-session-expired"));

      return Promise.reject(refreshError);
    } finally {
      refreshInProgress = false;
    }
  },
);

/* =========================================================
   ERROR MESSAGE HELPER
========================================================= */

export function getAuthErrorMessage(error) {
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

        return item?.msg || item?.message || "Invalid request.";
      })
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    return detail.message || detail.msg || "Invalid request.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response) {
    return "Unable to connect to the LexMiner server.";
  }

  return error?.message || "An unexpected authentication error occurred.";
}

/* =========================================================
   STEP 1 — REQUEST REGISTRATION OTP
========================================================= */

export async function requestRegistrationOTP(email) {
  const response = await userAuthAPI.post("/api/auth/register/request-otp", {
    email: String(email || "")
      .trim()
      .toLowerCase(),
  });

  return response.data;
}

/* =========================================================
   STEP 2 — VERIFY REGISTRATION OTP
========================================================= */

export async function verifyRegistrationOTP({ registrationId, otp }) {
  const response = await userAuthAPI.post("/api/auth/register/verify-otp", {
    registration_id: registrationId,

    otp: String(otp || "")
      .replace(/\D/g, "")
      .slice(0, 6),
  });

  return response.data;
}

/* =========================================================
   RESEND REGISTRATION OTP
========================================================= */

export async function resendRegistrationOTP(registrationId) {
  const response = await userAuthAPI.post("/api/auth/register/resend-otp", {
    registration_id: registrationId,
  });

  return response.data;
}

/* =========================================================
   COMPLETE REGISTRATION
========================================================= */

export async function completeRegistration({
  registrationId,
  firstName,
  lastName,
  password,
  confirmPassword,
}) {
  const response = await userAuthAPI.post("/api/auth/register/complete", {
    registration_id: registrationId,

    first_name: String(firstName || "").trim(),

    last_name: String(lastName || "").trim(),

    password,

    confirm_password: confirmPassword,
  });

  return response.data;
}

/* =========================================================
   SAVE ADMIN SESSION
========================================================= */

function saveAdminSession(result) {
  const accessToken = result?.access_token;

  const refreshToken = result?.refresh_token;

  const user = result?.user;

  if (!accessToken) {
    throw new Error(
      "Administrator login response did not include an access token.",
    );
  }

  if (!refreshToken) {
    throw new Error(
      "Administrator login response did not include a refresh token.",
    );
  }

  clearUserStorage({
    dispatchEvent: true,
  });

  clearAdminStorage();

  localStorage.setItem(ADMIN_ACCESS_TOKEN_KEY, accessToken);

  localStorage.setItem(ADMIN_REFRESH_TOKEN_KEY, refreshToken);

  if (user) {
    localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(user));
  }
}

/* =========================================================
   PROCESS LOGIN RESPONSE
========================================================= */

function processLoginResponse({ result, rememberMe }) {
  const role = String(result?.user?.role || "").toLowerCase();

  if (role === "admin") {
    saveAdminSession(result);

    return result;
  }

  clearAdminStorage();

  saveUserSession({
    accessToken: result?.access_token,

    refreshToken: result?.refresh_token,

    user: result?.user,

    rememberMe,
  });

  return result;
}

/* =========================================================
   LOCAL LOGIN
========================================================= */

export async function loginUser({ email, password, rememberMe = false }) {
  const response = await userAuthAPI.post("/api/auth/login", {
    email: String(email || "")
      .trim()
      .toLowerCase(),

    password,

    remember_me: Boolean(rememberMe),
  });

  return processLoginResponse({
    result: response.data,

    rememberMe,
  });
}

/* =========================================================
   GOOGLE LOGIN
========================================================= */

export async function loginUserWithGoogle({ credential, rememberMe = false }) {
  const response = await userAuthAPI.post("/api/auth/google", {
    credential,

    remember_me: Boolean(rememberMe),
  });

  return processLoginResponse({
    result: response.data,

    rememberMe,
  });
}

/* =========================================================
   CURRENT USER
========================================================= */

export async function getCurrentUser() {
  const response = await authenticatedUserAPI.get("/api/auth/me");

  /*
   * Supports either:
   *
   * { "user": {...} }
   *
   * or a direct user object:
   *
   * { "id": 1, "email": "..." }
   */
  const user = response?.data?.user || response?.data || null;

  if (user && typeof user === "object") {
    saveStoredUser(user);
  }

  return user;
}

/* =========================================================
   LOGOUT
========================================================= */

export async function logoutUser() {
  try {
    await authenticatedUserAPI.post("/api/auth/logout");
  } finally {
    clearUserSession();
  }
}

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default userAuthAPI;
