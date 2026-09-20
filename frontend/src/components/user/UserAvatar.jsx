import { useMemo, useState } from "react";

import { buildProfilePictureUrl } from "../../services/userProfileService";

function getUserInitials(user) {
  const firstName = String(user?.first_name || "").trim();

  const lastName = String(user?.last_name || "").trim();

  const firstInitial = firstName.charAt(0);

  const lastInitial = lastName.charAt(0);

  const initials = `${firstInitial}${lastInitial}`.trim().toUpperCase();

  if (initials) {
    return initials;
  }

  const email = String(user?.email || "").trim();

  if (email) {
    return email.charAt(0).toUpperCase();
  }

  return "U";
}

export default function UserAvatar({ user, size = 42, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials = useMemo(() => getUserInitials(user), [user]);

  const profilePictureUrl = useMemo(
    () => buildProfilePictureUrl(user?.profile_picture),
    [user?.profile_picture],
  );

  const dimensionStyle = {
    "--user-avatar-size": `${size}px`,
  };

  if (profilePictureUrl && !imageFailed) {
    return (
      <img
        src={profilePictureUrl}
        alt={user?.first_name ? `${user.first_name}'s profile` : "User profile"}
        className={`user-avatar-image ${className}`}
        style={dimensionStyle}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <span
      className={`user-avatar-fallback ${className}`}
      style={dimensionStyle}
      aria-label="User avatar"
    >
      {initials}
    </span>
  );
}
