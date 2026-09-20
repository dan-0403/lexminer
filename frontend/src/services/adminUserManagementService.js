import axios from "axios";

/* =====================================================
   API CONFIGURATION
===================================================== */

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const USER_MANAGEMENT_ENDPOINT = "/api/admin/user-management";

/*
 * Change this only if Swagger shows a different path.
 *
 * Examples:
 * "/refresh"
 * "/api/auth/refresh"
 * "/api/admin/auth/refresh"
 */
const REFRESH_ENDPOINT = "/api/auth/refresh";

/* =====================================================
   AUTHENTICATED API
===================================================== */

const adminUserManagementAPI = axios.create({
  baseURL: API_URL,

  timeout: 120000,

  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

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

  localStorage.setItem("admin_token", accessToken);

  localStorage.setItem("admin_access_token", accessToken);

  if (data?.refresh_token) {
    localStorage.setItem("admin_refresh_token", data.refresh_token);
  }

  return accessToken;
}

/* =====================================================
   CLEAR SESSION
===================================================== */

export function clearAdminUserManagementSession() {
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

adminUserManagementAPI.interceptors.request.use(
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

adminUserManagementAPI.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error?.config;

    const responseStatus = error?.response?.status;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || "");

    const isRefreshRequest = requestUrl.includes(REFRESH_ENDPOINT);

    if (responseStatus !== 401 || originalRequest._retry || isRefreshRequest) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      clearAdminUserManagementSession();

      redirectToAdminLogin();

      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
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

      return adminUserManagementAPI(originalRequest);
    } catch (refreshError) {
      clearAdminUserManagementSession();

      redirectToAdminLogin();

      return Promise.reject(refreshError);
    }
  },
);

/* =====================================================
   ERROR MESSAGE
===================================================== */

export function getAdminUserManagementErrorMessage(error) {
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
      return "The user management request is invalid.";

    case 401:
      return "Your administrator session expired and could not be refreshed.";

    case 403:
      return "You are not authorized to manage registered users or visitor logs.";

    case 404:
      return "The requested registered user or visitor record was not found.";

    case 409:
      return "The requested action conflicts with the user's current account state.";

    case 422:
      return "One or more user management request values are invalid.";

    case 500:
      return "The server encountered an error while processing the user management request.";

    default:
      return error?.message || "An unexpected user management error occurred.";
  }
}

/* =====================================================
   NORMALIZATION HELPERS
===================================================== */

function normalizePage(page) {
  return Math.max(Number(page) || 1, 1);
}

function normalizePageSize(pageSize) {
  return Math.min(Math.max(Number(pageSize) || 25, 1), 100);
}

function requireUserId(userId) {
  const normalizedId = Number(userId);

  if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
    throw new Error("A valid registered user ID is required.");
  }

  return normalizedId;
}

/* =====================================================
   BUILD USER PARAMS
===================================================== */

function buildUserParams({
  page = 1,
  pageSize = 25,
  search = "",
  isActive = "",
  isLocked = "",
  isVerified = "",
  authProvider = "",
} = {}) {
  const safePage = normalizePage(page);

  const safePageSize = normalizePageSize(pageSize);

  const params = {
    skip: (safePage - 1) * safePageSize,

    limit: safePageSize,
  };

  const cleanSearch = String(search || "").trim();

  if (cleanSearch) {
    params.search = cleanSearch;
  }

  if (isActive !== "" && isActive !== null && isActive !== undefined) {
    params.is_active = isActive === true || isActive === "true";
  }

  if (isLocked !== "" && isLocked !== null && isLocked !== undefined) {
    params.is_locked = isLocked === true || isLocked === "true";
  }

  if (isVerified !== "" && isVerified !== null && isVerified !== undefined) {
    params.is_verified = isVerified === true || isVerified === "true";
  }

  const normalizedProvider = String(authProvider || "").trim();

  if (normalizedProvider) {
    params.auth_provider = normalizedProvider;
  }

  return params;
}

/* =====================================================
   BUILD GUEST LOG PARAMS
===================================================== */

