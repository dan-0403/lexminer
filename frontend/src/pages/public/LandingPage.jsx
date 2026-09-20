import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BookMarked,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Database,
  FileSearch,
  FileText,
  Fingerprint,
  Globe2,
  Gavel,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  LogOut,
  Mail,
  Menu,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  UserPlus,
  X,
  Eye,
  EyeOff,
  BookOpen,
  Bookmark,
  Clock3,
  Rocket,
  Scale,
  UserCircle,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";

import {
  createGuestSession,
  getAuthErrorMessage,
  getCurrentSession,
  login,
  logout,
} from "../../services/authService";

import "../../styles/admin-profile.css";
// import "../../styles/landing-page.css";

/* =====================================================
   DEFAULT LOGIN FORM
===================================================== */

const DEFAULT_LOGIN_FORM = {
  email: "",
  password: "",
};

/* =====================================================
   LANDING NAVIGATION
===================================================== */

const LANDING_NAVIGATION = [
  {
    id: "home",
    label: "Home",
  },
  {
    id: "challenge",
    label: "The Challenge",
  },
  {
    id: "process",
    label: "Our Process",
  },
  {
    id: "how-it-works",
    label: "How It Works",
  },
  {
    id: "roadmap",
    label: "Roadmap",
  },
  {
    id: "impact",
    label: "Impact",
  },
];

/* =====================================================
   FORMAT USER NAME
===================================================== */

function formatUserName(user) {
  const name = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || user?.email || "LexMiner User";
}

/* =====================================================
   PAGE LOADER
===================================================== */

