import { authenticatedUserAPI } from "./userAuthService";

export async function changeUserPassword({
  currentPassword,
  newPassword,
  confirmPassword,
}) {
  const response = await authenticatedUserAPI.put(
    "/api/user/account-settings/password",
    {
      current_password: currentPassword,

      new_password: newPassword,

      confirm_password: confirmPassword,
    },
  );

  return response.data;
}

export function getAccountSettingsErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map(
        (item) =>
          item?.msg || item?.message || "Invalid account-settings request.",
      )
      .join(" ");
  }

  if (error?.code === "ECONNABORTED") {
    return "The request timed out. Please try again.";
  }

  if (!error?.response) {
    return "LexMiner could not connect to the backend server.";
  }

  return error?.message || "LexMiner could not update your account settings.";
}
