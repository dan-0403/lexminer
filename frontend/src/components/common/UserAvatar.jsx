export default function UserAvatar({ user, size = 48 }) {
  const initials = `${user?.first_name?.[0] ?? ""}${
    user?.last_name?.[0] ?? ""
  }`.toUpperCase();

  if (user?.profile_picture) {
    return (
      <img
        src={user.profile_picture}
        alt="Profile"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,

        borderRadius: "50%",

        background: "linear-gradient(135deg,#0b6689,#25a6ce)",

        color: "#fff",

        display: "grid",

        placeItems: "center",

        fontWeight: 700,

        fontSize: size / 2.5,
      }}
    >
      {initials}
    </div>
  );
}