function buildGuestLogParams({
  page = 1,
  pageSize = 25,
  sessionId = "",
  browser = "",
  operatingSystem = "",
  visitedPage = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  const safePage = normalizePage(page);

  const safePageSize = normalizePageSize(pageSize);

  const params = {
    skip: (safePage - 1) * safePageSize,

    limit: safePageSize,
  };

  const cleanSessionId = String(sessionId || "").trim();

  if (cleanSessionId) {
    params.session_id = cleanSessionId;
  }

  const cleanBrowser = String(browser || "").trim();

  if (cleanBrowser) {
    params.browser = cleanBrowser;
  }

  const cleanOperatingSystem = String(operatingSystem || "").trim();

  if (cleanOperatingSystem) {
    params.operating_system = cleanOperatingSystem;
  }

  const cleanVisitedPage = String(visitedPage || "").trim();

  if (cleanVisitedPage) {
    params.visited_page = cleanVisitedPage;
  }

  if (dateFrom) {
    params.date_from = dateFrom;
  }

  if (dateTo) {
    params.date_to = dateTo;
  }

  return params;
}

/* =====================================================
   GET MANAGEMENT SUMMARY
===================================================== */

export async function getAdminUserManagementSummary() {
  const response = await adminUserManagementAPI.get(
    `${USER_MANAGEMENT_ENDPOINT}/summary`,
  );

  return (
    response?.data || {
      registered_users: {
        total: 0,
        active: 0,
        inactive: 0,
        locked: 0,
        verified: 0,
        local_accounts: 0,
        google_accounts: 0,
      },

      guest_visitors: {
        total_guest_visits: 0,
        unique_guest_visitors: 0,
        today_guest_visits: 0,
        today_unique_guest_visitors: 0,
        top_pages: [],
        top_browsers: [],
        top_operating_systems: [],
      },
    }
  );
}

/* =====================================================
   GET REGISTERED USERS
===================================================== */

export async function getRegisteredUsers({
  page = 1,
  pageSize = 25,
  search = "",
  isActive = "",
  isLocked = "",
  isVerified = "",
  authProvider = "",
} = {}) {
  const params = buildUserParams({
    page,
    pageSize,
    search,
    isActive,
    isLocked,
    isVerified,
    authProvider,
  });

  const response = await adminUserManagementAPI.get(
    `${USER_MANAGEMENT_ENDPOINT}/users`,
    {
      params,
    },
  );

  const data = response?.data || {};

  return {
    total: Number(data.total || 0),

    skip: Number(data.skip || 0),

    limit: Number(data.limit || params.limit),

    users: Array.isArray(data.users) ? data.users : [],
  };
}

/* =====================================================
   GET REGISTERED USER DETAIL
===================================================== */

export async function getRegisteredUserDetail(userId) {
  const parsedUserId = Number(userId);

  if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
    throw new Error("A valid user ID is required.");
  }

  const response = await adminUserManagementAPI.get(
    `${USER_MANAGEMENT_ENDPOINT}/users/${parsedUserId}`,
  );

  return response.data;
}

/* =====================================================
   ACTIVATE USER
===================================================== */

export async function activateRegisteredUser(userId) {
  const id = requireUserId(userId);

  const response = await adminUserManagementAPI.post(
    `${USER_MANAGEMENT_ENDPOINT}/users/${id}/activate`,
    {},
  );

  return response.data;
}

/* =====================================================
   DEACTIVATE USER
===================================================== */

export async function deactivateRegisteredUser(userId) {
  const id = requireUserId(userId);

  const response = await adminUserManagementAPI.post(
    `${USER_MANAGEMENT_ENDPOINT}/users/${id}/deactivate`,
    {},
  );

  return response.data;
}

/* =====================================================
   LOCK USER
===================================================== */

export async function lockRegisteredUser(userId) {
  const id = requireUserId(userId);

  const response = await adminUserManagementAPI.post(
    `${USER_MANAGEMENT_ENDPOINT}/users/${id}/lock`,
    {},
  );

  return response.data;
}

/* =====================================================
   UNLOCK USER
===================================================== */

export async function unlockRegisteredUser(userId) {
  const id = requireUserId(userId);

  const response = await adminUserManagementAPI.post(
    `${USER_MANAGEMENT_ENDPOINT}/users/${id}/unlock`,
    {},
  );

  return response.data;
}

/* =====================================================
   DELETE USER
===================================================== */

export async function deleteRegisteredUser(userId) {
  const id = requireUserId(userId);

  const response = await adminUserManagementAPI.delete(
    `${USER_MANAGEMENT_ENDPOINT}/users/${id}`,
  );

  return response.data;
}

/* =====================================================
   GET GUEST VISITOR LOGS
===================================================== */

export async function getGuestVisitorLogs({
  page = 1,
  pageSize = 25,
  sessionId = "",
  browser = "",
  operatingSystem = "",
  visitedPage = "",
  dateFrom = "",
  dateTo = "",
} = {}) {
  const params = buildGuestLogParams({
    page,
    pageSize,
    sessionId,
    browser,
    operatingSystem,
    visitedPage,
    dateFrom,
    dateTo,
  });

  const response = await adminUserManagementAPI.get(
    `${USER_MANAGEMENT_ENDPOINT}/guest-logs`,
    {
      params,
    },
  );

  const data = response?.data || {};

  return {
    total: Number(data.total || 0),

    skip: Number(data.skip || 0),

    limit: Number(data.limit || params.limit),

    logs: Array.isArray(data.logs) ? data.logs : [],
  };
}

/* =====================================================
   EXPORT API
===================================================== */

export { adminUserManagementAPI };

export default adminUserManagementAPI;
