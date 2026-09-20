import axios from "axios";

/* ==========================================
   API
========================================== */

const API_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

const visitorAPI = axios.create({
  baseURL: API_URL,

  timeout: 30000,

  headers: {
    Accept: "application/json",

    "Content-Type": "application/json",
  },
});

/* ==========================================
   Attach JWT if user is logged in
========================================== */

visitorAPI.interceptors.request.use((config) => {
  const token =
    localStorage.getItem("access_token") || localStorage.getItem("user_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

/* ==========================================
   Session ID
========================================== */

const SESSION_KEY = "visitor_session_id";

export function getVisitorSessionId() {
  let sessionId = sessionStorage.getItem(SESSION_KEY);

  if (sessionId) {
    return sessionId;
  }

  sessionId = crypto.randomUUID() + "-" + Date.now();

  sessionStorage.setItem(SESSION_KEY, sessionId);

  return sessionId;
}

/* ==========================================
   Record Visit
========================================== */

export async function recordVisitorVisit(visitedPage) {
  try {
    const response = await visitorAPI.post(
      "/api/visitor-logs",

      {
        session_id: getVisitorSessionId(),

        visited_page: visitedPage,
      },
    );

    return response.data;
  } catch (error) {
    console.error(
      "Unable to record visitor activity.",

      error,
    );

    return null;
  }
}

export default visitorAPI;
