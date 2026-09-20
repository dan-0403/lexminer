import { useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import UserHomeHeader from "../../components/user/UserHomeHeader";

import UserAvatar from "../../components/user/UserAvatar";

import {
  getUserProfile,
  getUserProfileErrorMessage,
  removeProfilePicture,
  updateUserProfile,
  uploadProfilePicture,
} from "../../services/userProfileService";

import { getStoredUser, saveStoredUser } from "../../services/userAuthService";

import "../../styles/user-home.css";
import "../../styles/user-profile.css";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsedDate);
}

function formatSimpleDate(value) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

function formatEnumValue(value) {
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

function validateSelectedFile(file) {
  if (!(file instanceof File)) {
    return "Select a valid image file.";
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPG, PNG, and WEBP images are allowed.";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "Profile picture must not exceed 5 MB.";
  }

  return "";
}

export default function UserProfilePage() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [profile, setProfile] = useState(() => getStoredUser());

  const [formData, setFormData] = useState({
    firstName: getStoredUser()?.first_name || "",

    lastName: getStoredUser()?.last_name || "",
  });

  const [selectedFile, setSelectedFile] = useState(null);

  const [previewUrl, setPreviewUrl] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [uploading, setUploading] = useState(false);

  const [removing, setRemoving] = useState(false);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [dragActive, setDragActive] = useState(false);

  const displayName = useMemo(() => {
    const fullName = [profile?.first_name, profile?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return fullName || profile?.email?.split("@")[0] || "LexMiner User";
  }, [profile]);

  const formChanged = useMemo(() => {
    if (!profile) {
      return false;
    }

    return (
      formData.firstName.trim() !== String(profile.first_name || "").trim() ||
      formData.lastName.trim() !== String(profile.last_name || "").trim()
    );
  }, [formData, profile]);

  useEffect(() => {
    let cancelled = false;

    getUserProfile()
      .then((profileResponse) => {
        if (cancelled) {
          return;
        }

        setProfile(profileResponse);

        setFormData({
          firstName: profileResponse?.first_name || "",

          lastName: profileResponse?.last_name || "",
        });

        setError("");
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(getUserProfileErrorMessage(requestError));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [successMessage]);

  function clearMessages() {
    setError("");
    setSuccessMessage("");
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    clearMessages();

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applySelectedFile(file) {
    clearMessages();

    const validationError = validateSelectedFile(file);

    if (validationError) {
      setError(validationError);

      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);

    setSelectedFile(file);

    setPreviewUrl(objectUrl);
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    if (file) {
      applySelectedFile(file);
    }

    event.target.value = "";
  }

  function handleDragOver(event) {
    event.preventDefault();

    setDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();

    setDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();

    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file) {
      applySelectedFile(file);
    }
  }

  function cancelSelectedFile() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);

    setPreviewUrl("");
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (saving) {
      return;
    }

    clearMessages();

    const normalizedFirstName = formData.firstName.trim();

    const normalizedLastName = formData.lastName.trim();

    if (!normalizedFirstName) {
      setError("First name is required.");

      return;
    }

    if (!normalizedLastName) {
      setError("Last name is required.");

      return;
    }

    setSaving(true);

    try {
      const updatedProfile = await updateUserProfile({
        firstName: normalizedFirstName,

        lastName: normalizedLastName,
      });

      setProfile(updatedProfile);

      setFormData({
        firstName: updatedProfile.first_name,

        lastName: updatedProfile.last_name,
      });

      saveStoredUser(updatedProfile);

      setSuccessMessage("Your profile information was updated successfully.");
    } catch (requestError) {
      setError(getUserProfileErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function handleUploadPicture() {
    if (!selectedFile || uploading) {
      return;
    }

    clearMessages();

    setUploading(true);

    try {
      const result = await uploadProfilePicture(selectedFile);

      const updatedProfile = {
        ...profile,

        profile_picture: result.profile_picture,
      };

      setProfile(updatedProfile);

      saveStoredUser(updatedProfile);

      cancelSelectedFile();

      setSuccessMessage(
        result?.message || "Profile picture updated successfully.",
      );
    } catch (requestError) {
      setError(getUserProfileErrorMessage(requestError));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePicture() {
    if (removing || !profile?.profile_picture) {
      return;
    }

    const confirmed = window.confirm("Remove your current profile picture?");

    if (!confirmed) {
      return;
    }

    clearMessages();

    setRemoving(true);

    try {
      const result = await removeProfilePicture();

      const updatedProfile = {
        ...profile,

        profile_picture: null,
      };

      setProfile(updatedProfile);

      saveStoredUser(updatedProfile);

      cancelSelectedFile();

      setSuccessMessage(
        result?.message || "Profile picture removed successfully.",
      );
    } catch (requestError) {
      setError(getUserProfileErrorMessage(requestError));
    } finally {
      setRemoving(false);
    }
  }

  async function handleReloadProfile() {
    if (loading) {
      return;
    }

    clearMessages();

    setLoading(true);

    try {
      const refreshedProfile = await getUserProfile();

      setProfile(refreshedProfile);

      setFormData({
        firstName: refreshedProfile?.first_name || "",

        lastName: refreshedProfile?.last_name || "",
      });

      saveStoredUser(refreshedProfile);
    } catch (requestError) {
      setError(getUserProfileErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="user-profile-page">
        <UserHomeHeader />

        <main className="user-profile-main">
          <div className="profile-page-loading">
            <LoaderCircle size={36} className="profile-page-spin" />

            <strong>Loading your profile</strong>

            <span>Retrieving your LexMiner account information…</span>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <UserHomeHeader />

      <main className="user-profile-main">
        <div className="profile-page-navigation">
          <button type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            Back
          </button>

          <span>
            <ShieldCheck size={17} />
            Secure user profile
          </span>
        </div>

        <section className="profile-page-hero">
          <div>
            <span className="profile-page-eyebrow">
              <UserRound size={16} />
              Account Management
            </span>

            <h1>My Profile</h1>

            <p>
              Manage your personal information, profile picture, and LexMiner
              account details.
            </p>
          </div>

          <button
            type="button"
            className="profile-refresh-button"
            onClick={handleReloadProfile}
            disabled={loading}
          >
            <RefreshCw size={17} />
            Refresh Profile
          </button>
        </section>

        {error && (
          <div className="profile-page-message profile-page-error" role="alert">
            <AlertCircle size={20} />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {successMessage && (
          <div
            className="profile-page-message profile-page-success"
            role="status"
          >
            <CheckCircle2 size={20} />

            <span>{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage("")}
              aria-label="Close success message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <div className="profile-page-layout">
          <aside className="profile-avatar-panel">
            <div className="profile-avatar-panel-glow" />

            <div className="profile-avatar-display">
              {previewUrl ? (
                <img src={previewUrl} alt="Selected profile preview" />
              ) : (
                <UserAvatar user={profile} size={142} />
              )}

              <button
                type="button"
                className="profile-avatar-camera-button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Select profile picture"
              >
                <Camera size={19} />
              </button>
            </div>

            <div className="profile-avatar-identity">
              <h2>{displayName}</h2>

              <span>{profile?.email}</span>

              <small>{formatEnumValue(profile?.role)}</small>
            </div>

            <div
              className={`profile-picture-dropzone ${
                dragActive ? "profile-picture-dropzone-active" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <ImagePlus size={24} />

              <strong>Choose a profile picture</strong>

              <span>
                Drag and drop or select a JPG, PNG, or WEBP image. Maximum size:
                5 MB.
              </span>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Select Image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                hidden
              />
            </div>

            {selectedFile && (
              <div className="profile-selected-file">
                <div>
                  <strong>{selectedFile.name}</strong>

                  <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>

                <button
                  type="button"
                  onClick={cancelSelectedFile}
                  aria-label="Remove selected image"
                >
                  <X size={17} />
                </button>
              </div>
            )}

            <div className="profile-picture-actions">
              <button
                type="button"
                className="profile-upload-button"
                onClick={handleUploadPicture}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <>
                    <LoaderCircle size={17} className="profile-page-spin" />
                    Uploading
                  </>
                ) : (
                  <>
                    <Camera size={17} />
                    Upload Picture
                  </>
                )}
              </button>

              <button
                type="button"
                className="profile-remove-button"
                onClick={handleRemovePicture}
                disabled={removing || !profile?.profile_picture}
              >
                {removing ? (
                  <LoaderCircle size={17} className="profile-page-spin" />
                ) : (
                  <Trash2 size={17} />
                )}
                Remove
              </button>
            </div>
          </aside>

          <div className="profile-page-content">
            <form
              className="profile-information-panel"
              onSubmit={handleSaveProfile}
            >
              <div className="profile-section-heading">
                <div>
                  <span>Personal Information</span>

                  <h2>Profile Details</h2>
                </div>

                <UserRound size={23} />
              </div>

              <div className="profile-form-grid">
                <label>
                  <span>First Name</span>

                  <div className="profile-input-wrapper">
                    <UserRound size={17} />

                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      maxLength={100}
                      autoComplete="given-name"
                    />
                  </div>
                </label>

                <label>
                  <span>Last Name</span>

                  <div className="profile-input-wrapper">
                    <UserRound size={17} />

                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      maxLength={100}
                      autoComplete="family-name"
                    />
                  </div>
                </label>

                <label className="profile-full-width-field">
                  <span>Email Address</span>

                  <div className="profile-input-wrapper profile-readonly-input">
                    <Mail size={17} />

                    <input type="email" value={profile?.email || ""} readOnly />

                    <LockKeyhole size={15} />
                  </div>

                  <small>
                    Your email address cannot be changed from this page.
                  </small>
                </label>
              </div>

              <div className="profile-form-actions">
                <button type="submit" disabled={saving || !formChanged}>
                  {saving ? (
                    <>
                      <LoaderCircle size={18} className="profile-page-spin" />
                      Saving Changes
                    </>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </form>

            <section className="profile-account-panel">
              <div className="profile-section-heading">
                <div>
                  <span>Account Information</span>

                  <h2>Account Overview</h2>
                </div>

                <ShieldCheck size={23} />
              </div>

              <div className="profile-account-cards">
                <article>
                  <div className="profile-account-card-icon">
                    <BadgeCheck size={21} />
                  </div>

                  <span>Verification</span>

                  <strong>
                    {profile?.is_verified ? "Verified" : "Not Verified"}
                  </strong>

                  <small>Email verification status</small>
                </article>

                <article>
                  <div className="profile-account-card-icon">
                    <ShieldCheck size={21} />
                  </div>

                  <span>Account Status</span>

                  <strong>{profile?.is_active ? "Active" : "Inactive"}</strong>

                  <small>Current account availability</small>
                </article>

                <article>
                  <div className="profile-account-card-icon">
                    <LockKeyhole size={21} />
                  </div>

                  <span>Authentication</span>

                  <strong>{formatEnumValue(profile?.auth_provider)}</strong>

                  <small>Login provider</small>
                </article>

                <article>
                  <div className="profile-account-card-icon">
                    <UserRound size={21} />
                  </div>

                  <span>Account Role</span>

                  <strong>{formatEnumValue(profile?.role)}</strong>

                  <small>LexMiner access level</small>
                </article>
              </div>
            </section>

            <section className="profile-activity-panel">
              <div className="profile-section-heading">
                <div>
                  <span>Account Activity</span>

                  <h2>Membership Details</h2>
                </div>

                <CalendarDays size={23} />
              </div>

              <div className="profile-activity-list">
                <div>
                  <span>Member Since</span>

                  <strong>{formatSimpleDate(profile?.created_at)}</strong>
                </div>

                <div>
                  <span>Last Login</span>

                  <strong>{formatDate(profile?.last_login_at)}</strong>
                </div>

                <div>
                  <span>Last Profile Update</span>

                  <strong>{formatDate(profile?.updated_at)}</strong>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
