import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const REFRESH_ENDPOINT = "/api/auth/refresh";

/* ==========================================
   AUTHENTICATED AXIOS
========================================== */

const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshApi = axios.create({
  baseURL: API_URL,
});

let refreshPromise = null;

function clearSession() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_refresh_token");
  localStorage.removeItem("admin_user");
}

/* ==========================================
   REQUEST
========================================== */

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ==========================================
   RESPONSE
========================================== */

adminApi.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    const refreshToken = localStorage.getItem("admin_refresh_token");

    if (!refreshToken) {
      clearSession();

      window.location.href = "/admin/login";

      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = refreshApi
          .post(REFRESH_ENDPOINT, {
            refresh_token: refreshToken,
          })
          .then((response) => {
            const data = response.data;

            localStorage.setItem("admin_token", data.access_token);

            if (data.refresh_token) {
              localStorage.setItem("admin_refresh_token", data.refresh_token);
            }

            return data.access_token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const newToken = await refreshPromise;

      originalRequest.headers.Authorization = `Bearer ${newToken}`;

      return adminApi(originalRequest);
    } catch (refreshError) {
      clearSession();

      window.location.href = "/admin/login";

      return Promise.reject(refreshError);
    }
  },
);

/* ==========================================
   API
========================================== */

export async function getAdminProfile() {
  const response = await adminApi.get("/api/admin/profile");

  return response.data;
}

export async function updateAdminPassword(payload) {
  const response = await adminApi.put("/api/admin/profile/password", payload);

  return response.data;
}

export default adminApi;
