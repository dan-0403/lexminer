import { useMemo, useState } from "react";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import UserHomeHeader from "../../components/user/UserHomeHeader";

import {
  changeUserPassword,
  getAccountSettingsErrorMessage,
} from "../../services/accountSettingsService";

import { getStoredUser } from "../../services/userAuthService";

import "../../styles/user-home.css";
import "../../styles/user-account-settings.css";
import UserAvatar from "../../components/user/UserAvatar";

const INITIAL_FORM = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function formatValue(value) {
  const normalizedValue = String(value || "")
    .trim()
    .replace(/_/g, " ");

  if (!normalizedValue) {
    return "Not available";
  }

  return normalizedValue.replace(/\b\w/g, (character) =>
    character.toUpperCase(),
  );
}

export default function UserAccountSettingsPage() {
  const navigate = useNavigate();

  const user = getStoredUser();

  const [formData, setFormData] = useState(INITIAL_FORM);

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const passwordRequirements = useMemo(
    () => ({
      minimumLength: formData.newPassword.length >= 8,

      uppercase: /[A-Z]/.test(formData.newPassword),

      lowercase: /[a-z]/.test(formData.newPassword),

      number: /\d/.test(formData.newPassword),

      specialCharacter: /[^A-Za-z0-9]/.test(formData.newPassword),

      passwordsMatch:
        Boolean(formData.confirmPassword) &&
        formData.newPassword === formData.confirmPassword,
    }),
    [formData.newPassword, formData.confirmPassword],
  );

  function handleInputChange(event) {
    const { name, value } = event.target;

    setError("");
    setSuccessMessage("");

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    setError("");
    setSuccessMessage("");

    if (!formData.currentPassword) {
      setError("Enter your current password.");

      return;
    }

    if (!Object.values(passwordRequirements).every(Boolean)) {
      setError("The new password does not satisfy all requirements.");

      return;
    }

    setSubmitting(true);

    try {
      const result = await changeUserPassword({
        currentPassword: formData.currentPassword,

        newPassword: formData.newPassword,

        confirmPassword: formData.confirmPassword,
      });

      setFormData(INITIAL_FORM);

      setSuccessMessage(
        result?.message || "Your password was changed successfully.",
      );
    } catch (requestError) {
      setError(getAccountSettingsErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="account-settings-page">
      <UserHomeHeader />

      <main className="account-settings-main">
        <div className="account-settings-navigation">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            Back
          </button>

          <span>
            <ShieldCheck size={17} />
            Secure account settings
          </span>
        </div>

        <section className="account-settings-hero">
          <div>
            <span>
              <LockKeyhole size={16} />
              Account Security
            </span>

            <h1>Account Settings</h1>

            <p>
              Manage your password, account information, and authentication
              details.
            </p>
          </div>
        </section>

        {error && (
          <div className="account-settings-message account-settings-error">
            <AlertCircle size={20} />

            <span>{error}</span>

            <button type="button" onClick={() => setError("")}>
              <X size={17} />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="account-settings-message account-settings-success">
            <CheckCircle2 size={20} />

            <span>{successMessage}</span>

            <button type="button" onClick={() => setSuccessMessage("")}>
              <X size={17} />
            </button>
          </div>
        )}

        <div className="account-settings-layout">
          <aside className="account-settings-summary">
            <div className="account-settings-summary-icon">
              <div className="account-settings-summary-avatar">
                <UserAvatar user={user} size={92} />
              </div>
            </div>

            <h2>
              {[user?.first_name, user?.last_name].filter(Boolean).join(" ") ||
                "LexMiner User"}
            </h2>

            <span>{user?.email}</span>

            <div className="account-settings-account-list">
              <div>
                <Mail size={17} />

                <span>Email</span>

                <strong>{user?.email || "Not available"}</strong>
              </div>

              <div>
                <ShieldCheck size={17} />

                <span>Role</span>

                <strong>{formatValue(user?.role)}</strong>
              </div>

              <div>
                <LockKeyhole size={17} />

                <span>Provider</span>

                <strong>{formatValue(user?.auth_provider)}</strong>
              </div>
            </div>
          </aside>

          <section className="account-settings-security-panel">
            <div className="account-settings-section-heading">
              <div>
                <span>Security</span>

                <h2>Change Password</h2>
              </div>

              <KeyRound size={23} />
            </div>

            {String(user?.auth_provider || "").toLowerCase() === "google" &&
            !user?.has_password ? (
              <div className="account-settings-google-notice">
                <ShieldCheck size={25} />

                <div>
                  <strong>Google-authenticated account</strong>

                  <p>
                    This account uses Google authentication and does not
                    currently have a local LexMiner password.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label>
                  <span>Current Password</span>

                  <div className="account-password-input">
                    <LockKeyhole size={18} />

                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleInputChange}
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword((current) => !current)
                      }
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <label>
                  <span>New Password</span>

                  <div className="account-password-input">
                    <KeyRound size={18} />

                    <input
                      type={showNewPassword ? "text" : "password"}
                      name="newPassword"
                      value={formData.newPassword}
                      onChange={handleInputChange}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowNewPassword((current) => !current)}
                    >
                      {showNewPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <label>
                  <span>Confirm New Password</span>

                  <div className="account-password-input">
                    <KeyRound size={18} />

                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      autoComplete="new-password"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={17} />
                      ) : (
                        <Eye size={17} />
                      )}
                    </button>
                  </div>
                </label>

                <div className="account-password-requirements">
                  <RequirementItem
                    valid={passwordRequirements.minimumLength}
                    text="At least 8 characters"
                  />

                  <RequirementItem
                    valid={passwordRequirements.uppercase}
                    text="One uppercase letter"
                  />

                  <RequirementItem
                    valid={passwordRequirements.lowercase}
                    text="One lowercase letter"
                  />

                  <RequirementItem
                    valid={passwordRequirements.number}
                    text="One number"
                  />

                  <RequirementItem
                    valid={passwordRequirements.specialCharacter}
                    text="One special character"
                  />

                  <RequirementItem
                    valid={passwordRequirements.passwordsMatch}
                    text="Passwords match"
                  />
                </div>

                <button
                  type="submit"
                  className="account-password-submit"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle
                        size={18}
                        className="account-settings-spin"
                      />
                      Updating Password
                    </>
                  ) : (
                    <>
                      <KeyRound size={18} />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function RequirementItem({ valid, text }) {
  return (
    <div className={valid ? "account-requirement-valid" : ""}>
      <span>
        <Check size={14} />
      </span>

      {text}
    </div>
  );
}
