import { authenticatedUserAPI } from "./userAuthService";

/* =========================================================
   LIST BOOKMARKS
========================================================= */

export async function getUserBookmarks({
  page = 1,
  pageSize = 20,
  search = "",
  year = "",
  sort = "newest",
} = {}) {
  const response = await authenticatedUserAPI.get("/api/user/bookmarks", {
    params: {
      page,
      page_size: pageSize,

      search: String(search || "").trim() || undefined,

      year:
        year === "" || year === null || year === undefined
          ? undefined
          : Number(year),

      sort,
    },
  });

  return response.data;
}

/* =========================================================
   GET AVAILABLE YEARS
========================================================= */

export async function getBookmarkYears() {
  const response = await authenticatedUserAPI.get("/api/user/bookmarks/years");

  return response.data;
}

/* =========================================================
   GET BOOKMARK STATUS
========================================================= */

export async function getBookmarkStatus(caseId) {
  const numericCaseId = Number(caseId);

  if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
    throw new Error("A valid case ID is required.");
  }

  const response = await authenticatedUserAPI.get(
    `/api/user/bookmarks/${numericCaseId}/status`,
  );

  return response.data;
}

/* =========================================================
   ADD BOOKMARK
========================================================= */

export async function addBookmark(caseId) {
  const numericCaseId = Number(caseId);

  if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
    throw new Error("A valid case ID is required.");
  }

  const response = await authenticatedUserAPI.post(
    `/api/user/bookmarks/${numericCaseId}`,
  );

  return response.data;
}

/* =========================================================
   REMOVE BOOKMARK
========================================================= */

export async function removeBookmark(caseId) {
  const numericCaseId = Number(caseId);

  if (!Number.isInteger(numericCaseId) || numericCaseId < 1) {
    throw new Error("A valid case ID is required.");
  }

  const response = await authenticatedUserAPI.delete(
    `/api/user/bookmarks/${numericCaseId}`,
  );

  return response.data;
}

/* =========================================================
   TOGGLE BOOKMARK
========================================================= */

export async function toggleBookmark({ caseId, bookmarked }) {
  if (bookmarked) {
    return removeBookmark(caseId);
  }

  return addBookmark(caseId);
}

/* =========================================================
   ERROR MESSAGE
========================================================= */

export function getBookmarkErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || "Invalid bookmark request.")
      .join(" ");
  }

  if (error?.response?.status === 401) {
    return "Please sign in to manage bookmarks.";
  }

  if (error?.response?.status === 404) {
    return "The selected case could not be found.";
  }

  if (error?.code === "ECONNABORTED") {
    return "The bookmark request timed out.";
  }

  if (!error?.response) {
    return "LexMiner could not connect to the backend server.";
  }

  return error?.message || "LexMiner could not complete the bookmark request.";
}
