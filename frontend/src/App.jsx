import { Navigate, Route, Routes } from "react-router-dom";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProfilePage from "./pages/admin/AdminProfilePage";
import UploadDocumentsPage from "./pages/admin/UploadDocumentsPage";
import DatasetManagementPage from "./pages/admin/DatasetManagementPage";
import VectorIndexPage from "./pages/admin/VectorIndexPage";
import AdminUserManagementPage from "./pages/admin/AdminUserManagementPage";
import UserAuthenticationPage from "./pages/public/UserAuthenticationPage";
import TermsOfUse from "./pages/policy/termsPage";
import PrivacyPolicy from "./pages/policy/policyPage";
import UserHomePage from "./pages/public/UserHomePage";
import SearchResultsPage from "./pages/public/SearchResultsPage";
import UserCaseViewerPage from "./pages/public/UserCaseViewerPage";
import UserCaseCollectionPage from "./pages/public/UserCaseCollectionPage";
import UserProfilePage from "./pages/public/UserProfilePage";
import UserAccountSettingsPage from "./pages/public/UserAccountSettingsPage";
import UserBookmarksPage from "./pages/public/UserBookmarksPage";

function PlaceholderPage({ title }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "#102957",
        background: "#eef5ff",
      }}
    >
      <h1>{title}</h1>
    </main>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<UserHomePage />} />

      <Route path="/search/result" element={<SearchResultsPage />} />

      <Route path="/authentication" element={<UserAuthenticationPage />} />

      <Route path="/case-viewer/:caseId" element={<UserCaseViewerPage />} />

      <Route path="/admin/dashboard" element={<AdminDashboardPage />} />

      <Route path="/admin/profile" element={<AdminProfilePage />} />

      <Route path="/admin/upload-documents" element={<UploadDocumentsPage />} />

      <Route path="/policy/terms-of-use" element={<TermsOfUse />} />

      <Route path="/policy/privacy-policy" element={<PrivacyPolicy />} />

      <Route path="/case-collection" element={<UserCaseCollectionPage />} />

      <Route path="/profile" element={<UserProfilePage />} />

      <Route path="/bookmarks" element={<UserBookmarksPage />} />

      <Route path="/account-settings" element={<UserAccountSettingsPage />} />
      <Route
        path="/admin/dataset-management"
        element={<DatasetManagementPage />}
      />

      <Route path="/admin/vector-index" element={<VectorIndexPage />} />

      <Route
        path="/admin/user-management"
        element={<AdminUserManagementPage />}
      />

      {/* ================================================
          USER PLACEHOLDER ROUTES
      ================================================= */}

      <Route
        path="/register"
        element={<PlaceholderPage title="Register Page" />}
      />

      <Route
        path="/forgot-password"
        element={<PlaceholderPage title="Forgot Password" />}
      />

      <Route
        path="/profile"
        element={<PlaceholderPage title="User Profile" />}
      />

      <Route
        path="/search-history"
        element={<PlaceholderPage title="Search History" />}
      />

      {/* ================================================
          UNKNOWN ROUTES
      ================================================= */}

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
