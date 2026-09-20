import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  Mail,
  RefreshCcw,
  ShieldCheck,
  UserRoundPlus,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";

import {
  completeRegistration,
  getAuthErrorMessage,
  loginUser,
  loginUserWithGoogle,
  requestRegistrationOTP,
  resendRegistrationOTP,
  verifyRegistrationOTP,
} from "../../services/userAuthService";

import "../../styles/user-authentication.css";

/* =========================================================
   AUTHENTICATION MODES
========================================================= */

const AUTH_MODE = {
  REGISTER: "REGISTER",
  LOGIN: "LOGIN",
};

/* =========================================================
   REGISTRATION STEPS
========================================================= */

const REGISTRATION_STEP = {
  EMAIL: 1,
  OTP: 2,
  PROFILE: 3,
  PASSWORD: 4,
  SUCCESS: 5,
};

/* =========================================================
   REGISTRATION PASSWORD SPECIAL CHARACTERS
========================================================= */

const REGISTRATION_SPECIAL_CHARACTERS = `!@#$%^&*(),.?":{}|<>_-+=[]\\;/'`;

/* =========================================================
   DEFAULT REGISTRATION FORM
========================================================= */

const DEFAULT_REGISTRATION_FORM = {
  email: "",
  firstName: "",
  lastName: "",
  password: "",
  confirmPassword: "",
};

/* =========================================================
   DEFAULT LOGIN FORM
========================================================= */

const DEFAULT_LOGIN_FORM = {
  email: "",
  password: "",
  rememberMe: false,
};

/* =========================================================
   OTP CONFIGURATION
========================================================= */

const OTP_LENGTH = 6;

const DEFAULT_OTP_VALUES = Array(OTP_LENGTH).fill("");

/* =========================================================
   INITIAL LOADING PREVIEW STEPS
========================================================= */

const INITIAL_LOADING_STEPS = [
  {
    id: 1,
    label: "Initializing secure authentication",
  },
  {
    id: 2,
    label: "Connecting email verification services",
  },
  {
    id: 3,
    label: "Loading account security rules",
  },
  {
    id: 4,
    label: "Preparing LexMiner access",
  },
];

/* =========================================================
   REGISTRATION STEPPER CONFIGURATION
========================================================= */

const REGISTRATION_STEPS = [
  {
    number: REGISTRATION_STEP.EMAIL,
    title: "Email",
    shortTitle: "Email",
    description: "Verify your email address",
    icon: Mail,
  },
  {
    number: REGISTRATION_STEP.OTP,
    title: "Verification",
    shortTitle: "OTP",
    description: "Enter the secure code",
    icon: Fingerprint,
  },
  {
    number: REGISTRATION_STEP.PROFILE,
    title: "Profile",
    shortTitle: "Profile",
    description: "Tell us your name",
    icon: CircleUserRound,
  },
  {
    number: REGISTRATION_STEP.PASSWORD,
    title: "Password",
    shortTitle: "Password",
    description: "Secure your account",
    icon: LockKeyhole,
  },
];

/* =========================================================
   REQUEST LOADING LABELS
========================================================= */

const REQUEST_LOADING_LABELS = {
  REQUEST_OTP: {
    title: "Sending verification code",
    description: "LexMiner is preparing a secure six-digit verification code.",
  },

  VERIFY_OTP: {
    title: "Verifying your email",
    description: "Please wait while the verification code is validated.",
  },

  RESEND_OTP: {
    title: "Sending a new code",
    description: "A fresh verification code is being delivered to your email.",
  },

  COMPLETE_REGISTRATION: {
    title: "Creating your LexMiner account",
    description:
      "Your verified profile and secure credentials are being saved.",
  },

  LOGIN: {
    title: "Signing in securely",
    description:
      "LexMiner is validating your credentials and preparing your session.",
  },

  GOOGLE_LOGIN: {
    title: "Connecting with Google",
    description: "Your Google identity is being securely verified.",
  },
};

/* =========================================================
   EMAIL VALIDATION
========================================================= */

function isValidEmail(value) {
  const normalizedValue = String(value || "").trim();

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedValue);
}

/* =========================================================
   NAME VALIDATION
========================================================= */

