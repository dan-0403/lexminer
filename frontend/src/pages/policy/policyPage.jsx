import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../../styles/professional.css";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-card">
        <button className="legal-close-button" onClick={() => navigate(-1)}>
          <X size={22} />
        </button>

        <span className="legal-eyebrow">DATA PRIVACY</span>

        <h1>Privacy Policy</h1>

        <p className="legal-updated">Effective Date: August 2026</p>

        <section>
          <h2>1. Information We Collect</h2>

          <ul>
            <li>Full Name</li>
            <li>Email Address</li>
            <li>Encrypted Password</li>
            <li>Login Activity</li>
            <li>Search History</li>
            <li>Research Preferences</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Information</h2>

          <ul>
            <li>Authenticate your account.</li>
            <li>Provide personalized legal research.</li>
            <li>Improve search relevance.</li>
            <li>Maintain system security.</li>
            <li>Generate analytics for research.</li>
          </ul>
        </section>

        <section>
          <h2>3. Email Verification</h2>

          <p>
            Your email address is used solely for account verification, password
            recovery, and important security notifications.
          </p>
        </section>

        <section>
          <h2>4. Search History</h2>

          <p>
            LexMiner stores search history to improve user experience and enable
            users to revisit previous legal research sessions.
          </p>
        </section>

        <section>
          <h2>5. Data Security</h2>

          <p>
            User passwords are securely hashed. Communications between your
            browser and LexMiner are encrypted using HTTPS.
          </p>

          <p>
            Reasonable administrative and technical safeguards are implemented
            to protect user information from unauthorized access.
          </p>
        </section>

        <section>
          <h2>6. Third-Party Services</h2>

          <p>
            LexMiner may utilize trusted third-party services, including email
            verification providers and Google Authentication, for secure account
            management.
          </p>
        </section>

        <section>
          <h2>7. Data Retention</h2>

          <p>
            Account information is retained while your account remains active.
            Users may request account deletion, subject to applicable legal or
            academic requirements.
          </p>
        </section>

        <section>
          <h2>8. User Rights</h2>

          <ul>
            <li>Access your stored information.</li>
            <li>Update profile information.</li>
            <li>Request account deletion.</li>
            <li>Request correction of inaccurate information.</li>
          </ul>
        </section>

        <section>
          <h2>9. Compliance</h2>

          <p>
            LexMiner is designed to respect the principles of the Philippine
            Data Privacy Act of 2012 (Republic Act No. 10173) regarding the
            responsible collection, storage, and processing of personal data.
          </p>
        </section>
      </div>
    </div>
  );
}
