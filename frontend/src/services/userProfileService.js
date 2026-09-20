import { authenticatedUserAPI, saveStoredUser } from "./userAuthService";

/* =========================================================
   API URL
========================================================= */

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://127.0.0.1:8000",
).replace(/\/+$/, "");

/* =========================================================
   GET PROFILE
========================================================= */

export async function getUserProfile() {
  const response = await authenticatedUserAPI.get("/api/user/profile");

  const profile = response.data;

  if (profile && typeof profile === "object") {
    saveStoredUser(profile);
  }

  return profile;
}

/* =========================================================
   UPDATE PROFILE
========================================================= */

export async function updateUserProfile({ firstName, lastName }) {
  const normalizedFirstName = String(firstName || "").trim();

  const normalizedLastName = String(lastName || "").trim();

  if (!normalizedFirstName) {
    throw new Error("First name is required.");
  }

  if (!normalizedLastName) {
    throw new Error("Last name is required.");
  }

  const response = await authenticatedUserAPI.put("/api/user/profile", {
    first_name: normalizedFirstName,

    last_name: normalizedLastName,
  });

  const updatedProfile = response.data;

  if (updatedProfile && typeof updatedProfile === "object") {
    saveStoredUser(updatedProfile);
  }

  return updatedProfile;
}

/* =========================================================
   UPLOAD PROFILE PICTURE
========================================================= */

export async function uploadProfilePicture(file) {
  if (!(file instanceof File)) {
    throw new Error("Select a valid image file.");
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error("Only JPG, PNG, and WEBP images are allowed.");
  }

  const maximumSize = 5 * 1024 * 1024;

  if (file.size > maximumSize) {
    throw new Error("Profile picture must not exceed 5 MB.");
  }

  const formData = new FormData();

  /*
   * This name must match:
   *
   * file: UploadFile = File(...)
   *
   * in the FastAPI route.
   */
  formData.append("file", file, file.name);

  const response = await authenticatedUserAPI.post(
    "/api/user/profile/picture",
    formData,

    /*
     * Do not add Content-Type here.
     * Axios and the browser will add:
     *
     * multipart/form-data;
     * boundary=...
     */
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  return response.data;
}

/* =========================================================
   DELETE PROFILE PICTURE
========================================================= */

export async function removeProfilePicture() {
  const response = await authenticatedUserAPI.delete(
    "/api/user/profile/picture",
  );

  return response.data;
}

/* =========================================================
   BUILD PROFILE PICTURE URL
========================================================= */

export function buildProfilePictureUrl(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return "";
  }

  if (
    normalizedValue.startsWith("http://") ||
    normalizedValue.startsWith("https://") ||
    normalizedValue.startsWith("data:") ||
    normalizedValue.startsWith("blob:")
  ) {
    return normalizedValue;
  }

  return `${API_BASE_URL}/` + normalizedValue.replace(/^\/+/, "");
}

/* =========================================================
   PROFILE ERROR MESSAGE
========================================================= */

export function getUserProfileErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const location = Array.isArray(item?.loc) ? item.loc.join(".") : "";

        const message =
          item?.msg || item?.message || "Invalid profile request.";

        return location ? `${location}: ${message}` : message;
      })
      .join(" ");
  }

  return error?.message || "LexMiner could not complete the profile request.";
}