function isValidName(value) {
  const normalizedValue = String(value || "")
    .trim()
    .replace(/\s+/g, " ");

  if (normalizedValue.length < 2 || normalizedValue.length > 100) {
    return false;
  }

  return /^[A-Za-zÀ-ÖØ-öø-ÿÑñ' .-]+$/.test(normalizedValue);
}

/* =========================================================
   COUNTDOWN FORMATTER
========================================================= */

function formatCountdown(totalSeconds) {
  const safeSeconds = Math.max(Number(totalSeconds) || 0, 0);

  const minutes = Math.floor(safeSeconds / 60);

  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

/* =========================================================
   PASSWORD CHECKS
========================================================= */

function getPasswordChecks(password) {
  const value = String(password || "");

  return {
    minimumLength: value.length >= 8,

    maximumLength: value.length <= 128,

    uppercase: /[A-Z]/.test(value),

    lowercase: /[a-z]/.test(value),

    number: /\d/.test(value),

    special: Array.from(value).some((character) =>
      REGISTRATION_SPECIAL_CHARACTERS.includes(character),
    ),

    noSpaces: !/\s/.test(value),
  };
}

/* =========================================================
   PASSWORD STRENGTH
========================================================= */

function getPasswordStrength(password) {
  const value = String(password || "");

  const checks = getPasswordChecks(value);

  if (!value) {
    return {
      label: "No password entered",

      level: 0,

      percentage: 0,

      className: "password-strength-empty",

      checks,

      allPassed: false,
    };
  }

  const scoredChecks = [
    checks.minimumLength,
    checks.uppercase,
    checks.lowercase,
    checks.number,
    checks.special,
    checks.noSpaces,
  ];

  const passedCount = scoredChecks.filter(Boolean).length;

  let label = "Weak";

  let level = 1;

  let percentage = 20;

  let className = "password-strength-weak";

  if (passedCount >= 3) {
    label = "Fair";

    level = 2;

    percentage = 40;

    className = "password-strength-fair";
  }

  if (passedCount >= 4) {
    label = "Good";

    level = 3;

    percentage = 60;

    className = "password-strength-good";
  }

  if (passedCount >= 5) {
    label = "Strong";

    level = 4;

    percentage = 80;

    className = "password-strength-strong";
  }

  if (passedCount === 6 && checks.maximumLength) {
    label = "Very Strong";

    level = 5;

    percentage = 100;

    className = "password-strength-excellent";
  }

  const allPassed =
    checks.minimumLength &&
    checks.maximumLength &&
    checks.uppercase &&
    checks.lowercase &&
    checks.number &&
    checks.special &&
    checks.noSpaces;

  return {
    label,
    level,
    percentage,
    className,
    checks,
    allPassed,
  };
}

/* =========================================================
   BACKEND FIELD ERROR EXTRACTOR
========================================================= */

function getFieldValidationErrors(error) {
  const detail = error?.response?.data?.detail;

  if (!Array.isArray(detail)) {
    return {};
  }

  const errors = {};

  detail.forEach((item) => {
    const location = Array.isArray(item?.loc) ? item.loc : [];

    const fieldName = location[location.length - 1];

    if (typeof fieldName === "string") {
      errors[fieldName] = item?.msg || "Invalid value.";
    }
  });

  return errors;
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function UserAuthenticationPage() {
  const navigate = useNavigate();

  /* =======================================================
     ROLE-BASED REDIRECTION

     ADMIN:
     /admin/dashboard

     REGISTERED USER:
     /
  ======================================================= */

  const redirectAuthenticatedAccount = useCallback(
    (user) => {
      const role = String(user?.role || "")
        .trim()
        .toLowerCase();

      if (role === "admin") {
        navigate("/admin/dashboard", {
          replace: true,
        });

        return;
      }

      navigate("/", {
        replace: true,
      });
    },
    [navigate],
  );

  /* =======================================================
     PAGE PREVIEW LOADING
  ======================================================= */

  const [initialLoading, setInitialLoading] = useState(true);

  const [loadingStep, setLoadingStep] = useState(0);

  /* =======================================================
     AUTHENTICATION MODE
  ======================================================= */

  const [authMode, setAuthMode] = useState(AUTH_MODE.REGISTER);

  const [cardFlipping, setCardFlipping] = useState(false);

  /* =======================================================
     REGISTRATION STATE
  ======================================================= */

  const [registrationStep, setRegistrationStep] = useState(
    REGISTRATION_STEP.EMAIL,
  );

  const [registrationForm, setRegistrationForm] = useState(
    DEFAULT_REGISTRATION_FORM,
  );

  const [registrationId, setRegistrationId] = useState(null);

  const [maskedEmail, setMaskedEmail] = useState("");

  const [registeredUser, setRegisteredUser] = useState(null);

  /* =======================================================
     OTP STATE
  ======================================================= */

  const [otpValues, setOtpValues] = useState(DEFAULT_OTP_VALUES);

  const otpInputRefs = useRef([]);

  const [otpExpiresIn, setOtpExpiresIn] = useState(0);

  const [resendAvailableIn, setResendAvailableIn] = useState(0);

  const [otpExpired, setOtpExpired] = useState(false);

  /* =======================================================
     LOGIN STATE
  ======================================================= */

  const [loginForm, setLoginForm] = useState(DEFAULT_LOGIN_FORM);

  /* =======================================================
     PASSWORD VISIBILITY
  ======================================================= */

  const [showRegistrationPassword, setShowRegistrationPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showLoginPassword, setShowLoginPassword] = useState(false);

  /* =======================================================
     REQUEST STATUS
  ======================================================= */

  const [requestLoading, setRequestLoading] = useState(false);

  const [requestLoadingType, setRequestLoadingType] = useState(null);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [fieldErrors, setFieldErrors] = useState({});

  const [lockedAccountMessage, setLockedAccountMessage] = useState("");

  /* =======================================================
     PASSWORD STRENGTH
  ======================================================= */

  const passwordStrength = useMemo(
    () => getPasswordStrength(registrationForm.password),
    [registrationForm.password],
  );

  /* =======================================================
     COMPLETE OTP VALUE
  ======================================================= */

  const completeOtp = useMemo(() => otpValues.join(""), [otpValues]);

  const isOtpComplete =
    completeOtp.length === OTP_LENGTH && /^\d{6}$/.test(completeOtp);

  /* =======================================================
     CURRENT LOADING CONTENT
  ======================================================= */

  const currentRequestLoading = useMemo(() => {
    if (!requestLoadingType) {
      return null;
    }

    return REQUEST_LOADING_LABELS[requestLoadingType] || null;
  }, [requestLoadingType]);
  /* =======================================================
     INITIALIZE GOOGLE IDENTITY SERVICES
  ======================================================= */

  useEffect(() => {
    if (initialLoading || authMode !== AUTH_MODE.LOGIN) {
      return undefined;
    }

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    if (!clientId) {
      return undefined;
    }

    let cancelled = false;

    let redirectTimer = null;

    async function processGoogleCredential(credentialResponse) {
      const credential = credentialResponse?.credential;

      if (!credential) {
        setError("Google did not return a valid credential.");

        return;
      }

      setRequestLoadingType("GOOGLE_LOGIN");

      setRequestLoading(true);

      setError("");

      setNotice("");

      setLockedAccountMessage("");

      try {
        const result = await loginUserWithGoogle({
          credential,

          rememberMe: loginForm.rememberMe,
        });

        if (cancelled) {
          return;
        }

        const user = result?.user;

        if (!user) {
          throw new Error(
            "Google authentication did not return user information.",
          );
        }

        redirectTimer = window.setTimeout(() => {
          if (!cancelled) {
            redirectAuthenticatedAccount(user);
          }
        }, 250);
      } catch (requestError) {
        if (cancelled) {
          return;
        }

        const status = requestError?.response?.status;

        const message = getAuthErrorMessage(requestError);

        const backendFieldErrors = getFieldValidationErrors(requestError);

        setFieldErrors(backendFieldErrors);

        if (status === 423) {
          setLockedAccountMessage(message);

          setError("");
        } else {
          setLockedAccountMessage("");

          setError(message);
        }
      } finally {
        if (!cancelled) {
          setRequestLoading(false);

          setRequestLoadingType(null);
        }
      }
    }

    function initializeGoogle() {
      if (cancelled || !window.google?.accounts?.id) {
        return;
      }

      const googleButton = document.getElementById(
        "lexminer-google-login-button",
      );

      if (!googleButton) {
        return;
      }

      googleButton.innerHTML = "";

      window.google.accounts.id.initialize({
        client_id: clientId,

        callback: processGoogleCredential,

        auto_select: false,

        cancel_on_tap_outside: true,
      });

      window.google.accounts.id.renderButton(googleButton, {
        type: "standard",

        theme: "outline",

        size: "large",

        text: "continue_with",

        shape: "rectangular",

        logo_alignment: "left",

        width: googleButton.clientWidth || 340,
      });
    }

    if (window.google?.accounts?.id) {
      initializeGoogle();

      return () => {
        cancelled = true;

        if (redirectTimer) {
          window.clearTimeout(redirectTimer);
        }
      };
    }

    const scriptSource = "https://accounts.google.com/gsi/client";

    const existingScript = document.querySelector(
      `script[src="${scriptSource}"]`,
    );

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle);

      return () => {
        cancelled = true;

        existingScript.removeEventListener("load", initializeGoogle);

        if (redirectTimer) {
          window.clearTimeout(redirectTimer);
        }
      };
    }

    const script = document.createElement("script");

    script.src = scriptSource;

    script.async = true;

    script.defer = true;

    function handleGoogleScriptError() {
      if (!cancelled) {
        setError("Google Sign-In could not be loaded.");
      }
    }

    script.addEventListener("load", initializeGoogle);

    script.addEventListener("error", handleGoogleScriptError);

    document.head.appendChild(script);

    return () => {
      cancelled = true;

      script.removeEventListener("load", initializeGoogle);

      script.removeEventListener("error", handleGoogleScriptError);

      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [
    authMode,
    initialLoading,
    loginForm.rememberMe,
    redirectAuthenticatedAccount,
  ]);

  /* =======================================================
     INITIAL PAGE PREVIEW
  ======================================================= */

  useEffect(() => {
    if (!initialLoading) {
      return undefined;
    }

    const stepTimer = window.setInterval(() => {
      setLoadingStep((current) => {
        if (current >= INITIAL_LOADING_STEPS.length - 1) {
          window.clearInterval(stepTimer);

          return current;
        }

        return current + 1;
      });
    }, 380);

    const finishTimer = window.setTimeout(() => {
      setInitialLoading(false);
    }, 1900);

    return () => {
      window.clearInterval(stepTimer);

      window.clearTimeout(finishTimer);
    };
  }, [initialLoading]);

  /* =======================================================
     OTP EXPIRATION TIMER
  ======================================================= */

  useEffect(() => {
    if (registrationStep !== REGISTRATION_STEP.OTP || otpExpiresIn <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setOtpExpiresIn((current) => {
        if (current <= 1) {
          window.clearInterval(timer);

          setOtpExpired(true);

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [registrationStep, otpExpiresIn]);

  /* =======================================================
     RESEND COOLDOWN TIMER
  ======================================================= */

  useEffect(() => {
    if (registrationStep !== REGISTRATION_STEP.OTP || resendAvailableIn <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setResendAvailableIn((current) => {
        if (current <= 1) {
          window.clearInterval(timer);

          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [registrationStep, resendAvailableIn]);

  /* =======================================================
     NOTICE AUTO-HIDE
  ======================================================= */

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  /* =======================================================
     ERROR AUTO-HIDE
  ======================================================= */

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError("");
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [error]);

  /* =======================================================
     ESCAPE KEY HANDLER
  ======================================================= */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      setError("");

      setNotice("");

      setLockedAccountMessage("");
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  /* =======================================================
     CHANGE AUTHENTICATION MODE
  ======================================================= */

  const changeAuthMode = useCallback(
    (nextMode, options = {}) => {
      const { preserveEmail = true } = options;

      if (nextMode === authMode || cardFlipping || requestLoading) {
        return;
      }

      setCardFlipping(true);

      setError("");

      setNotice("");

      setFieldErrors({});

      setLockedAccountMessage("");

      if (nextMode === AUTH_MODE.LOGIN) {
        setLoginForm((current) => ({
          ...DEFAULT_LOGIN_FORM,

          email: preserveEmail ? registrationForm.email || current.email : "",
        }));
      }

      if (nextMode === AUTH_MODE.REGISTER) {
        setRegistrationForm((current) => ({
          ...current,

          email: preserveEmail
            ? loginForm.email || current.email
            : current.email,
        }));
      }

      window.setTimeout(() => {
        setAuthMode(nextMode);

        setCardFlipping(false);
      }, 320);
    },
    [
      authMode,
      cardFlipping,
      loginForm.email,
      registrationForm.email,
      requestLoading,
    ],
  );

  /* =======================================================
     RESET REGISTRATION
  ======================================================= */

  const resetRegistration = useCallback(
    ({ preserveEmail = false } = {}) => {
      const currentEmail = registrationForm.email;

      setRegistrationStep(REGISTRATION_STEP.EMAIL);

      setRegistrationForm({
        ...DEFAULT_REGISTRATION_FORM,

        email: preserveEmail ? currentEmail : "",
      });

      setRegistrationId(null);

      setMaskedEmail("");

      setRegisteredUser(null);

      setOtpValues(Array(OTP_LENGTH).fill(""));

      setOtpExpiresIn(0);

      setResendAvailableIn(0);

      setOtpExpired(false);

      setFieldErrors({});

      setError("");

      setNotice("");

      setShowRegistrationPassword(false);

      setShowConfirmPassword(false);
    },
    [registrationForm.email],
  );

  /* =======================================================
     REGISTRATION FIELD CHANGE
  ======================================================= */

  function handleRegistrationFieldChange(event) {
    const { name, value } = event.target;

    setRegistrationForm((current) => ({
      ...current,

      [name]: value,
    }));

    setFieldErrors((current) => ({
      ...current,

      [name]: "",
    }));

    setError("");
  }

  /* =======================================================
     LOGIN FIELD CHANGE
  ======================================================= */

  function handleLoginFieldChange(event) {
    const { name, value, type, checked } = event.target;

    setLoginForm((current) => ({
      ...current,

      [name]: type === "checkbox" ? checked : value,
    }));

    setFieldErrors((current) => ({
      ...current,

      [name]: "",
    }));

    setError("");

    setLockedAccountMessage("");
  }

  /* =======================================================
     BEGIN REQUEST LOADING
  ======================================================= */

  function beginRequestLoading(loadingType) {
    setRequestLoadingType(loadingType);

    setRequestLoading(true);

    setError("");

    setNotice("");
  }

  /* =======================================================
     END REQUEST LOADING
  ======================================================= */

  function endRequestLoading() {
    setRequestLoading(false);

    setRequestLoadingType(null);
  }

  /* =======================================================
     REQUEST ERROR HANDLER
  ======================================================= */

  function handleRequestError(requestError) {
    const status = requestError?.response?.status;

    const message = getAuthErrorMessage(requestError);

    const backendFieldErrors = getFieldValidationErrors(requestError);

    setFieldErrors(backendFieldErrors);

    if (status === 423) {
      setLockedAccountMessage(message);

      setError("");

      return;
    }

    setLockedAccountMessage("");

    setError(message);
  }

  /* =======================================================
     GO TO PREVIOUS REGISTRATION STEP
  ======================================================= */

  function goToPreviousRegistrationStep() {
    if (requestLoading) {
      return;
    }

    setError("");

    setNotice("");

    setFieldErrors({});

    if (registrationStep === REGISTRATION_STEP.OTP) {
      setRegistrationStep(REGISTRATION_STEP.EMAIL);

      setOtpValues(Array(OTP_LENGTH).fill(""));

      return;
    }

    if (registrationStep === REGISTRATION_STEP.PROFILE) {
      setRegistrationStep(REGISTRATION_STEP.OTP);

      return;
    }

    if (registrationStep === REGISTRATION_STEP.PASSWORD) {
      setRegistrationStep(REGISTRATION_STEP.PROFILE);
    }
  }

  /* =======================================================
     RETURN TO LANDING PAGE
  ======================================================= */

  function handleReturnToLanding() {
    navigate("/", {
      replace: false,
    });
  }
  /* =======================================================
     STEP 1 — REQUEST REGISTRATION OTP
  ======================================================= */

  async function handleRequestOtp(event) {
    event.preventDefault();

    if (requestLoading) {
      return;
    }

    const normalizedEmail = String(registrationForm.email || "")
      .trim()
      .toLowerCase();

    const validationErrors = {};

    if (!normalizedEmail) {
      validationErrors.email = "Enter your email address.";
    } else if (!isValidEmail(normalizedEmail)) {
      validationErrors.email = "Enter a valid email address.";
    }

    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    beginRequestLoading("REQUEST_OTP");

    try {
      const result = await requestRegistrationOTP(normalizedEmail);

      setRegistrationForm((current) => ({
        ...current,

        email: normalizedEmail,
      }));

      setRegistrationId(result?.registration_id || null);

      setMaskedEmail(result?.masked_email || normalizedEmail);

      setOtpExpiresIn(Number(result?.expires_in_seconds) || 300);

      setResendAvailableIn(Number(result?.resend_available_in_seconds) || 60);

      setOtpExpired(false);

      setOtpValues(Array(OTP_LENGTH).fill(""));

      setRegistrationStep(REGISTRATION_STEP.OTP);

      setNotice(
        result?.message || "A verification code was sent to your email.",
      );

      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 200);
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      endRequestLoading();
    }
  }

  /* =======================================================
     OTP INPUT CHANGE
  ======================================================= */

  function handleOtpChange(index, rawValue) {
    if (requestLoading) {
      return;
    }

    const normalizedValue = String(rawValue || "")
      .replace(/\D/g, "")
      .slice(0, 1);

    setOtpValues((current) => {
      const nextValues = [...current];

      nextValues[index] = normalizedValue;

      return nextValues;
    });

    setError("");

    setFieldErrors((current) => ({
      ...current,

      otp: "",
    }));

    if (normalizedValue && index < OTP_LENGTH - 1) {
      window.setTimeout(() => {
        otpInputRefs.current[index + 1]?.focus();
      }, 0);
    }
  }

  /* =======================================================
     OTP KEYBOARD NAVIGATION
  ======================================================= */

  function handleOtpKeyDown(index, event) {
    if (event.key === "Backspace" && !otpValues[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();

      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();

      otpInputRefs.current[index - 1]?.focus();

      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();

      otpInputRefs.current[index + 1]?.focus();

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (isOtpComplete) {
        handleVerifyOtp(event);
      }
    }
  }

  /* =======================================================
     OTP PASTE HANDLER
  ======================================================= */

  function handleOtpPaste(event) {
    event.preventDefault();

    if (requestLoading) {
      return;
    }

    const pastedValue = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pastedValue) {
      return;
    }

    const nextValues = Array(OTP_LENGTH).fill("");

    pastedValue.split("").forEach((value, index) => {
      nextValues[index] = value;
    });

    setOtpValues(nextValues);

    setError("");

    setFieldErrors((current) => ({
      ...current,

      otp: "",
    }));

    const nextFocusIndex = Math.min(pastedValue.length, OTP_LENGTH - 1);

    window.setTimeout(() => {
      otpInputRefs.current[nextFocusIndex]?.focus();
    }, 0);
  }

  /* =======================================================
     STEP 2 — VERIFY REGISTRATION OTP
  ======================================================= */

  async function handleVerifyOtp(event) {
    event.preventDefault();

    if (requestLoading) {
      return;
    }

    const validationErrors = {};

    if (!registrationId) {
      setError(
        "The registration session is missing. Please restart registration.",
      );

      return;
    }

    if (otpExpired) {
      validationErrors.otp =
        "The verification code has expired. Request a new code.";
    } else if (!isOtpComplete) {
      validationErrors.otp = "Enter the complete six-digit verification code.";
    }

    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    beginRequestLoading("VERIFY_OTP");

    try {
      const result = await verifyRegistrationOTP({
        registrationId,

        otp: completeOtp,
      });

      setNotice(result?.message || "Email verified successfully.");

      setRegistrationStep(REGISTRATION_STEP.PROFILE);
    } catch (requestError) {
      handleRequestError(requestError);

      setOtpValues(Array(OTP_LENGTH).fill(""));

      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } finally {
      endRequestLoading();
    }
  }

  /* =======================================================
     RESEND REGISTRATION OTP
  ======================================================= */

  async function handleResendOtp() {
    if (requestLoading || resendAvailableIn > 0 || !registrationId) {
      return;
    }

    beginRequestLoading("RESEND_OTP");

    try {
      const result = await resendRegistrationOTP(registrationId);

      setOtpExpiresIn(Number(result?.expires_in_seconds) || 300);

      setResendAvailableIn(Number(result?.resend_available_in_seconds) || 60);

      setOtpExpired(false);

      setOtpValues(Array(OTP_LENGTH).fill(""));

      setNotice(result?.message || "A new verification code was sent.");

      window.setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 200);
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      endRequestLoading();
    }
  }

  /* =======================================================
     STEP 3 — PROFILE VALIDATION
  ======================================================= */

  function handleProfileSubmit(event) {
    event.preventDefault();

    if (requestLoading) {
      return;
    }

    const firstName = String(registrationForm.firstName || "")
      .trim()
      .replace(/\s+/g, " ");

    const lastName = String(registrationForm.lastName || "")
      .trim()
      .replace(/\s+/g, " ");

    const validationErrors = {};

    if (!firstName) {
      validationErrors.firstName = "Enter your first name.";
    } else if (!isValidName(firstName)) {
      validationErrors.firstName =
        "Enter a valid first name using letters, spaces, apostrophes, periods, or hyphens.";
    }

    if (!lastName) {
      validationErrors.lastName = "Enter your last name.";
    } else if (!isValidName(lastName)) {
      validationErrors.lastName =
        "Enter a valid last name using letters, spaces, apostrophes, periods, or hyphens.";
    }

    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setRegistrationForm((current) => ({
      ...current,

      firstName,

      lastName,
    }));

    setRegistrationStep(REGISTRATION_STEP.PASSWORD);

    setError("");

    setNotice("");
  }

  /* =======================================================
     STEP 4 — PASSWORD VALIDATION
  ======================================================= */

  function validateRegistrationPasswordForm() {
    const validationErrors = {};

    if (!registrationForm.password) {
      validationErrors.password = "Enter a password.";
    } else if (!passwordStrength.allPassed) {
      validationErrors.password =
        "Your password must satisfy all security requirements.";
    }

    if (!registrationForm.confirmPassword) {
      validationErrors.confirmPassword = "Confirm your password.";
    } else if (registrationForm.password !== registrationForm.confirmPassword) {
      validationErrors.confirmPassword = "The passwords do not match.";
    }

    setFieldErrors(validationErrors);

    return Object.keys(validationErrors).length === 0;
  }

  /* =======================================================
     COMPLETE REGISTRATION
  ======================================================= */

  async function handleCompleteRegistration(event) {
    event.preventDefault();

    if (requestLoading) {
      return;
    }

    if (!registrationId) {
      setError(
        "The registration session is missing. Please restart registration.",
      );

      return;
    }

    if (!validateRegistrationPasswordForm()) {
      return;
    }

    beginRequestLoading("COMPLETE_REGISTRATION");

    try {
      const result = await completeRegistration({
        registrationId,

        firstName: registrationForm.firstName,

        lastName: registrationForm.lastName,

        password: registrationForm.password,

        confirmPassword: registrationForm.confirmPassword,
      });

      setRegisteredUser({
        id: result?.user_id || null,

        email: result?.email || registrationForm.email,

        first_name: result?.first_name || registrationForm.firstName,

        last_name: result?.last_name || registrationForm.lastName,
      });

      setRegistrationStep(REGISTRATION_STEP.SUCCESS);

      setNotice(
        result?.message || "Your LexMiner account was created successfully.",
      );
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      endRequestLoading();
    }
  }

  /* =======================================================
     SWITCH SUCCESS VIEW TO LOGIN
  ======================================================= */

  function handleRegistrationSuccessLogin() {
    setLoginForm({
      ...DEFAULT_LOGIN_FORM,

      email: registeredUser?.email || registrationForm.email,
    });

    changeAuthMode(AUTH_MODE.LOGIN, {
      preserveEmail: true,
    });
  }

  /* =======================================================
     LOCAL LOGIN
  ======================================================= */

  async function handleLoginSubmit(event) {
    event.preventDefault();

    if (requestLoading) {
      return;
    }

    const normalizedEmail = String(loginForm.email || "")
      .trim()
      .toLowerCase();

    const validationErrors = {};

    if (!normalizedEmail) {
      validationErrors.email = "Enter your email address.";
    } else if (!isValidEmail(normalizedEmail)) {
      validationErrors.email = "Enter a valid email address.";
    }

    if (!loginForm.password) {
      validationErrors.password = "Enter your password.";
    }

    setFieldErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    beginRequestLoading("LOGIN");

    try {
      const result = await loginUser({
        email: normalizedEmail,

        password: loginForm.password,

        rememberMe: loginForm.rememberMe,
      });

      const user = result?.user;

      if (!user) {
        throw new Error(
          "The authentication response did not contain user information.",
        );
      }

      redirectAuthenticatedAccount(user);
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      endRequestLoading();
    }
  }

  /* =======================================================
     INITIAL PAGE LOADING PREVIEW
  ======================================================= */

  if (initialLoading) {
    const loadingPercentage =
      ((loadingStep + 1) / INITIAL_LOADING_STEPS.length) * 99;
    return (
      <div className="user-auth-initial-loader">
        <div className="auth-loader-background">
          <div className="auth-loader-grid" />

          <div className="auth-loader-orb auth-loader-orb-one" />

          <div className="auth-loader-orb auth-loader-orb-two" />
        </div>

        <div className="auth-loader-content">
          <div className="auth-loader-logo-shell">
            <div className="auth-loader-ring auth-loader-ring-one" />

            <div className="auth-loader-ring auth-loader-ring-two" />

            <img
              src={lexminerLogo}
              alt="LexMiner"
              className="auth-loader-logo"
            />
          </div>

          <span className="auth-loader-eyebrow">Secure Legal Intelligence</span>

          <h1>LexMiner</h1>

          <p>AI-assisted Legal Argument Mining System</p>

          <div className="auth-loader-progress">
            <span
              style={{
                width: `${
                  ((loadingStep + 1) / INITIAL_LOADING_STEPS.length) * 100
                }%`,
              }}
            />
          </div>

          <div className="case-loader-progress-copy">
            <span>Preparing User Authentication</span>

            <strong>{Math.round(loadingPercentage)}%</strong>
          </div>

          <div className="auth-loader-step-list">
            {INITIAL_LOADING_STEPS.map((step, index) => {
              const completed = index < loadingStep;

              const active = index === loadingStep;

              return (
                <div
                  key={step.id}
                  className={`auth-loader-step ${
                    completed ? "auth-loader-step-complete" : ""
                  } ${active ? "auth-loader-step-active" : ""}`}
                >
                  <span className="auth-loader-step-icon">
                    {completed ? (
                      <Check size={14} />
                    ) : active ? (
                      <LoaderCircle size={14} className="spin-icon" />
                    ) : (
                      index + 1
                    )}
                  </span>

                  <span>{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
  /* =======================================================
     MAIN AUTHENTICATION PAGE
  ======================================================= */

  return (
    <div
      className={`user-auth-page ${
        authMode === AUTH_MODE.LOGIN ? "show-login-side" : "show-register-side"
      }`}
    >
      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div className="user-auth-background">
        <div className="user-auth-grid" />

        <div className="user-auth-orb user-auth-orb-one" />

        <div className="user-auth-orb user-auth-orb-two" />

        <div className="user-auth-orb user-auth-orb-three" />

        <div className="user-auth-particle particle-one" />

        <div className="user-auth-particle particle-two" />

        <div className="user-auth-particle particle-three" />
      </div>

      {/* ===================================================
          PAGE HEADER
      =================================================== */}

      <header className="user-auth-page-header">
        <div className="user-auth-header-brand">
          <div className="header-name">
            <h1>LexMiner</h1>

            <span>AI-assisted Legal Argument Mining System</span>
          </div>
        </div>

        <p>
          Semantic Legal Research and Argument Mining for Philippine Supreme
          Court Decisions
        </p>
      </header>

      {/* ===================================================
          CENTERED AUTHENTICATION CARD
      =================================================== */}

      <main className="user-auth-shell user-auth-shell-centered">
        <section className="user-auth-form-panel user-auth-form-panel-centered">
          <div
            className={`auth-flip-container ${
              authMode === AUTH_MODE.LOGIN ? "auth-card-is-flipped" : ""
            } ${cardFlipping ? "auth-card-is-animating" : ""}`}
          >
            <div className="auth-flip-card">
              {/* =============================================
                  REGISTRATION SIDE
              ============================================= */}

              <div className="auth-card-face auth-register-face">
                <div className="auth-card-content">
                  {/* =========================================
                      REGISTRATION HEADER
                  ========================================= */}

                  <header className="auth-card-header">
                    <span className="auth-section-eyebrow">
                      <UserRoundPlus size={16} />
                      Secure account registration
                    </span>

                    <h2>
                      {registrationStep === REGISTRATION_STEP.EMAIL &&
                        "Create your LexMiner account"}

                      {registrationStep === REGISTRATION_STEP.OTP &&
                        "Verify your email"}

                      {registrationStep === REGISTRATION_STEP.PROFILE &&
                        "Tell us about yourself"}

                      {registrationStep === REGISTRATION_STEP.PASSWORD &&
                        "Secure your account"}

                      {registrationStep === REGISTRATION_STEP.SUCCESS &&
                        "Registration complete"}
                    </h2>

                    <p>
                      {registrationStep === REGISTRATION_STEP.EMAIL &&
                        "Begin with an active email address. We will send a six-digit verification code."}

                      {registrationStep === REGISTRATION_STEP.OTP &&
                        `Enter the verification code sent to ${
                          maskedEmail || registrationForm.email
                        }.`}

                      {registrationStep === REGISTRATION_STEP.PROFILE &&
                        "Enter your legal name to complete your LexMiner profile."}

                      {registrationStep === REGISTRATION_STEP.PASSWORD &&
                        "Create a strong password that satisfies every security requirement."}

                      {registrationStep === REGISTRATION_STEP.SUCCESS &&
                        "Your verified account is ready. You may now sign in and begin legal research."}
                    </p>
                  </header>

                  {/* =========================================
                      REGISTRATION STEPPER
                  ========================================= */}

                  {registrationStep !== REGISTRATION_STEP.SUCCESS && (
                    <div className="registration-stepper">
                      {REGISTRATION_STEPS.map((step, index) => {
                        const Icon = step.icon;

                        const isActive = registrationStep === step.number;

                        const isCompleted = registrationStep > step.number;

                        return (
                          <div
                            key={step.number}
                            className={`registration-step ${
                              isActive ? "registration-step-active" : ""
                            } ${
                              isCompleted ? "registration-step-completed" : ""
                            }`}
                          >
                            <div className="registration-step-marker">
                              {isCompleted ? (
                                <Check size={16} />
                              ) : (
                                <Icon size={16} />
                              )}
                            </div>

                            <div className="registration-step-copy">
                              <strong>{step.shortTitle}</strong>

                              <span>{step.description}</span>
                            </div>

                            {index < REGISTRATION_STEPS.length - 1 && (
                              <span className="registration-step-line" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* =========================================
                      ALERTS
                  ========================================= */}

                  {error && (
                    <div className="auth-alert auth-error-alert">
                      <AlertCircle size={19} />

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

                  {notice && (
                    <div className="auth-alert auth-success-alert">
                      <CheckCircle2 size={19} />

                      <span>{notice}</span>

                      <button
                        type="button"
                        onClick={() => setNotice("")}
                        aria-label="Close success message"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  )}

                  {/* =========================================
                      STEP 1 — EMAIL
                  ========================================= */}

                  {registrationStep === REGISTRATION_STEP.EMAIL && (
                    <form
                      className="auth-form"
                      onSubmit={handleRequestOtp}
                      noValidate
                    >
                      <div className="auth-field-group">
                        <label htmlFor="registration-email">
                          Email Address
                        </label>

                        <div
                          className={`auth-input-wrapper ${
                            fieldErrors.email ? "auth-input-has-error" : ""
                          }`}
                        >
                          <Mail size={19} />

                          <input
                            id="registration-email"
                            name="email"
                            type="email"
                            value={registrationForm.email}
                            onChange={handleRegistrationFieldChange}
                            placeholder="Enter your active email address"
                            autoComplete="email"
                            disabled={requestLoading}
                          />
                        </div>

                        {fieldErrors.email && (
                          <span className="auth-field-error">
                            {fieldErrors.email}
                          </span>
                        )}
                      </div>

                      <div className="registration-email-information">
                        <ShieldCheck size={19} />

                        <div>
                          <strong>Email ownership verification</strong>

                          <span>
                            A six-digit code valid for five minutes will be sent
                            to this email address.
                          </span>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="auth-primary-button"
                        disabled={requestLoading}
                      >
                        {requestLoading &&
                        requestLoadingType === "REQUEST_OTP" ? (
                          <LoaderCircle size={19} className="spin-icon" />
                        ) : (
                          <Mail size={19} />
                        )}

                        <span>
                          {requestLoading &&
                          requestLoadingType === "REQUEST_OTP"
                            ? "Sending Code..."
                            : "Send Verification Code"}
                        </span>

                        {!requestLoading && <ArrowRight size={18} />}
                      </button>
                    </form>
                  )}

                  {/* =========================================
                      STEP 2 — OTP
                  ========================================= */}

                  {registrationStep === REGISTRATION_STEP.OTP && (
                    <form
                      className="auth-form"
                      onSubmit={handleVerifyOtp}
                      noValidate
                    >
                      <div className="otp-email-preview">
                        <div className="otp-email-icon">
                          <Mail size={21} />
                        </div>

                        <div>
                          <span>Verification code sent to</span>

                          <strong>
                            {maskedEmail || registrationForm.email}
                          </strong>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setRegistrationStep(REGISTRATION_STEP.EMAIL);

                            setOtpValues(Array(OTP_LENGTH).fill(""));

                            setError("");

                            setNotice("");
                          }}
                          disabled={requestLoading}
                        >
                          Change
                        </button>
                      </div>

                      <div className="otp-input-section">
                        <label>Six-Digit Verification Code</label>

                        <div
                          className={`otp-input-grid ${
                            fieldErrors.otp ? "otp-grid-has-error" : ""
                          }`}
                          onPaste={handleOtpPaste}
                        >
                          {otpValues.map((value, index) => (
                            <input
                              key={index}
                              ref={(element) => {
                                otpInputRefs.current[index] = element;
                              }}
                              type="text"
                              inputMode="numeric"
                              autoComplete={
                                index === 0 ? "one-time-code" : "off"
                              }
                              maxLength={1}
                              value={value}
                              onChange={(event) =>
                                handleOtpChange(index, event.target.value)
                              }
                              onKeyDown={(event) =>
                                handleOtpKeyDown(index, event)
                              }
                              onFocus={(event) => event.target.select()}
                              disabled={requestLoading || otpExpired}
                              aria-label={`Verification digit ${index + 1}`}
                            />
                          ))}
                        </div>

                        {fieldErrors.otp && (
                          <span className="auth-field-error otp-field-error">
                            {fieldErrors.otp}
                          </span>
                        )}
                      </div>

                      <div
                        className={`otp-countdown-panel ${
                          otpExpired ? "otp-countdown-expired" : ""
                        }`}
                      >
                        <div>
                          <Clock3 size={19} />

                          <span>
                            {otpExpired ? "Code expired" : "Code expires in"}
                          </span>
                        </div>

                        <strong>{formatCountdown(otpExpiresIn)}</strong>
                      </div>

                      <div className="otp-resend-row">
                        <span>Did not receive the email?</span>

                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={
                            requestLoading ||
                            resendAvailableIn > 0 ||
                            !registrationId
                          }
                        >
                          {requestLoading &&
                          requestLoadingType === "RESEND_OTP" ? (
                            <LoaderCircle size={16} className="spin-icon" />
                          ) : (
                            <RefreshCcw size={16} />
                          )}

                          {resendAvailableIn > 0
                            ? `Resend in ${formatCountdown(resendAvailableIn)}`
                            : "Resend Code"}
                        </button>
                      </div>

                      <div className="auth-form-navigation">
                        <button
                          type="button"
                          className="auth-back-button"
                          onClick={goToPreviousRegistrationStep}
                          disabled={requestLoading}
                        >
                          <ArrowLeft size={18} />
                          Back
                        </button>

                        <button
                          type="submit"
                          className="auth-primary-button"
                          disabled={
                            requestLoading || !isOtpComplete || otpExpired
                          }
                        >
                          {requestLoading &&
                          requestLoadingType === "VERIFY_OTP" ? (
                            <LoaderCircle size={19} className="spin-icon" />
                          ) : (
                            <Fingerprint size={19} />
                          )}

                          <span>
                            {requestLoading &&
                            requestLoadingType === "VERIFY_OTP"
                              ? "Verifying..."
                              : "Verify Email"}
                          </span>

                          {!requestLoading && <ArrowRight size={18} />}
                        </button>
                      </div>
                    </form>
                  )}
                  {/* =========================================
                      STEP 3 — PROFILE
                  ========================================= */}

                  {registrationStep === REGISTRATION_STEP.PROFILE && (
                    <form
                      className="auth-form"
                      onSubmit={handleProfileSubmit}
                      noValidate
                    >
                      <div className="auth-field-row">
                        <div className="auth-field-group">
                          <label htmlFor="registration-first-name">
                            First Name
                          </label>

                          <div
                            className={`auth-input-wrapper ${
                              fieldErrors.firstName
                                ? "auth-input-has-error"
                                : ""
                            }`}
                          >
                            <CircleUserRound size={19} />

                            <input
                              id="registration-first-name"
                              name="firstName"
                              type="text"
                              value={registrationForm.firstName}
                              onChange={handleRegistrationFieldChange}
                              placeholder="Enter your first name"
                              autoComplete="given-name"
                              disabled={requestLoading}
                            />
                          </div>

                          {fieldErrors.firstName && (
                            <span className="auth-field-error">
                              {fieldErrors.firstName}
                            </span>
                          )}
                        </div>

                        <div className="auth-field-group">
                          <label htmlFor="registration-last-name">
                            Last Name
                          </label>

                          <div
                            className={`auth-input-wrapper ${
                              fieldErrors.lastName ? "auth-input-has-error" : ""
                            }`}
                          >
                            <CircleUserRound size={19} />

                            <input
                              id="registration-last-name"
                              name="lastName"
                              type="text"
                              value={registrationForm.lastName}
                              onChange={handleRegistrationFieldChange}
                              placeholder="Enter your last name"
                              autoComplete="family-name"
                              disabled={requestLoading}
                            />
                          </div>

                          {fieldErrors.lastName && (
                            <span className="auth-field-error">
                              {fieldErrors.lastName}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="profile-step-information">
                        <CircleUserRound size={20} />

                        <div>
                          <strong>Profile identity</strong>

                          <span>
                            Your name will be associated with your LexMiner
                            account and research activity.
                          </span>
                        </div>
                      </div>

                      <div className="auth-form-navigation">
                        <button
                          type="button"
                          className="auth-back-button"
                          onClick={goToPreviousRegistrationStep}
                          disabled={requestLoading}
                        >
                          <ArrowLeft size={18} />
                          Back
                        </button>

                        <button
                          type="submit"
                          className="auth-primary-button"
                          disabled={requestLoading}
                        >
                          <span>Continue</span>

                          <ArrowRight size={18} />
                        </button>
                      </div>
                    </form>
                  )}

                  {/* =========================================
                      STEP 4 — PASSWORD
                  ========================================= */}

                  {registrationStep === REGISTRATION_STEP.PASSWORD && (
                    <form
                      className="auth-form"
                      onSubmit={handleCompleteRegistration}
                      noValidate
                    >
                      <div className="auth-field-group">
                        <label htmlFor="registration-password">
                          Create Password
                        </label>

                        <div
                          className={`auth-input-wrapper ${
                            fieldErrors.password ? "auth-input-has-error" : ""
                          }`}
                        >
                          <LockKeyhole size={19} />

                          <input
                            id="registration-password"
                            name="password"
                            type={
                              showRegistrationPassword ? "text" : "password"
                            }
                            value={registrationForm.password}
                            onChange={handleRegistrationFieldChange}
                            placeholder="Create a secure password"
                            autoComplete="new-password"
                            disabled={requestLoading}
                          />

                          <button
                            type="button"
                            className="auth-password-toggle"
                            onClick={() =>
                              setShowRegistrationPassword((current) => !current)
                            }
                            disabled={requestLoading}
                            aria-label={
                              showRegistrationPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showRegistrationPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>

                        {fieldErrors.password && (
                          <span className="auth-field-error">
                            {fieldErrors.password}
                          </span>
                        )}
                      </div>

                      <div className="auth-field-group">
                        <label htmlFor="registration-confirm-password">
                          Confirm Password
                        </label>

                        <div
                          className={`auth-input-wrapper ${
                            fieldErrors.confirmPassword
                              ? "auth-input-has-error"
                              : ""
                          }`}
                        >
                          <ShieldCheck size={19} />

                          <input
                            id="registration-confirm-password"
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={registrationForm.confirmPassword}
                            onChange={handleRegistrationFieldChange}
                            placeholder="Repeat your password"
                            autoComplete="new-password"
                            disabled={requestLoading}
                          />

                          <button
                            type="button"
                            className="auth-password-toggle"
                            onClick={() =>
                              setShowConfirmPassword((current) => !current)
                            }
                            disabled={requestLoading}
                            aria-label={
                              showConfirmPassword
                                ? "Hide password confirmation"
                                : "Show password confirmation"
                            }
                          >
                            {showConfirmPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>

                        {fieldErrors.confirmPassword && (
                          <span className="auth-field-error">
                            {fieldErrors.confirmPassword}
                          </span>
                        )}

                        {registrationForm.confirmPassword &&
                          registrationForm.password ===
                            registrationForm.confirmPassword && (
                            <span className="password-match-message">
                              <CheckCircle2 size={15} />
                              Passwords match
                            </span>
                          )}
                      </div>

                      {/* =====================================
                          PASSWORD STRENGTH METER
                      ===================================== */}

                      <div className="password-strength-panel">
                        <div className="password-strength-heading">
                          <span>Password Strength</span>

                          <strong className={passwordStrength.className}>
                            {passwordStrength.label}
                          </strong>
                        </div>

                        <div className="password-strength-bars">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <span
                              key={level}
                              className={
                                level <= passwordStrength.level
                                  ? `password-strength-bar-active ${passwordStrength.className}`
                                  : ""
                              }
                            />
                          ))}
                        </div>

                        <div className="password-requirements-grid">
                          <div
                            className={
                              passwordStrength.checks.minimumLength
                                ? "password-requirement-complete"
                                : ""
                            }
                          >
                            {passwordStrength.checks.minimumLength ? (
                              <Check size={15} />
                            ) : (
                              <X size={15} />
                            )}
                            At least 8 characters
                          </div>

                          <div
                            className={
                              passwordStrength.checks.maximumLength
                                ? "password-requirement-complete"
                                : ""
                            }
                          >
                            {passwordStrength.checks.maximumLength ? (
                              <Check size={15} />
                            ) : (
                              <X size={15} />
                            )}
                            Maximum 128 characters
                          </div>

                          <div
                            className={
                              passwordStrength.checks.uppercase
                                ? "password-requirement-complete"
                                : ""
                            }
                          >
                            {passwordStrength.checks.uppercase ? (
                              <Check size={15} />
                            ) : (
                              <X size={15} />
                            )}
                            One uppercase letter
                          </div>

                          <div
                            className={
                              passwordStrength.checks.lowercase
                                ? "password-requirement-complete"
                                : ""
                            }
                          >
                            {passwordStrength.checks.lowercase ? (
                              <Check size={15} />
                            ) : (
                              <X size={15} />
                            )}
                            One lowercase letter
                          </div>

                          <div
                            className={
                              passwordStrength.checks.number
                                ? "password-requirement-complete"
                                : ""
                            }
                          >
                            {passwordStrength.checks.number ? (
                              <Check size={15} />
                            ) : (
                              <X size={15} />
                            )}
                            One number
                          </div>

                          <div
                            className={
                              passwordStrength.checks.special
                                ? "password-requirement-complete"
                                : ""
                            }
                          >
                            {passwordStrength.checks.special ? (
                              <Check size={15} />
                            ) : (
                              <X size={15} />
                            )}
                            One special character
                          </div>

                          <div
                            className={
                              passwordStrength.checks.noSpaces
                                ? "password-requirement-complete"
                                : ""
                            }
                          >
                            {passwordStrength.checks.noSpaces ? (
                              <Check size={15} />
                            ) : (
                              <X size={15} />
                            )}
                            No spaces
                          </div>
                        </div>
                      </div>

                      <div className="auth-form-navigation">
                        <button
                          type="button"
                          className="auth-back-button"
                          onClick={goToPreviousRegistrationStep}
                          disabled={requestLoading}
                        >
                          <ArrowLeft size={18} />
                          Back
                        </button>

                        <button
                          type="submit"
                          className="auth-primary-button"
                          disabled={
                            requestLoading ||
                            !passwordStrength.allPassed ||
                            registrationForm.password !==
                              registrationForm.confirmPassword
                          }
                        >
                          {requestLoading &&
                          requestLoadingType === "COMPLETE_REGISTRATION" ? (
                            <LoaderCircle size={19} className="spin-icon" />
                          ) : (
                            <ShieldCheck size={19} />
                          )}

                          <span>
                            {requestLoading &&
                            requestLoadingType === "COMPLETE_REGISTRATION"
                              ? "Creating Account..."
                              : "Create Account"}
                          </span>

                          {!requestLoading && <ArrowRight size={18} />}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* =========================================
                      REGISTRATION SUCCESS
                  ========================================= */}

                  {registrationStep === REGISTRATION_STEP.SUCCESS && (
                    <div className="registration-success-preview">
                      <div className="registration-success-visual">
                        <div className="registration-success-ring success-ring-one" />

                        <div className="registration-success-ring success-ring-two" />

                        <div className="registration-success-icon">
                          <CheckCircle2 size={46} />
                        </div>
                      </div>

                      <span className="registration-success-eyebrow">
                        Account successfully created
                      </span>

                      <h3>Registration Completed</h3>

                      <p>
                        Your email has been verified and your LexMiner account
                        is ready to use.
                      </p>

                      <div className="registration-success-account">
                        <div>
                          <CircleUserRound size={19} />

                          <span>Name</span>

                          <strong>
                            {[
                              registeredUser?.first_name,
                              registeredUser?.last_name,
                            ]
                              .filter(Boolean)
                              .join(" ") || "Registered User"}
                          </strong>
                        </div>

                        <div>
                          <Mail size={19} />

                          <span>Email</span>

                          <strong>
                            {registeredUser?.email || registrationForm.email}
                          </strong>
                        </div>

                        <div>
                          <BadgeCheck size={19} />

                          <span>Email Status</span>

                          <strong>Verified</strong>
                        </div>
                      </div>

                      <div className="registration-success-email-notice">
                        <Mail size={18} />

                        <span>
                          A confirmation email has been sent to your verified
                          email address.
                        </span>
                      </div>

                      <button
                        type="button"
                        className="auth-primary-button"
                        onClick={handleRegistrationSuccessLogin}
                        disabled={requestLoading}
                      >
                        <KeyRound size={19} />
                        Continue to Sign In
                        <ArrowRight size={18} />
                      </button>

                      <button
                        type="button"
                        className="auth-secondary-button"
                        onClick={() => resetRegistration()}
                        disabled={requestLoading}
                      >
                        Register Another Account
                      </button>
                    </div>
                  )}

                  {/* =========================================
                      REGISTER-TO-LOGIN SWITCH
                  ========================================= */}

                  {registrationStep !== REGISTRATION_STEP.SUCCESS && (
                    <div className="auth-mode-switch">
                      <span>Already have a LexMiner account?</span>

                      <button
                        type="button"
                        onClick={() =>
                          changeAuthMode(AUTH_MODE.LOGIN, {
                            preserveEmail: true,
                          })
                        }
                        disabled={requestLoading || cardFlipping}
                      >
                        Sign In
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {/* =============================================
                  LOGIN SIDE
              ============================================= */}

              <div className="auth-card-face auth-login-face">
                <div className="auth-card-content">
                  {/* =========================================
                      LOGIN HEADER
                  ========================================= */}

                  <header className="auth-card-header auth-login-card-header">
                    <div className="auth-login-logo">
                      <Fingerprint size={29} />
                    </div>

                    <span className="auth-section-eyebrow">
                      <KeyRound size={16} />
                      Secure account access
                    </span>

                    <h2>System Authentication</h2>

                    <p>Sign in using your LexMiner account credentials.</p>
                  </header>

                  {/* =========================================
                      LOGIN ALERTS
                  ========================================= */}

                  {error && (
                    <div className="auth-alert auth-error-alert">
                      <AlertCircle size={19} />

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

                  {notice && (
                    <div className="auth-alert auth-success-alert">
                      <CheckCircle2 size={19} />

                      <span>{notice}</span>

                      <button
                        type="button"
                        onClick={() => setNotice("")}
                        aria-label="Close success message"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  )}

                  {/* =========================================
                      LOCKED ACCOUNT MESSAGE
                  ========================================= */}

                  {lockedAccountMessage && (
                    <div className="locked-account-preview">
                      <div className="locked-account-icon">
                        <LockKeyhole size={28} />
                      </div>

                      <div>
                        <strong>Account temporarily locked</strong>

                        <span>{lockedAccountMessage}</span>

                        <small>
                          A security notification has been sent to your email.
                        </small>
                      </div>
                    </div>
                  )}

                  {/* =========================================
                      LOGIN FORM
                  ========================================= */}

                  <form
                    className="auth-form login-auth-form"
                    onSubmit={handleLoginSubmit}
                    noValidate
                  >
                    <div className="auth-field-group">
                      <label htmlFor="login-email">Email Address</label>

                      <div
                        className={`auth-input-wrapper ${
                          fieldErrors.email ? "auth-input-has-error" : ""
                        }`}
                      >
                        <Mail size={19} />

                        <input
                          id="login-email"
                          name="email"
                          type="email"
                          value={loginForm.email}
                          onChange={handleLoginFieldChange}
                          placeholder="Enter your email address"
                          autoComplete="email"
                          disabled={requestLoading}
                        />
                      </div>

                      {fieldErrors.email && (
                        <span className="auth-field-error">
                          {fieldErrors.email}
                        </span>
                      )}
                    </div>

                    <div className="auth-field-group">
                      <div className="auth-label-row">
                        <label htmlFor="login-password">Password</label>

                        <button
                          type="button"
                          className="forgot-password-link"
                          onClick={() => navigate("/forgot-password")}
                          disabled={requestLoading}
                        >
                          Forgot Password?
                        </button>
                      </div>

                      <div
                        className={`auth-input-wrapper ${
                          fieldErrors.password ? "auth-input-has-error" : ""
                        }`}
                      >
                        <LockKeyhole size={19} />

                        <input
                          id="login-password"
                          name="password"
                          type={showLoginPassword ? "text" : "password"}
                          value={loginForm.password}
                          onChange={handleLoginFieldChange}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          disabled={requestLoading}
                        />

                        <button
                          type="button"
                          className="auth-password-toggle"
                          onClick={() =>
                            setShowLoginPassword((current) => !current)
                          }
                          disabled={requestLoading}
                          aria-label={
                            showLoginPassword
                              ? "Hide login password"
                              : "Show login password"
                          }
                        >
                          {showLoginPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </button>
                      </div>

                      {fieldErrors.password && (
                        <span className="auth-field-error">
                          {fieldErrors.password}
                        </span>
                      )}
                    </div>

                    {/* =======================================
                        REMEMBER SESSION
                    ======================================= */}

                    <div className="login-options-row">
                      <label className="remember-session-option">
                        <input
                          type="checkbox"
                          name="rememberMe"
                          checked={loginForm.rememberMe}
                          onChange={handleLoginFieldChange}
                          disabled={requestLoading}
                        />

                        <span className="remember-checkbox">
                          {loginForm.rememberMe && <Check size={14} />}
                        </span>

                        <span>
                          Keep me signed in
                          <small>Use this only on a trusted device</small>
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="auth-primary-button login-submit-button"
                      disabled={requestLoading}
                    >
                      {requestLoading && requestLoadingType === "LOGIN" ? (
                        <LoaderCircle size={19} className="spin-icon" />
                      ) : (
                        <ShieldCheck size={19} />
                      )}

                      <span>
                        {requestLoading && requestLoadingType === "LOGIN"
                          ? "Signing In..."
                          : "Login Securely"}
                      </span>

                      {!requestLoading && <ArrowRight size={18} />}
                    </button>
                  </form>

                  {/* =========================================
                      DIVIDER
                  ========================================= */}

                  <div className="auth-divider">
                    <span />

                    <strong>or continue with</strong>

                    <span />
                  </div>

                  {/* =========================================
                      GOOGLE LOGIN
                  ========================================= */}

                  <div className="google-login-section">
                    <div
                      id="lexminer-google-login-button"
                      className="google-login-button-container"
                    />

                    {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                      <div className="google-login-unavailable">
                        <AlertCircle size={17} />

                        <span>
                          Add VITE_GOOGLE_CLIENT_ID to enable Google Sign-In.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* =========================================
                      LOGIN-TO-REGISTER SWITCH
                  ========================================= */}

                  <div className="auth-mode-switch">
                    <span>Do not have an account?</span>

                    <button
                      type="button"
                      onClick={() =>
                        changeAuthMode(AUTH_MODE.REGISTER, {
                          preserveEmail: true,
                        })
                      }
                      disabled={requestLoading || cardFlipping}
                    >
                      Register Here
                      <ChevronRight size={17} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================
              CENTERED FORM FOOTER
          ================================================= */}

          <footer className="auth-form-panel-footer auth-form-panel-footer-centered">
            <button
              type="button"
              className="auth-inline-home-link"
              onClick={handleReturnToLanding}
              disabled={requestLoading}
            >
              <ArrowLeft size={15} />
              Back to Homepage
            </button>
          </footer>
        </section>
      </main>

      {/* ===================================================
          PAGE FOOTER
      =================================================== */}

      <footer className="user-auth-page-footer">
        <p>© 2026 LexMiner AI-assisted Legal Argument Mining System</p>

        <div>
          <button
            type="button"
            onClick={() => navigate("/policy/terms-of-use")}
            disabled={requestLoading}
          >
            Terms of Use
          </button>

          <button
            type="button"
            onClick={() => navigate("/policy/privacy-policy")}
            disabled={requestLoading}
          >
            Privacy Policy
          </button>
        </div>
      </footer>

      {/* ===================================================
          REQUEST LOADING OVERLAY
      =================================================== */}

      {requestLoading && currentRequestLoading && (
        <div
          className="auth-request-loading-overlay"
          role="status"
          aria-live="polite"
        >
          <div className="auth-request-loading-card">
            <div className="request-loader-visual">
              <div className="request-loader-ring request-loader-ring-one" />

              <div className="request-loader-ring request-loader-ring-two" />

              <div className="request-loader-center">
                {requestLoadingType === "REQUEST_OTP" && <Mail size={28} />}

                {requestLoadingType === "VERIFY_OTP" && (
                  <Fingerprint size={28} />
                )}

                {requestLoadingType === "RESEND_OTP" && (
                  <RefreshCcw size={28} />
                )}

                {requestLoadingType === "COMPLETE_REGISTRATION" && (
                  <UserRoundPlus size={28} />
                )}

                {requestLoadingType === "LOGIN" && <KeyRound size={28} />}

                {requestLoadingType === "GOOGLE_LOGIN" && (
                  <ShieldCheck size={28} />
                )}
              </div>
            </div>

            <span className="request-loading-eyebrow">
              Secure operation in progress
            </span>

            <h2>{currentRequestLoading.title}</h2>

            <p>{currentRequestLoading.description}</p>

            <div className="request-loading-progress">
              <span />
            </div>

            <div className="request-loading-status">
              <LoaderCircle size={17} className="spin-icon" />
              Please keep this page open
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
