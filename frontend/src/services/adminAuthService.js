import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

function saveAdminSession(data) {
  const accessToken = data?.access_token;
  const refreshToken = data?.refresh_token;

  if (!accessToken) {
    throw new Error("The login response did not include an access token.");
  }

  localStorage.setItem("admin_token", accessToken);

  localStorage.setItem("admin_access_token", accessToken);

  if (refreshToken) {
    localStorage.setItem("admin_refresh_token", refreshToken);
  }

  const admin = data?.admin || data?.user || null;

  if (admin) {
    localStorage.setItem("admin_user", JSON.stringify(admin));
  } else {
    localStorage.removeItem("admin_user");
  }
}

export function clearAdminSession() {
  localStorage.removeItem("admin_token");

  localStorage.removeItem("admin_access_token");

  localStorage.removeItem("admin_refresh_token");

  localStorage.removeItem("admin_user");
}

export async function loginAdmin(data) {
  const response = await API.post("/api/auth/login", data);

  saveAdminSession(response?.data || {});

  return response.data;
}

export default API;
