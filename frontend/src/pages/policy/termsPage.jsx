import { X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import "../../styles/professional.css";
import ScrollToTopButton from "../../components/common/ScrollToTopButton";
export default function TermsOfUse() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <div className="legal-card">
        <button className="legal-close-button" onClick={() => navigate(-1)}>
          <X size={22} />
        </button>

        <span className="legal-eyebrow">LEGAL AGREEMENT</span>

        <h1>Terms of Use</h1>

        <p className="legal-updated">Effective Date: August 2026</p>

        <section>
          <h2>1. Acceptance of Terms</h2>

          <p>
            By accessing or using LexMiner, you agree to comply with these Terms
            of Use. If you do not agree with these terms, please discontinue use
            of the system.
          </p>
        </section>

        <section>
          <h2>2. Purpose of the System</h2>

          <p>
            LexMiner is an academic legal research platform designed to assist
            users in searching, analyzing, and understanding Philippine Supreme
            Court decisions through semantic search, artificial intelligence,
            and legal argument mining.
          </p>

          <p>
            The system is intended solely for educational, research, and
            informational purposes.
          </p>
        </section>

        <section>
          <h2>3. User Responsibilities</h2>

          <ul>
            <li>Provide accurate registration information.</li>
            <li>Maintain the confidentiality of your account credentials.</li>
            <li>Use the system only for lawful purposes.</li>
            <li>Respect intellectual property rights.</li>
            <li>Do not attempt unauthorized access or misuse.</li>
          </ul>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>

          <p>
            Supreme Court decisions remain the property of the Supreme Court of
            the Philippines. LexMiner only indexes and analyzes publicly
            available legal documents for research purposes.
          </p>
        </section>

        <section>
          <h2>5. Artificial Intelligence Disclaimer</h2>

          <p>
            AI-generated summaries, legal issue identification, and argument
            mining are automatically generated. These outputs should not be
            considered legal advice nor replace professional legal consultation.
          </p>
        </section>

        <section>
          <h2>6. Availability</h2>

          <p>
            LexMiner is provided on an "as available" basis. System availability
            may be interrupted due to maintenance, updates, or technical issues.
          </p>
        </section>

        <section>
          <h2>7. Limitation of Liability</h2>

          <p>
            The developers shall not be liable for any damages, losses, or legal
            consequences resulting from the use of AI-generated information or
            search results.
          </p>
        </section>

        <section>
          <h2>8. Account Termination</h2>

          <p>
            Accounts violating these Terms of Use may be suspended or
            permanently removed without prior notice.
          </p>
        </section>

        <section>
          <h2>9. Changes to these Terms</h2>

          <p>
            These Terms of Use may be updated periodically. Continued use of
            LexMiner constitutes acceptance of any revisions.
          </p>
          <ScrollToTopButton />
        </section>
      </div>
    </div>
  );
}