function LandingPageLoader() {
  return (
    <div className="lexminer-loader">
      <div className="loader-grid" />

      <div className="loader-content">
        <div className="loader-logo-wrapper">
          <div className="loader-orbit orbit-one" />

          <div className="loader-orbit orbit-two" />

          <img src={lexminerLogo} alt="LexMiner" className="loader-logo" />
        </div>

        <h1>LexMiner</h1>

        <p>AI Adaptive Language Case Decision Miner</p>

        <div className="loader-progress">
          <div className="loader-progress-bar" />
        </div>

        <div className="loader-status">
          <LoaderCircle size={17} className="spin-icon" />
          Loading legal research experience...
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MAIN PAGE
===================================================== */

export default function LandingPage() {
  const navigate = useNavigate();

  const [initialLoading, setInitialLoading] = useState(true);

  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);

  const [loginModalOpen, setLoginModalOpen] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [loginLoading, setLoginLoading] = useState(false);

  const [logoutLoading, setLogoutLoading] = useState(false);

  const [loginForm, setLoginForm] = useState(DEFAULT_LOGIN_FORM);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [session, setSession] = useState(() => getCurrentSession());

  /* ===================================================
     SESSION VALUES
  =================================================== */

  const isRegistered = session?.mode === "registered";

  const isGuest = session?.mode === "guest";

  const currentUser = session?.user || null;

  const displayName = useMemo(() => formatUserName(currentUser), [currentUser]);

  /* ===================================================
     INITIAL PAGE LOAD
  =================================================== */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const currentSession = getCurrentSession();

      setSession(currentSession);

      setInitialLoading(false);

      if (currentSession.mode === "anonymous") {
        setLoginModalOpen(true);
      }
    }, 850);

    return () => window.clearTimeout(timer);
  }, []);

  /* ===================================================
     AUTO CLEAR NOTICE
  =================================================== */

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 4500);

    return () => window.clearTimeout(timer);
  }, [notice]);

  /* ===================================================
     AUTO CLEAR ERROR
  =================================================== */

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError("");
    }, 6000);

    return () => window.clearTimeout(timer);
  }, [error]);

  /* ===================================================
     ESCAPE HANDLER
  =================================================== */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (!loginLoading) {
        setLoginModalOpen(false);
      }

      setMobileNavigationOpen(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [loginLoading]);

  /* ===================================================
     SCROLL TO SECTION
  =================================================== */

  const scrollToSection = useCallback((sectionId) => {
    const element = document.getElementById(sectionId);

    if (!element) {
      return;
    }

    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    setMobileNavigationOpen(false);
  }, []);

  /* ===================================================
     LOGIN FORM CHANGE
  =================================================== */

  function handleLoginFieldChange(event) {
    const { name, value } = event.target;

    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }));

    setError("");
  }

  /* ===================================================
     LOCAL LOGIN
  =================================================== */

  async function handleLocalLogin(event) {
    event.preventDefault();

    const normalizedEmail = loginForm.email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address.");

      return;
    }

    if (!loginForm.password) {
      setError("Enter your password.");

      return;
    }

    setLoginLoading(true);
    setError("");
    setNotice("");

    try {
      const result = await login({
        email: normalizedEmail,
        password: loginForm.password,
      });

      const nextSession = getCurrentSession();

      setSession(nextSession);

      setLoginForm(DEFAULT_LOGIN_FORM);

      setLoginModalOpen(false);

      setNotice(result?.message || "Login successful.");
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setLoginLoading(false);
    }
  }

  /* ===================================================
     GOOGLE LOGIN PLACEHOLDER
  =================================================== */

  // async function handleGoogleCredential(
  //   credential,
  // ) {
  //   if (!credential) {
  //     setError(
  //       "Google authentication did not provide a credential.",
  //     );

  //     return;
  //   }

  //   setLoginLoading(true);
  //   setError("");
  //   setNotice("");

  //   try {
  //     const result =
  //       await googleLogin(
  //         credential,
  //       );

  //     setSession(
  //       getCurrentSession(),
  //     );

  //     setLoginModalOpen(
  //       false,
  //     );

  //     setNotice(
  //       result?.message ||
  //         "Google login successful.",
  //     );
  //   } catch (requestError) {
  //     setError(
  //       getAuthErrorMessage(
  //         requestError,
  //       ),
  //     );
  //   } finally {
  //     setLoginLoading(false);
  //   }
  // }

  /* ===================================================
     CONTINUE AS GUEST
  =================================================== */

  function handleContinueAsGuest() {
    const guestSession = createGuestSession();

    setSession({
      mode: "guest",
      user: null,
      accessToken: null,
      guestSessionId: guestSession.sessionId,
    });

    setLoginModalOpen(false);

    setNotice(
      "Guest session started. Sign in anytime to save bookmarks and research history.",
    );
  }

  /* ===================================================
     OPEN CASE DECISIONS
  =================================================== */

  function openCaseDecisions() {
    navigate("/case-decisions");
  }

  /* ===================================================
     OPEN BOOKMARKS
  =================================================== */

  function openBookmarks() {
    if (!isRegistered) {
      setError("Bookmarks require a registered LexMiner account.");

      setLoginModalOpen(true);

      return;
    }

    navigate("/bookmarks");
  }

  /* ===================================================
     OPEN REGISTRATION
  =================================================== */

  function openRegistration() {
    setLoginModalOpen(false);

    navigate("/register");
  }

  /* ===================================================
     LOGOUT
  =================================================== */

  async function handleLogout() {
    if (logoutLoading) {
      return;
    }

    setLogoutLoading(true);
    setError("");
    setNotice("");

    try {
      await logout();

      setSession({
        mode: "anonymous",
        user: null,
        accessToken: null,
        guestSessionId: null,
      });

      setNotice("Your session has ended.");

      setLoginModalOpen(true);
    } catch (requestError) {
      setError(getAuthErrorMessage(requestError));
    } finally {
      setLogoutLoading(false);
    }
  }

  /* ===================================================
     LOADER
  =================================================== */

  if (initialLoading) {
    return <LandingPageLoader />;
  }

  return (
    <div className="landing-page">
      {/* =================================================
          BACKGROUND
      ================================================= */}

      <div className="landing-background">
        <div className="background-grid" />

        <div className="background-orb orb-a" />

        <div className="background-orb orb-b" />

        <div className="background-orb orb-c" />
      </div>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <header className="landing-navbar">
        <div className="landing-navbar-inner">
          <button
            type="button"
            className="landing-brand"
            onClick={() => scrollToSection("home")}
          >
            <img src={lexminerLogo} alt="LexMiner logo" />

            <div>
              <strong>LexMiner</strong>

              <span>Legal Intelligence</span>
            </div>
          </button>

          <nav
            className={`landing-navigation ${
              mobileNavigationOpen ? "mobile-open" : ""
            }`}
          >
            <div className="landing-mobile-navigation-heading">
              <div className="landing-mobile-brand">
                <img src={lexminerLogo} alt="LexMiner" />

                <div>
                  <strong>LexMiner</strong>

                  <span>Public Research Portal</span>
                </div>
              </div>

              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileNavigationOpen(false)}
              >
                <X size={21} />
              </button>
            </div>

            {LANDING_NAVIGATION.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}

            <button type="button" onClick={openCaseDecisions}>
              Case Decisions
            </button>

            <button type="button" onClick={openBookmarks}>
              Bookmarks
            </button>

            <div className="landing-mobile-auth-actions">
              {isRegistered ? (
                <>
                  <button
                    type="button"
                    className="landing-mobile-profile-button"
                    onClick={() => navigate("/profile")}
                  >
                    <CircleUserRound size={18} />

                    {displayName}
                  </button>

                  <button
                    type="button"
                    className="landing-mobile-logout-button"
                    onClick={() => {
                      void handleLogout();
                    }}
                    disabled={logoutLoading}
                  >
                    {logoutLoading ? (
                      <LoaderCircle size={18} className="spin-icon" />
                    ) : (
                      <LogOut size={18} />
                    )}
                    Logout
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="landing-mobile-login-button"
                  onClick={() => setLoginModalOpen(true)}
                >
                  <LogIn size={18} />
                  Sign In
                </button>
              )}
            </div>
          </nav>

          <div className="landing-navbar-actions">
            {isGuest && (
              <div className="landing-session-badge guest">
                <Globe2 size={15} />
                Guest Session
              </div>
            )}

            {isRegistered && (
              <button
                type="button"
                className="landing-user-button"
                onClick={() => navigate("/profile")}
              >
                <div className="landing-user-avatar">
                  <CircleUserRound size={20} />
                </div>

                <div>
                  <strong>{displayName}</strong>

                  <span>Registered User</span>
                </div>

                <ChevronDown size={16} />
              </button>
            )}

            {!isRegistered && (
              <button
                type="button"
                className="landing-login-button"
                onClick={() => setLoginModalOpen(true)}
              >
                <LogIn size={18} />
                Sign In
              </button>
            )}

            {isRegistered && (
              <button
                type="button"
                className="landing-logout-button"
                onClick={() => {
                  void handleLogout();
                }}
                disabled={logoutLoading}
              >
                {logoutLoading ? (
                  <LoaderCircle size={18} className="spin-icon" />
                ) : (
                  <LogOut size={18} />
                )}
              </button>
            )}

            <button
              type="button"
              className="landing-menu-button"
              onClick={() => setMobileNavigationOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      {mobileNavigationOpen && (
        <button
          type="button"
          className="landing-mobile-overlay"
          onClick={() => setMobileNavigationOpen(false)}
          aria-label="Close mobile navigation"
        />
      )}

      {/* =================================================
          ALERTS
      ================================================= */}

      <div className="landing-alert-container">
        {error && (
          <div className="landing-alert landing-alert-error">
            <AlertCircle size={19} />

            <span>{error}</span>

            <button
              type="button"
              onClick={() => setError("")}
              aria-label="Close error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {notice && (
          <div className="landing-alert landing-alert-success">
            <CheckCircle2 size={19} />

            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Close notification"
            >
              <X size={17} />
            </button>
          </div>
        )}
      </div>

      {/* =================================================
          MAIN CONTENT
      ================================================= */}

      <main className="landing-main">
        {/* ===============================================
            HERO SECTION
        =============================================== */}

        <section id="home" className="landing-hero">
          <div className="landing-hero-copy">
            <div className="landing-hero-badge">
              <ShieldCheck size={16} />
              Philippine legal intelligence platform
            </div>

            <h1>
              AI Adaptive Language
              <span> Case Decision Miner</span>
            </h1>

            <p className="landing-hero-subtitle">
              Domain-adaptive semantic legal research and argument mining for
              Philippine Supreme Court decisions.
            </p>

            <p className="landing-hero-description">
              Discover legally relevant cases through meaning, context, factual
              similarity, judicial reasoning, and argument structure—not only
              exact keyword matches.
            </p>

            <div className="landing-hero-actions">
              <button
                type="button"
                className="landing-primary-button"
                onClick={openCaseDecisions}
              >
                <Search size={19} />
                Search Case Decisions
                <ArrowRight size={18} />
              </button>

              {!isRegistered && !isGuest && (
                <button
                  type="button"
                  className="landing-secondary-button"
                  onClick={handleContinueAsGuest}
                >
                  <Globe2 size={19} />
                  Continue as Guest
                </button>
              )}

              {!isRegistered && (
                <button
                  type="button"
                  className="landing-outline-button"
                  onClick={() => setLoginModalOpen(true)}
                >
                  <LogIn size={19} />
                  Sign In to Save Research
                </button>
              )}

              {isRegistered && (
                <button
                  type="button"
                  className="landing-secondary-button"
                  onClick={openBookmarks}
                >
                  <BookMarked size={19} />
                  Open Bookmarks
                </button>
              )}
            </div>

            <div className="landing-hero-trust-row">
              <div>
                <BadgeCheck size={17} />
                Semantic case matching
              </div>

              <div>
                <BrainCircuit size={17} />
                Domain-adaptive AI
              </div>

              <div>
                <Gavel size={17} />
                Argument-centered analysis
              </div>
            </div>

            {isGuest && (
              <div className="landing-guest-notice">
                <Globe2 size={19} />

                <div>
                  <strong>Guest research session active</strong>

                  <span>
                    You can search and read decisions. Sign in to save bookmarks
                    and research history.
                  </span>
                </div>

                <button type="button" onClick={() => setLoginModalOpen(true)}>
                  Sign In
                </button>
              </div>
            )}

            {isRegistered && (
              <div className="landing-user-welcome">
                <CircleUserRound size={20} />

                <div>
                  <strong>Welcome back, {displayName}</strong>

                  <span>
                    Your bookmarks and registered-user tools are available.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="landing-hero-visual">
            <div className="landing-visual-orbit landing-orbit-one" />

            <div className="landing-visual-orbit landing-orbit-two" />

            <div className="landing-visual-orbit landing-orbit-three" />

            <div className="landing-visual-center">
              <div className="landing-visual-logo">
                <img src={lexminerLogo} alt="LexMiner AI" />
              </div>

              <strong>LexMiner AI</strong>

              <span>Semantic Legal Intelligence</span>
            </div>

            <div className="landing-floating-card landing-card-case">
              <FileText size={19} />

              <div>
                <strong>Case Decisions</strong>

                <span>Structured legal documents</span>
              </div>
            </div>

            <div className="landing-floating-card landing-card-vector">
              <Network size={19} />

              <div>
                <strong>Vector Retrieval</strong>

                <span>Meaning-based similarity</span>
              </div>
            </div>

            <div className="landing-floating-card landing-card-ai">
              <BrainCircuit size={19} />

              <div>
                <strong>Legal AI</strong>

                <span>Reasoning and argument analysis</span>
              </div>
            </div>

            <div className="landing-floating-card landing-card-search">
              <Search size={19} />

              <div>
                <strong>Semantic Search</strong>

                <span>Query by legal issue</span>
              </div>
            </div>

            <div className="landing-visual-stat landing-stat-one">
              <strong>Context</strong>

              <span>Aware</span>
            </div>

            <div className="landing-visual-stat landing-stat-two">
              <strong>Legal</strong>

              <span>Focused</span>
            </div>
          </div>
        </section>
        {/* ===============================================
            THE CHALLENGE
        =============================================== */}

        <section id="challenge" className="landing-section challenge-section">
          <div className="section-heading">
            <span className="section-label">Research Problem</span>

            <h2>The Challenge</h2>

            <p>
              Legal researchers often spend hours locating relevant Supreme
              Court decisions because conventional search engines rely primarily
              on keyword matching. Similar legal disputes may use different
              wording, making important precedents difficult to discover.
            </p>
          </div>

          <div className="challenge-comparison">
            <div className="challenge-card traditional-search">
              <div className="challenge-icon">
                <Search size={26} />
              </div>

              <h3>Traditional Keyword Search</h3>

              <ul>
                <li>Exact words are required.</li>

                <li>Misses similar legal concepts.</li>

                <li>Cannot understand factual context.</li>

                <li>Requires extensive manual review.</li>

                <li>Time-consuming legal research.</li>
              </ul>
            </div>

            <div className="challenge-arrow">
              <ArrowRight size={42} />
            </div>

            <div className="challenge-card ai-search">
              <div className="challenge-icon">
                <BrainCircuit size={26} />
              </div>

              <h3>LexMiner Semantic Search</h3>

              <ul>
                <li>Understands legal meaning.</li>

                <li>Matches similar factual situations.</li>

                <li>Retrieves semantically related cases.</li>

                <li>Highlights legal arguments.</li>

                <li>Produces AI-generated summaries.</li>
              </ul>
            </div>
          </div>

          <div className="challenge-grid">
            <article className="challenge-feature">
              <div className="challenge-feature-icon">
                <Clock3 size={22} />
              </div>

              <h3>Slow Legal Research</h3>

              <p>
                Lawyers and researchers manually browse numerous case decisions
                before finding relevant jurisprudence.
              </p>
            </article>

            <article className="challenge-feature">
              <div className="challenge-feature-icon">
                <BookOpen size={22} />
              </div>

              <h3>Thousands of Decisions</h3>

              <p>
                Philippine Supreme Court decisions continue to grow every year,
                increasing research complexity.
              </p>
            </article>

            <article className="challenge-feature">
              <div className="challenge-feature-icon">
                <Network size={22} />
              </div>

              <h3>Semantic Complexity</h3>

              <p>
                Similar legal issues are expressed using different legal
                terminology and factual narratives.
              </p>
            </article>

            <article className="challenge-feature">
              <div className="challenge-feature-icon">
                <BrainCircuit size={22} />
              </div>

              <h3>AI-Assisted Research</h3>

              <p>
                LexMiner applies semantic embeddings and argument mining to
                retrieve more meaningful legal precedents.
              </p>
            </article>
          </div>
        </section>

        {/* ===============================================
            OUR PROCESS
        =============================================== */}

        <section id="process" className="landing-section process-section">
          <div className="section-heading">
            <span className="section-label">
              Artificial Intelligence Workflow
            </span>

            <h2>Our Process</h2>

            <p>
              LexMiner transforms raw Supreme Court decisions into a searchable
              semantic knowledge base using Natural Language Processing, vector
              embeddings, and legal argument mining.
            </p>
          </div>

          <div className="process-timeline">
            <article className="process-step">
              <div className="process-number">01</div>

              <div className="process-content">
                <Database size={24} />

                <h3>Dataset Collection</h3>

                <p>
                  Supreme Court decisions are collected and stored inside
                  PostgreSQL together with metadata.
                </p>
              </div>
            </article>

            <article className="process-step">
              <div className="process-number">02</div>

              <div className="process-content">
                <FileText size={24} />

                <h3>Text Processing</h3>

                <p>
                  PDF documents are cleaned, normalized, segmented, and
                  converted into legal text chunks.
                </p>
              </div>
            </article>

            <article className="process-step">
              <div className="process-number">03</div>

              <div className="process-content">
                <BrainCircuit size={24} />

                <h3>Embedding Generation</h3>

                <p>
                  Sentence Transformers convert every legal paragraph into
                  semantic vector representations.
                </p>
              </div>
            </article>

            <article className="process-step">
              <div className="process-number">04</div>

              <div className="process-content">
                <Network size={24} />

                <h3>Vector Storage</h3>

                <p>
                  ChromaDB stores embeddings for efficient semantic similarity
                  retrieval.
                </p>
              </div>
            </article>

            <article className="process-step">
              <div className="process-number">05</div>

              <div className="process-content">
                <Search size={24} />

                <h3>Semantic Search</h3>

                <p>
                  User queries are transformed into embeddings and matched
                  against the vector database.
                </p>
              </div>
            </article>

            <article className="process-step">
              <div className="process-number">06</div>

              <div className="process-content">
                <Scale size={24} />

                <h3>Argument Mining</h3>

                <p>
                  Relevant legal reasoning, issues, and judicial conclusions are
                  highlighted for researchers.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* ===============================================
            HOW LEXMINER WORKS
        =============================================== */}

        <section
          id="how-it-works"
          className="landing-section how-it-works-section"
        >
          <div className="section-heading">
            <span className="section-label">User Guide</span>

            <h2>How LexMiner Works</h2>

            <p>
              LexMiner is designed to simplify legal research. Whether you are a
              guest visitor, student, researcher, lawyer, or legal professional,
              you can quickly locate relevant Philippine Supreme Court decisions
              using semantic search instead of traditional keyword matching.
            </p>
          </div>

          <div className="usage-workflow">
            <article className="workflow-card">
              <div className="workflow-icon">
                <UserCircle size={34} />
              </div>

              <span className="workflow-number">Step 01</span>

              <h3>Choose Your Access</h3>

              <p>
                Continue as a Guest for instant access, sign in using your
                registered account, or authenticate using Google.
              </p>

              <ul>
                <li>Guest Session</li>
                <li>Registered Account</li>
                <li>Google Authentication</li>
              </ul>
            </article>

            <article className="workflow-card">
              <div className="workflow-icon">
                <Search size={34} />
              </div>

              <span className="workflow-number">Step 02</span>

              <h3>Enter Your Legal Question</h3>

              <p>
                Search using ordinary language instead of exact legal keywords.
              </p>

              <div className="search-example">
                "Illegal dismissal without due process"
                <br />
                "Robbery with violence"
                <br />
                "Drug possession"
                <br />
                "Qualified theft"
              </div>
            </article>

            <article className="workflow-card">
              <div className="workflow-icon">
                <BrainCircuit size={34} />
              </div>

              <span className="workflow-number">Step 03</span>

              <h3>AI Understands Your Query</h3>

              <p>
                LexMiner expands your legal concepts, identifies similar
                scenarios, and converts your query into semantic embeddings
                before searching.
              </p>

              <div className="workflow-tags">
                <span>Semantic Search</span>
                <span>Embeddings</span>
                <span>Legal Concepts</span>
              </div>
            </article>

            <article className="workflow-card">
              <div className="workflow-icon">
                <Database size={34} />
              </div>

              <span className="workflow-number">Step 04</span>

              <h3>Retrieve Related Cases</h3>

              <p>
                The system searches ChromaDB and PostgreSQL simultaneously to
                retrieve the most relevant Supreme Court decisions.
              </p>

              <div className="workflow-badge">Ranked by Similarity Score</div>
            </article>

            <article className="workflow-card">
              <div className="workflow-icon">
                <Scale size={34} />
              </div>

              <span className="workflow-number">Step 05</span>

              <h3>Review AI Analysis</h3>

              <p>
                Every retrieved case includes AI-generated legal summaries,
                highlighted legal arguments, and the complete Supreme Court
                decision.
              </p>

              <ul>
                <li>Case Summary</li>
                <li>Legal Issues</li>
                <li>Court Ruling</li>
                <li>Legal Basis</li>
              </ul>
            </article>

            <article className="workflow-card">
              <div className="workflow-icon">
                <Bookmark size={34} />
              </div>

              <span className="workflow-number">Step 06</span>

              <h3>Save Your Research</h3>

              <p>
                Registered users may bookmark Supreme Court decisions, organize
                future research, and revisit previously saved cases.
              </p>

              <div className="workflow-tags">
                <span>Bookmarks</span>
                <span>History</span>
                <span>Research</span>
              </div>
            </article>
          </div>

          <div className="system-overview">
            <div className="overview-card">
              <div className="overview-icon">
                <FileSearch size={28} />
              </div>

              <h3>Semantic Legal Search</h3>

              <p>Search based on legal meaning instead of exact words.</p>
            </div>

            <div className="overview-card">
              <div className="overview-icon">
                <BrainCircuit size={28} />
              </div>

              <h3>AI Argument Mining</h3>

              <p>
                Automatically extracts legal reasoning, issues, rulings, and
                judicial analysis.
              </p>
            </div>

            <div className="overview-card">
              <div className="overview-icon">
                <BookOpen size={28} />
              </div>

              <h3>Supreme Court Decisions</h3>

              <p>
                Read the complete official Philippine Supreme Court decision
                alongside AI-generated insights.
              </p>
            </div>

            <div className="overview-card">
              <div className="overview-icon">
                <Sparkles size={28} />
              </div>

              <h3>Faster Legal Research</h3>

              <p>
                Reduce research time while improving the discovery of relevant
                jurisprudence.
              </p>
            </div>
          </div>
        </section>

        {/* ===============================================
            PROJECT ROADMAP
        =============================================== */}

        <section id="roadmap" className="landing-section roadmap-section">
          <div className="section-heading">
            <span className="section-label">System Development</span>

            <h2>Project Roadmap</h2>

            <p>
              LexMiner was developed through a structured capstone methodology
              consisting of fourteen major implementation phases. Each phase
              incrementally introduced new features, artificial intelligence
              capabilities, and legal research modules.
            </p>
          </div>

          <div className="roadmap-timeline">
            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 1</span>

                <h3>System Planning</h3>

                <p>
                  Requirements gathering, feasibility study, architecture
                  planning, and technology selection.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 2</span>

                <h3>Database Design</h3>

                <p>
                  PostgreSQL schema, user management, datasets, case metadata,
                  bookmarks, and visitor logging.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 3</span>

                <h3>Authentication</h3>

                <p>
                  Local authentication, Google Login, JWT, Refresh Tokens, OTP
                  verification, and administrator security.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 4</span>

                <h3>Dataset Processing Pipeline</h3>

                <p>
                  PDF importing, extraction, text cleaning, chunk generation,
                  metadata extraction, embeddings, and vector storage.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 5</span>

                <h3>Semantic Search Engine</h3>

                <p>
                  AI query expansion, legal concept mapping, semantic retrieval,
                  similarity ranking, and search optimization.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 6</span>

                <h3>AI Case Analysis</h3>

                <p>
                  Legal summaries, issue extraction, legal reasoning, court
                  rulings, and argument mining.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 7</span>

                <h3>Case Viewer</h3>

                <p>
                  Full Supreme Court decision viewer, AI summary panel,
                  highlighted arguments, and legal references.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 8</span>

                <h3>Bookmark System</h3>

                <p>Save, organize, revisit, and manage favorite legal cases.</p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 9</span>

                <h3>Search History</h3>

                <p>
                  Personalized search history and previously viewed legal
                  decisions.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 10</span>

                <h3>Administrative Dashboard</h3>

                <p>
                  Analytics, monitoring, datasets, user statistics, and AI
                  system health.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 11</span>

                <h3>Dataset Management</h3>

                <p>
                  Upload, import, indexing, processing progress, and document
                  management.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 12</span>

                <h3>Administrator Security</h3>

                <p>
                  Profile management, password security, administrator
                  monitoring, and authentication controls.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 13</span>

                <h3>AI Infrastructure</h3>

                <p>
                  Vector index rebuilding, user management, visitor monitoring,
                  and backend optimization.
                </p>
              </div>
            </article>

            <article className="roadmap-item active">
              <div className="roadmap-marker">
                <Rocket size={18} />
              </div>

              <div className="roadmap-content">
                <span>Phase 14</span>

                <h3>Public Legal Research Portal</h3>

                <p>
                  Public landing page, guest sessions, case library, semantic
                  legal search, bookmarks, and complete researcher experience.
                </p>
              </div>
            </article>
          </div>

          <div className="roadmap-progress">
            <div className="roadmap-progress-info">
              <strong>Project Completion</strong>

              <span>Phase 14 of 14</span>
            </div>

            <div className="roadmap-progress-bar">
              <span
                style={{
                  width: "100%",
                }}
              />
            </div>
          </div>
        </section>

        {/* ===============================================
    PROJECT ROADMAP
=============================================== */}

        <section id="roadmap" className="landing-section roadmap-section">
          <div className="section-heading">
            <span className="section-label">Development Journey</span>

            <h2>Project Roadmap</h2>

            <p>
              LexMiner was developed using a structured software engineering
              methodology. Each stage focused on transforming research
              objectives into a reliable, AI-powered legal research platform.
            </p>
          </div>

          <div className="roadmap-timeline">
            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>01</span>

                <h3>Problem Identification</h3>

                <p>
                  Identified existing challenges in legal research, including
                  inefficient keyword searching, time-consuming case retrieval,
                  and limited semantic understanding.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>02</span>

                <h3>Literature Review</h3>

                <p>
                  Reviewed related studies, artificial intelligence techniques,
                  legal information systems, and semantic search technologies to
                  establish the research foundation.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>03</span>

                <h3>Requirement Analysis</h3>

                <p>
                  Defined functional and non-functional requirements, identified
                  system users, and established the overall project scope.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>04</span>

                <h3>System Design</h3>

                <p>
                  Designed the database, software architecture, user interfaces,
                  artificial intelligence workflow, and semantic search
                  framework.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>05</span>

                <h3>Data Collection</h3>

                <p>
                  Gathered Philippine Supreme Court decisions, organized
                  datasets, prepared legal documents, and structured metadata
                  for processing.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>06</span>

                <h3>AI Model Development</h3>

                <p>
                  Applied Natural Language Processing, semantic embeddings,
                  vector databases, and legal argument mining techniques to
                  build the intelligent search engine.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>07</span>

                <h3>System Development</h3>

                <p>
                  Developed both the administrator and public interfaces,
                  backend services, authentication, semantic search, and
                  AI-powered legal analysis.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>08</span>

                <h3>Testing and Validation</h3>

                <p>
                  Conducted functionality testing, compatibility testing,
                  performance evaluation, and system validation to ensure
                  reliability and usability.
                </p>
              </div>
            </article>

            <article className="roadmap-item completed">
              <div className="roadmap-marker">
                <CheckCircle2 size={18} />
              </div>

              <div className="roadmap-content">
                <span>09</span>

                <h3>Deployment</h3>

                <p>
                  Prepared the production environment, configured databases,
                  deployed AI services, and published the web application.
                </p>
              </div>
            </article>

            <article className="roadmap-item active">
              <div className="roadmap-marker">
                <Rocket size={18} />
              </div>

              <div className="roadmap-content">
                <span>10</span>

                <h3>Future Enhancements</h3>

                <p>
                  Continue improving semantic search, expand legal datasets,
                  enhance AI-generated legal analysis, and introduce additional
                  research tools for legal professionals and students.
                </p>
              </div>
            </article>
          </div>

          <div className="roadmap-progress">
            <div className="roadmap-progress-info">
              <strong>Development Progress</strong>

              <span>Complete Research Lifecycle</span>
            </div>

            <div className="roadmap-progress-bar">
              <span
                style={{
                  width: "100%",
                }}
              />
            </div>
          </div>
        </section>

        {/* ===============================================
            RESPONSIBLE USE NOTICE
        =============================================== */}

        <section className="landing-responsible-use">
          <div className="responsible-use-icon">
            <ShieldCheck size={26} />
          </div>

          <div>
            <span>Responsible Legal Research</span>

            <h2>
              AI-generated information must be verified against the official
              decision
            </h2>

            <p>
              LexMiner is a legal research support system. Generated summaries,
              extracted arguments, similarity results, and highlighted sections
              should not be treated as legal advice or as a replacement for
              reading the complete official Philippine Supreme Court decision.
            </p>
          </div>
        </section>

        {/* ===============================================
            FINAL CALL TO ACTION
        =============================================== */}

        <section className="landing-final-cta">
          <div className="final-cta-background">
            <div className="final-cta-grid" />

            <div className="final-cta-orb final-cta-orb-one" />

            <div className="final-cta-orb final-cta-orb-two" />
          </div>

          <div className="final-cta-copy">
            <div className="final-cta-label">
              <Sparkles size={16} />
              Intelligent jurisprudence discovery
            </div>

            <h2>
              Begin exploring Philippine Supreme Court decisions with LexMiner
            </h2>

            <p>
              Search by legal issue, factual situation, doctrine, or dispute and
              discover decisions through semantic similarity and AI-assisted
              legal analysis.
            </p>

            <div className="final-cta-actions">
              <button
                type="button"
                className="landing-primary-button"
                onClick={openCaseDecisions}
              >
                <Search size={19} />
                Explore Case Decisions
                <ArrowRight size={18} />
              </button>

              {!isRegistered && (
                <button
                  type="button"
                  className="landing-secondary-button"
                  onClick={() => setLoginModalOpen(true)}
                >
                  <LogIn size={19} />
                  Sign In
                </button>
              )}

              {isRegistered && (
                <button
                  type="button"
                  className="landing-secondary-button"
                  onClick={openBookmarks}
                >
                  <BookMarked size={19} />
                  View Bookmarks
                </button>
              )}
            </div>
          </div>

          <div className="final-cta-visual">
            <div className="final-cta-core">
              <BrainCircuit size={54} />

              <span />
            </div>

            <div className="final-cta-chip final-chip-one">
              <Search size={16} />
              Semantic Search
            </div>

            <div className="final-cta-chip final-chip-two">
              <Gavel size={16} />
              Legal Reasoning
            </div>

            <div className="final-cta-chip final-chip-three">
              <FileText size={16} />
              Case Decisions
            </div>
          </div>
        </section>
      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <div className="footer-brand-heading">
              <img src={lexminerLogo} alt="LexMiner logo" />

              <div>
                <strong>LexMiner</strong>

                <span>Legal Intelligence</span>
              </div>
            </div>

            <p>
              AI Adaptive Language Case Decision Miner for semantic legal
              research and argument mining in Philippine Supreme Court
              decisions.
            </p>

            <div className="footer-system-status">
              <span />
              Legal research services operational
            </div>
          </div>

          <div className="landing-footer-column">
            <h3>Explore</h3>

            <button type="button" onClick={() => scrollToSection("home")}>
              Home
            </button>

            <button type="button" onClick={() => scrollToSection("challenge")}>
              The Challenge
            </button>

            <button type="button" onClick={() => scrollToSection("process")}>
              Our Process
            </button>

            <button type="button" onClick={() => scrollToSection("impact")}>
              Impact
            </button>
          </div>

          <div className="landing-footer-column">
            <h3>Research</h3>

            <button type="button" onClick={openCaseDecisions}>
              Case Decisions
            </button>

            <button type="button" onClick={openBookmarks}>
              Bookmarks
            </button>

            {!isRegistered && (
              <button type="button" onClick={() => setLoginModalOpen(true)}>
                Sign In
              </button>
            )}

            {!isRegistered && (
              <button type="button" onClick={openRegistration}>
                Create Account
              </button>
            )}
          </div>

          <div className="landing-footer-column">
            <h3>Access</h3>

            <div className="footer-access-item">
              <Globe2 size={17} />

              <div>
                <strong>Guest Access</strong>

                <span>Search and read decisions</span>
              </div>
            </div>

            <div className="footer-access-item">
              <CircleUserRound size={17} />

              <div>
                <strong>Registered Access</strong>

                <span>Bookmarks</span>
              </div>
            </div>

            <div className="footer-access-item">
              <ShieldCheck size={17} />

              <div>
                <strong>Secure Authentication</strong>

                <span>Local and Google sign-in</span>
              </div>
            </div>
          </div>
        </div>

        <div className="landing-footer-bottom">
          <div>
            <span>LexMiner Research Portal</span>

            <small>Philippine Supreme Court Decision Intelligence</small>
          </div>

          <p>
            © 2026 LexMiner AI Adaptive Language Case Decision Miner. All rights
            reserved.
          </p>
        </div>
      </footer>

      {/* =================================================
          LOGIN MODAL
      ================================================= */}

      {loginModalOpen && (
        <div
          className="landing-modal-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !loginLoading) {
              setLoginModalOpen(false);
            }
          }}
        >
          <div
            className="landing-login-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="landing-login-title"
          >
            <button
              type="button"
              className="landing-modal-close"
              onClick={() => setLoginModalOpen(false)}
              disabled={loginLoading}
              aria-label="Close login modal"
            >
              <X size={20} />
            </button>

            <div className="landing-modal-brand">
              <div className="landing-modal-logo">
                <img src={lexminerLogo} alt="LexMiner" />

                <span />
              </div>

              <div>
                <span className="landing-modal-eyebrow">
                  Secure research access
                </span>

                <h2 id="landing-login-title">Welcome to LexMiner</h2>

                <p>
                  Sign in to save case decisions, maintain bookmarks, and
                  preserve your legal research activity.
                </p>
              </div>
            </div>

            {error && (
              <div className="landing-modal-error">
                <AlertCircle size={18} />

                <span>{error}</span>

                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Close login error"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* =========================================
                GOOGLE LOGIN PLACEHOLDER
            ========================================= */}

            <div className="landing-google-login-area">
              <button
                type="button"
                className="landing-google-button"
                disabled={loginLoading}
                onClick={() => {
                  setError(
                    "Connect the Google Identity Services button here and pass its credential to handleGoogleCredential().",
                  );
                }}
              >
                <Globe2 size={19} />
                Continue with Google
              </button>
            </div>

            <div className="landing-login-divider">
              <span>or sign in with email</span>
            </div>

            {/* =========================================
                LOCAL LOGIN FORM
            ========================================= */}

            <form
              className="landing-login-form"
              onSubmit={handleLocalLogin}
              noValidate
            >
              <div className="landing-login-field">
                <label htmlFor="landing-login-email">Email Address</label>

                <div className="landing-login-input">
                  <Mail size={18} />

                  <input
                    id="landing-login-email"
                    name="email"
                    type="email"
                    value={loginForm.email}
                    onChange={handleLoginFieldChange}
                    placeholder="Enter your email address"
                    autoComplete="email"
                    disabled={loginLoading}
                  />
                </div>
              </div>

              <div className="landing-login-field">
                <label htmlFor="landing-login-password">Password</label>

                <div className="landing-login-input">
                  <LockKeyhole size={18} />

                  <input
                    id="landing-login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={loginForm.password}
                    onChange={handleLoginFieldChange}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loginLoading}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    disabled={loginLoading}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="landing-submit-login"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <LoaderCircle size={19} className="spin-icon" />
                ) : (
                  <LogIn size={19} />
                )}

                {loginLoading ? "Signing In..." : "Sign In to LexMiner"}
              </button>
            </form>

            {/* =========================================
                GUEST ACCESS
            ========================================= */}

            <div className="landing-guest-access">
              <div className="landing-guest-access-copy">
                <div className="landing-guest-access-icon">
                  <Globe2 size={21} />
                </div>

                <div>
                  <strong>Continue without an account</strong>

                  <span>
                    Guests can search and read case decisions but cannot save
                    bookmarks.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinueAsGuest}
                disabled={loginLoading}
              >
                Continue as Guest
                <ArrowRight size={17} />
              </button>
            </div>

            {/* =========================================
                REGISTRATION LINK
            ========================================= */}

            <div className="landing-registration-prompt">
              <div>
                <UserPlus size={18} />

                <span>Do not have a registered account?</span>
              </div>

              <button
                type="button"
                onClick={openRegistration}
                disabled={loginLoading}
              >
                Create Account
              </button>
            </div>

            <div className="landing-modal-security">
              <Fingerprint size={17} />

              <span>
                Authentication is protected using secure JWT access and refresh
                tokens.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
