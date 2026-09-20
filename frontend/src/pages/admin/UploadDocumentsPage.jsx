import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleUserRound,
  CloudUpload,
  Database,
  BrainCircuit,
  FileCheck2,
  FileClock,
  FileText,
  FolderOpen,
  Gauge,
  HardDriveUpload,
  Info,
  Layers3,
  LoaderCircle,
  LogOut,
  Menu,
  RefreshCcw,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";
import adminPicture from "../../assets/admin-picture.png";

import { uploadAdminDocuments } from "../../services/adminUploadService";

import "../../styles/upload-documents.css";
import "../../styles/admin-profile.css";

const DECISION_MONTHS = [
  {
    value: "January",
    label: "January",
  },
  {
    value: "February",
    label: "February",
  },
  {
    value: "March",
    label: "March",
  },
  {
    value: "April",
    label: "April",
  },
  {
    value: "May",
    label: "May",
  },
  {
    value: "June",
    label: "June",
  },
  {
    value: "July",
    label: "July",
  },
  {
    value: "August",
    label: "August",
  },
  {
    value: "September",
    label: "September",
  },
  {
    value: "October",
    label: "October",
  },
  {
    value: "November",
    label: "November",
  },
  {
    value: "December",
    label: "December",
  },
];

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_MINIMUM_YEAR = 2016;

const DEFAULT_MAXIMUM_YEAR = CURRENT_YEAR;

const DEFAULT_MAXIMUM_FILE_SIZE_MB = 25;

const DEFAULT_UPLOAD_SUMMARY = {
  received: 0,
  uploaded: 0,
  duplicates: 0,
  failed: 0,
};

function createSelectedFileId(file) {
  const randomValue =
    globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;

  return [file.name, file.size, file.lastModified, randomValue].join("-");
}

function getFileIdentity(file) {
  return [file.name.toLowerCase(), file.size, file.lastModified].join("-");
}

function formatFileSize(bytes) {
  const numericBytes = Number(bytes);

  if (!Number.isFinite(numericBytes) || numericBytes < 0) {
    return "Unknown size";
  }

  if (numericBytes === 0) {
    return "0 Bytes";
  }

  const units = ["Bytes", "KB", "MB", "GB"];

  const unitIndex = Math.min(
    Math.floor(Math.log(numericBytes) / Math.log(1024)),
    units.length - 1,
  );

  const value = numericBytes / 1024 ** unitIndex;

  const decimals = unitIndex === 0 || value >= 100 ? 0 : 2;

  return `${value.toFixed(decimals)} ${units[unitIndex]}`;
}

function formatUploadDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function normalizeUploadStatus(value) {
  return String(value || "pending")
    .trim()
    .toLowerCase();
}

function getErrorMessage(error) {
  const detail = error?.response?.data?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item?.msg === "string") {
          return item.msg;
        }

        return String(item);
      })
      .join(", ");
  }

  if (error?.response?.status === 401) {
    return "Your administrator session has expired. " + "Please sign in again.";
  }

  if (error?.response?.status === 403) {
    return "You are not authorized to upload " + "Supreme Court documents.";
  }

  if (error?.response?.status === 413) {
    return (
      "The selected upload exceeds the " +
      "maximum request size allowed by the server."
    );
  }

  if (error?.code === "ERR_NETWORK") {
    return (
      "The upload server could not be reached. " +
      "Check that the backend is running."
    );
  }

  return error?.message || "An unexpected error occurred during the upload.";
}

function isPdfFile(file) {
  if (!(file instanceof File)) {
    return false;
  }

  const normalizedName = file.name.toLowerCase();

  const acceptedTypes = new Set([
    "application/pdf",
    "application/octet-stream",
    "",
  ]);

  return (
    normalizedName.endsWith(".pdf") &&
    acceptedTypes.has(String(file.type || "").toLowerCase())
  );
}

function validateSelectedFile(file, maximumFileSizeBytes) {
  if (!(file instanceof File)) {
    return {
      valid: false,
      message: "The selected item is not a valid file.",
    };
  }

  if (!file.name?.trim()) {
    return {
      valid: false,
      message: "The selected file has no valid filename.",
    };
  }

  if (!isPdfFile(file)) {
    return {
      valid: false,
      message: "Only valid PDF documents are allowed.",
    };
  }

  if (file.size <= 0) {
    return {
      valid: false,
      message: "The selected PDF document is empty.",
    };
  }

  if (
    Number.isFinite(maximumFileSizeBytes) &&
    file.size > maximumFileSizeBytes
  ) {
    return {
      valid: false,
      message:
        `The PDF exceeds the maximum size of ` +
        `${formatFileSize(maximumFileSizeBytes)}.`,
    };
  }

  return {
    valid: true,
    message: "",
  };
}

function createSelectedFileRecord(file) {
  return {
    id: createSelectedFileId(file),
    identity: getFileIdentity(file),
    file,
    filename: file.name,
    size: file.size,
    type: file.type || "application/pdf",
    lastModified: file.lastModified,
    status: "ready",
    progress: 0,
    message: "Ready to upload.",
    uploadedAt: null,
    savedPath: null,
  };
}

function UploadPageLoader() {
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
          Preparing secure document upload center...
        </div>
      </div>
    </div>
  );
}

function UploadStatusBadge({ status }) {
  const normalizedStatus = normalizeUploadStatus(status);

  let icon = <FileClock size={15} />;

  let label = "Pending";

  if (normalizedStatus === "ready") {
    icon = <FileCheck2 size={15} />;

    label = "Ready";
  }

  if (normalizedStatus === "uploading") {
    icon = <LoaderCircle size={15} className="spin-icon" />;

    label = "Uploading";
  }

  if (normalizedStatus === "uploaded") {
    icon = <CheckCircle2 size={15} />;

    label = "Uploaded";
  }

  if (normalizedStatus === "duplicate") {
    icon = <CircleAlert size={15} />;

    label = "Duplicate";
  }

  if (normalizedStatus === "failed") {
    icon = <AlertTriangle size={15} />;

    label = "Failed";
  }

  return (
    <span
      className={`upload-status-badge ` + `upload-status-${normalizedStatus}`}
    >
      {icon}

      {label}
    </span>
  );
}

function UploadSummaryCard({ icon: Icon, title, value, description, variant }) {
  return (
    <article className={`upload-summary-card ` + `upload-summary-${variant}`}>
      <div className="upload-summary-glow" />

      <div className="upload-summary-icon">
        <Icon size={21} />
      </div>

      <div className="upload-summary-copy">
        <span>{title}</span>

        <strong>
          {new Intl.NumberFormat("en-PH").format(Number(value || 0))}
        </strong>

        <p>{description}</p>
      </div>
    </article>
  );
}

export default function UploadDocumentsPage() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const progressTimerRef = useRef(null);

  const [initialLoading, setInitialLoading] = useState(true);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);

  const [selectedMonth, setSelectedMonth] = useState("");

  const [selectedFiles, setSelectedFiles] = useState([]);

  const [uploadResults, setUploadResults] = useState([]);

  const [uploadSummary, setUploadSummary] = useState(DEFAULT_UPLOAD_SUMMARY);

  const [isDragging, setIsDragging] = useState(false);

  const [isUploading, setIsUploading] = useState(false);

  const [showUploadConfirmation, setShowUploadConfirmation] = useState(false);

  const [showClearConfirmation, setShowClearConfirmation] = useState(false);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const [validationMessages, setValidationMessages] = useState([]);

  const [maximumFileSizeMb] = useState(DEFAULT_MAXIMUM_FILE_SIZE_MB);

  const [minimumYear] = useState(DEFAULT_MINIMUM_YEAR);

  const [maximumYear] = useState(DEFAULT_MAXIMUM_YEAR);

  const maximumFileSizeBytes = useMemo(
    () => maximumFileSizeMb * 1024 * 1024,
    [maximumFileSizeMb],
  );

  const availableYears = useMemo(() => {
    const years = [];

    for (let year = maximumYear; year >= minimumYear; year -= 1) {
      years.push(year);
    }

    return years;
  }, [maximumYear, minimumYear]);

  const totalSelectedSize = useMemo(
    () =>
      selectedFiles.reduce(
        (total, selectedFile) => total + Number(selectedFile.size || 0),
        0,
      ),
    [selectedFiles],
  );

  const selectedFileStatistics = useMemo(
    () => ({
      total: selectedFiles.length,

      ready: selectedFiles.filter(
        (selectedFile) => selectedFile.status === "ready",
      ).length,

      uploading: selectedFiles.filter(
        (selectedFile) => selectedFile.status === "uploading",
      ).length,

      uploaded: selectedFiles.filter(
        (selectedFile) => selectedFile.status === "uploaded",
      ).length,

      duplicate: selectedFiles.filter(
        (selectedFile) => selectedFile.status === "duplicate",
      ).length,

      failed: selectedFiles.filter(
        (selectedFile) => selectedFile.status === "failed",
      ).length,
    }),
    [selectedFiles],
  );

  const hasReadyFiles = useMemo(
    () => selectedFiles.some((selectedFile) => selectedFile.status === "ready"),
    [selectedFiles],
  );

  const uploadDisabled = useMemo(
    () => isUploading || !selectedYear || !selectedMonth || !hasReadyFiles,
    [hasReadyFiles, isUploading, selectedMonth, selectedYear],
  );
  const addFiles = useCallback(
    (incomingFiles) => {
      if (isUploading) {
        return;
      }

      const normalizedFiles = Array.from(incomingFiles || []);

      if (!normalizedFiles.length) {
        return;
      }

      setValidationMessages([]);

      setSelectedFiles((currentFiles) => {
        const existingIdentities = new Set(
          currentFiles.map((selectedFile) => selectedFile.identity),
        );

        const nextFiles = [...currentFiles];

        const nextMessages = [];

        for (const file of normalizedFiles) {
          const validation = validateSelectedFile(file, maximumFileSizeBytes);

          if (!validation.valid) {
            nextMessages.push({
              id: createSelectedFileId(file),
              filename: file?.name || "Unknown file",
              message: validation.message,
              variant: "failed",
            });

            continue;
          }

          const identity = getFileIdentity(file);

          if (existingIdentities.has(identity)) {
            nextMessages.push({
              id: createSelectedFileId(file),
              filename: file.name,
              message: "This PDF is already selected.",
              variant: "duplicate",
            });

            continue;
          }

          existingIdentities.add(identity);

          nextFiles.push(createSelectedFileRecord(file));
        }

        if (nextMessages.length) {
          setValidationMessages(nextMessages);
        }

        return nextFiles;
      });
    },
    [isUploading, maximumFileSizeBytes],
  );

  function confirmLogout() {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_user");

    navigate("/authentication", {
      replace: true,
    });
  }

  const clearProgressTimer = useCallback(() => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);

      progressTimerRef.current = null;
    }
  }, []);

  const updateFileProgress = useCallback((progress) => {
    const normalizedProgress = Math.min(
      Math.max(Number(progress || 0), 0),
      100,
    );

    setSelectedFiles((currentFiles) =>
      currentFiles.map((selectedFile) => {
        if (selectedFile.status !== "uploading") {
          return selectedFile;
        }

        return {
          ...selectedFile,
          progress: normalizedProgress,
          message:
            normalizedProgress >= 100
              ? "Finalizing upload..."
              : "Uploading securely...",
        };
      }),
    );
  }, []);

  const beginSimulatedProgress = useCallback(() => {
    clearProgressTimer();

    let simulatedProgress = 6;

    updateFileProgress(simulatedProgress);

    progressTimerRef.current = window.setInterval(() => {
      simulatedProgress = Math.min(
        simulatedProgress + Math.max(1, Math.floor(Math.random() * 7)),
        92,
      );

      updateFileProgress(simulatedProgress);

      if (simulatedProgress >= 92) {
        clearProgressTimer();
      }
    }, 350);
  }, [clearProgressTimer, updateFileProgress]);

  const resetFileInput = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const removeSelectedFile = useCallback(
    (fileId) => {
      if (isUploading) {
        return;
      }

      setSelectedFiles((currentFiles) =>
        currentFiles.filter((selectedFile) => selectedFile.id !== fileId),
      );

      resetFileInput();
    },
    [isUploading, resetFileInput],
  );

  const clearSelectedFiles = useCallback(() => {
    if (isUploading) {
      return;
    }

    setSelectedFiles([]);
    setUploadResults([]);
    setUploadSummary(DEFAULT_UPLOAD_SUMMARY);
    setValidationMessages([]);
    setShowClearConfirmation(false);
    resetFileInput();
  }, [isUploading, resetFileInput]);

  const resetUploadWorkspace = useCallback(() => {
    if (isUploading) {
      return;
    }

    setSelectedYear(CURRENT_YEAR);

    setSelectedMonth("");

    clearSelectedFiles();

    setError("");
    setNotice("");
  }, [clearSelectedFiles, isUploading]);

  const handleFileInputChange = useCallback(
    (event) => {
      addFiles(event.target.files);

      resetFileInput();
    },
    [addFiles, resetFileInput],
  );

  const handleBrowseFiles = useCallback(() => {
    if (isUploading || !fileInputRef.current) {
      return;
    }

    fileInputRef.current.click();
  }, [isUploading]);

  const handleDragEnter = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!isUploading) {
        setIsDragging(true);
      }
    },
    [isUploading],
  );

  const handleDragOver = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }

      if (!isUploading) {
        setIsDragging(true);
      }
    },
    [isUploading],
  );

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget === event.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      setIsDragging(false);

      if (isUploading) {
        return;
      }

      addFiles(event.dataTransfer?.files);
    },
    [addFiles, isUploading],
  );

  const validateUploadRequest = useCallback(() => {
    const nextErrors = [];

    if (!selectedYear) {
      nextErrors.push("Select a decision year.");
    }

    if (!selectedMonth) {
      nextErrors.push("Select a decision month.");
    }

    if (!hasReadyFiles) {
      nextErrors.push("Select at least one valid PDF document.");
    }

    if (selectedYear < minimumYear || selectedYear > maximumYear) {
      nextErrors.push(
        `The year must be between ${minimumYear} and ${maximumYear}.`,
      );
    }

    if (nextErrors.length) {
      setError(nextErrors.join(" "));

      return false;
    }

    return true;
  }, [hasReadyFiles, maximumYear, minimumYear, selectedMonth, selectedYear]);

  const openUploadConfirmation = useCallback(() => {
    setError("");
    setNotice("");

    if (!validateUploadRequest()) {
      return;
    }

    setShowUploadConfirmation(true);
  }, [validateUploadRequest]);

  const markReadyFilesUploading = useCallback(() => {
    setSelectedFiles((currentFiles) =>
      currentFiles.map((selectedFile) => {
        if (selectedFile.status !== "ready") {
          return selectedFile;
        }

        return {
          ...selectedFile,
          status: "uploading",
          progress: 4,
          message: "Preparing secure upload...",
        };
      }),
    );
  }, []);

  const applyUploadResults = useCallback((response, submittedFiles) => {
    const responseFiles = Array.isArray(response?.files) ? response.files : [];

    const completionTime = new Date().toISOString();

    /*
     * The backend processes files in the same order
     * they were submitted. Connect each response result
     * to the original queue record using its frontend ID.
     */
    const resultsBySelectedFileId = new Map();

    submittedFiles.forEach((submittedFile, index) => {
      const result = responseFiles[index];

      resultsBySelectedFileId.set(submittedFile.id, result || null);
    });

    setSelectedFiles((currentFiles) =>
      currentFiles.map((selectedFile) => {
        /*
         * Do not modify files that were not included
         * in the current request.
         */
        if (!resultsBySelectedFileId.has(selectedFile.id)) {
          return selectedFile;
        }

        const result = resultsBySelectedFileId.get(selectedFile.id);

        if (!result) {
          return {
            ...selectedFile,
            status: "failed",
            progress: 100,
            message: "The server did not return a result for this document.",
            uploadedAt: completionTime,
          };
        }

        const normalizedStatus = normalizeUploadStatus(result.status);

        return {
          ...selectedFile,

          status: normalizedStatus,

          progress: 100,

          message:
            result.message ||
            (normalizedStatus === "uploaded"
              ? "PDF uploaded successfully."
              : normalizedStatus === "duplicate"
                ? "A PDF with this filename already exists."
                : "Upload processing failed."),

          uploadedAt: completionTime,

          savedPath: result.saved_path ?? null,

          size: result.size_bytes ?? selectedFile.size,
        };
      }),
    );

    const summary = {
      ...DEFAULT_UPLOAD_SUMMARY,
      ...(response?.summary || {}),
    };

    setUploadSummary(summary);

    setUploadResults(
      responseFiles.map((result, index) => {
        const submittedFile = submittedFiles[index];

        return {
          id: submittedFile?.id || `${index}-${Date.now()}`,

          filename:
            result?.filename || submittedFile?.filename || "Unknown file",

          status: normalizeUploadStatus(result?.status),

          message: result?.message || "No server message returned.",

          size: result?.size_bytes ?? submittedFile?.size ?? null,

          savedPath: result?.saved_path ?? null,

          uploadedAt: completionTime,
        };
      }),
    );

    return summary;
  }, []);
  const confirmUpload = useCallback(async () => {
    setShowUploadConfirmation(false);

    if (!validateUploadRequest()) {
      return;
    }

    const filesToUpload = selectedFiles.filter(
      (selectedFile) => selectedFile.status === "ready",
    );

    if (!filesToUpload.length) {
      setError("There are no ready PDF documents to upload.");

      return;
    }

    setIsUploading(true);
    setError("");
    setNotice("");
    setUploadResults([]);
    setUploadSummary(DEFAULT_UPLOAD_SUMMARY);

    markReadyFilesUploading();
    beginSimulatedProgress();

    try {
      console.log("FILES SENT");
      console.log(filesToUpload);

      const response = await uploadAdminDocuments({
        year: Number(selectedYear),
        month: selectedMonth,

        files: filesToUpload.map((selectedFile) => selectedFile.file),

        onUploadProgress: (progressEvent) => {
          const total = progressEvent.total;

          if (!total) {
            return;
          }

          const percentage = Math.round((progressEvent.loaded * 100) / total);

          updateFileProgress(Math.min(percentage, 97));

          console.log(`Upload progress: ${percentage}%`);
        },
      });

      /*
       * The response is only available after
       * uploadAdminDocuments has completed.
       */
      console.log("UPLOAD RESPONSE");
      console.log(response);

      console.log("RESPONSE FILES");
      console.log(response?.files);

      console.log("RESPONSE SUMMARY");
      console.log(response?.summary);

      clearProgressTimer();

      updateFileProgress(100);

      const summary = applyUploadResults(response, filesToUpload);

      const uploaded = Number(summary.uploaded || 0);

      const duplicates = Number(summary.duplicates || 0);

      const failed = Number(summary.failed || 0);

      if (uploaded > 0 && failed === 0 && duplicates === 0) {
        setNotice(
          `${uploaded} PDF document${
            uploaded === 1 ? "" : "s"
          } uploaded successfully.`,
        );
      } else if (uploaded > 0) {
        setNotice(
          `Upload completed: ${uploaded} uploaded, ` +
            `${duplicates} duplicate, and ${failed} failed.`,
        );
      } else if (duplicates > 0 && failed === 0) {
        setError(
          "All selected documents already exist " +
            "in the chosen dataset folder.",
        );
      } else {
        setError(
          "The server could not upload any of " + "the selected documents.",
        );
      }
    } catch (requestError) {
      console.error("UPLOAD REQUEST ERROR:", requestError);

      clearProgressTimer();

      const status = requestError?.response?.status;

      if (status === 401 || status === 403) {
        localStorage.removeItem("admin_token");

        localStorage.removeItem("admin_user");

        navigate("/admin/login", {
          replace: true,
        });

        return;
      }

      setSelectedFiles((currentFiles) =>
        currentFiles.map((selectedFile) => {
          if (selectedFile.status !== "uploading") {
            return selectedFile;
          }

          return {
            ...selectedFile,
            status: "failed",
            progress: 100,
            message: getErrorMessage(requestError),
            uploadedAt: new Date().toISOString(),
          };
        }),
      );

      setError(getErrorMessage(requestError));
    } finally {
      clearProgressTimer();
      setIsUploading(false);
    }
  }, [
    applyUploadResults,
    beginSimulatedProgress,
    clearProgressTimer,
    markReadyFilesUploading,
    navigate,
    selectedFiles,
    selectedMonth,
    selectedYear,
    updateFileProgress,
    validateUploadRequest,
  ]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      navigate("/admin/login", {
        replace: true,
      });

      return undefined;
    }

    const timer = window.setTimeout(() => {
      setInitialLoading(false);
    }, 850);

    return () => {
      window.clearTimeout(timer);
    };
  }, [navigate]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 4800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [notice]);

  useEffect(() => {
    if (!error) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setError("");
    }, 7000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [error]);

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (!isUploading) {
        setShowUploadConfirmation(false);

        setShowClearConfirmation(false);
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isUploading]);

  useEffect(
    () => () => {
      clearProgressTimer();
    },
    [clearProgressTimer],
  );

  if (initialLoading) {
    return <UploadPageLoader />;
  }

  return (
    <div
      className={`upload-documents-page ${
        sidebarCollapsed ? "sidebar-is-collapsed" : ""
      }`}
    >
      <div className="upload-page-background">
        <div className="upload-background-grid" />
        <div className="upload-background-orb upload-orb-one" />
        <div className="upload-background-orb upload-orb-two" />
        <div className="upload-background-orb upload-orb-three" />
      </div>

      {mobileSidebarOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {error && (
        <div className="upload-alert upload-error-alert">
          <AlertTriangle size={20} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close upload error"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {notice && (
        <div className="upload-alert upload-success-alert">
          <CheckCircle2 size={20} />

          <span>{notice}</span>

          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Close upload notification"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <aside
        className={`admin-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-brand">
          <img src={lexminerLogo} alt="LexMiner logo" />

          {!sidebarCollapsed && (
            <div>
              <strong>LexMiner</strong>
              <span>Legal Intelligence</span>
            </div>
          )}

          <button
            type="button"
            className="mobile-close-button"
            onClick={() => setMobileSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="sidebar-system-status">
          <span className="status-indicator" />

          {!sidebarCollapsed && (
            <div>
              <strong>System operational</strong>
              <span>AI services online</span>
            </div>
          )}
        </div>

        <nav className="sidebar-navigation">
          <button
            className="sidebar-link"
            onClick={() => navigate("/admin/dashboard")}
          >
            <Gauge size={21} />

            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/admin/profile")}
          >
            <CircleUserRound size={21} />

            {!sidebarCollapsed && <span>Profile</span>}
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/admin/user-management")}
          >
            <Users size={21} />

            {!sidebarCollapsed && <span>User Management</span>}
          </button>

          {/* ACTIVE PAGE */}
          <button className="sidebar-link active">
            <UploadCloud size={21} />

            {!sidebarCollapsed && <span>Upload Documents</span>}
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/admin/dataset-management")}
          >
            <Database size={21} />

            {!sidebarCollapsed && <span>Dataset Management</span>}
          </button>

          <button
            className="sidebar-link"
            onClick={() => navigate("/admin/vector-index")}
          >
            <BrainCircuit size={18} />
            {!sidebarCollapsed && <span>Vector Index</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-link logout-link"
            onClick={() => setShowLogoutConfirmation(true)}
          >
            <LogOut size={21} />

            {!sidebarCollapsed && <span>Logout</span>}
          </button>

          {!sidebarCollapsed && (
            <div className="sidebar-version">
              LexMiner Admin
              <span>Version 1.0.0</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-collapse-button"
          onClick={() => setSidebarCollapsed((current) => !current)}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={17} />
          ) : (
            <ChevronLeft size={17} />
          )}
        </button>
      </aside>

      <main className="profile-main">
        <header className="profile-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={23} />
            </button>

            <div>
              <span className="topbar-eyebrow">Administrator Console</span>

              <h1>Upload Documents</h1>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-live-status">
              <span />
              Secure
            </div>

            <button
              type="button"
              className="refresh-button"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw size={18} />

              <span>Refresh</span>
            </button>

            <button
              type="button"
              className="admin-account-button"
              onClick={() => navigate("/admin/profile")}
            >
              <img
                src={adminPicture}
                alt="Administrator"
                className="admin-avatar"
              />

              <div>
                <strong>Administrator</strong>

                <span>System Admin</span>
              </div>
            </button>
          </div>
        </header>

        <div className="upload-documents-content">
          <section className="upload-hero upload-animate">
            <div className="upload-hero-copy">
              <div className="upload-hero-label">
                <ShieldCheck size={16} />
                Secure document ingestion
              </div>

              <h1>
                Upload Supreme Court
                <span> Decision Documents</span>
              </h1>

              <p>
                Add official Philippine Supreme Court PDF decisions to the
                LexMiner dataset repository. Documents will be stored according
                to the selected decision year and month before they are imported
                and indexed.
              </p>

              <div className="upload-hero-features">
                <div>
                  <FileCheck2 size={18} />
                  PDF validation
                </div>

                <div>
                  <ShieldCheck size={18} />
                  Secure storage
                </div>

                <div>
                  <Layers3 size={18} />
                  Multiple file upload
                </div>
              </div>
            </div>

            <div className="upload-hero-visual">
              <div className="upload-visual-orbit upload-visual-orbit-one" />

              <div className="upload-visual-orbit upload-visual-orbit-two" />

              <div className="upload-visual-center">
                <UploadCloud size={62} />

                <span className="upload-visual-pulse" />
              </div>

              <div className="upload-visual-chip upload-chip-one">
                <FileText size={16} />
                PDF
              </div>

              <div className="upload-visual-chip upload-chip-two">
                <Database size={16} />
                Dataset
              </div>

              <div className="upload-visual-chip upload-chip-three">
                <Sparkles size={16} />
                AI Ready
              </div>
            </div>
          </section>

          <section className="upload-overview-grid">
            <UploadSummaryCard
              icon={FileText}
              title="Selected Documents"
              value={selectedFileStatistics.total}
              description="PDF files currently in the upload workspace."
              variant="selected"
            />

            <UploadSummaryCard
              icon={FileCheck2}
              title="Ready to Upload"
              value={selectedFileStatistics.ready}
              description="Validated documents ready for secure transfer."
              variant="ready"
            />

            <UploadSummaryCard
              icon={CheckCircle2}
              title="Uploaded"
              value={uploadSummary.uploaded}
              description="Documents successfully saved by the server."
              variant="uploaded"
            />

            <UploadSummaryCard
              icon={AlertTriangle}
              title="Issues Found"
              value={
                Number(uploadSummary.failed || 0) +
                Number(uploadSummary.duplicates || 0)
              }
              description="Failed or duplicate documents requiring review."
              variant="issues"
            />
          </section>

          <section className="upload-workspace-grid">
            <div className="upload-primary-column">
              <article className="upload-panel upload-animate upload-delay-one">
                <div className="upload-panel-heading">
                  <div>
                    <span>Dataset destination</span>

                    <h2>Decision Classification</h2>

                    <p>
                      Choose where the uploaded decisions will be stored inside
                      the LexMiner dataset directory.
                    </p>
                  </div>

                  <CalendarDays size={24} />
                </div>

                <div className="upload-classification-grid">
                  <div className="upload-form-group">
                    <label htmlFor="upload-year">Decision Year</label>

                    <div className="upload-select-wrapper">
                      <CalendarDays size={18} />

                      <select
                        id="upload-year"
                        value={selectedYear}
                        onChange={(event) =>
                          setSelectedYear(Number(event.target.value))
                        }
                        disabled={isUploading}
                      >
                        {availableYears.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>

                      <ChevronDown size={17} />
                    </div>

                    <small>
                      Allowed range: {minimumYear}–{maximumYear}
                    </small>
                  </div>

                  <div className="upload-form-group">
                    <label htmlFor="upload-month">Decision Month</label>

                    <div
                      className={`upload-select-wrapper ${
                        !selectedMonth && error ? "upload-field-attention" : ""
                      }`}
                    >
                      <CalendarDays size={18} />

                      <select
                        id="upload-month"
                        value={selectedMonth}
                        onChange={(event) =>
                          setSelectedMonth(event.target.value)
                        }
                        disabled={isUploading}
                      >
                        <option value="">Select decision month</option>

                        {DECISION_MONTHS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>

                      <ChevronDown size={17} />
                    </div>

                    <small>
                      Documents will be stored under the selected month.
                    </small>
                  </div>
                </div>

                <div className="upload-destination-preview">
                  <div className="upload-destination-icon">
                    <FolderOpen size={22} />
                  </div>

                  <div>
                    <span>Destination preview</span>

                    <strong>
                      datasets/{selectedYear}/{selectedMonth || "Select-Month"}
                    </strong>
                  </div>

                  <div className="upload-destination-status">
                    {selectedMonth ? (
                      <>
                        <CheckCircle2 size={17} />
                        Ready
                      </>
                    ) : (
                      <>
                        <CircleAlert size={17} />
                        Month required
                      </>
                    )}
                  </div>
                </div>
              </article>

              <article className="upload-panel upload-animate upload-delay-two">
                <div className="upload-panel-heading">
                  <div>
                    <span>Document selection</span>

                    <h2>Upload PDF Documents</h2>

                    <p>
                      Drag Supreme Court decision PDFs into the secure upload
                      zone or browse files from your computer.
                    </p>
                  </div>

                  <HardDriveUpload size={24} />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  multiple
                  className="upload-hidden-file-input"
                  onChange={handleFileInputChange}
                  disabled={isUploading}
                />

                <div
                  className={`upload-drop-zone ${
                    isDragging ? "upload-drop-zone-active" : ""
                  } ${isUploading ? "upload-drop-zone-disabled" : ""}`}
                  onDragEnter={handleDragEnter}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={isUploading ? -1 : 0}
                  onClick={handleBrowseFiles}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();

                      handleBrowseFiles();
                    }
                  }}
                  aria-label="Select PDF documents"
                >
                  <div className="upload-drop-zone-grid" />

                  <div className="upload-drop-icon-wrapper">
                    <div className="upload-drop-icon-ring" />

                    <CloudUpload size={48} />
                  </div>

                  <div className="upload-drop-copy">
                    <h3>
                      {isDragging
                        ? "Drop your PDF documents here"
                        : "Drag and drop PDF documents"}
                    </h3>

                    <p>
                      {isDragging
                        ? "Release the files to add them to the upload workspace."
                        : "Select one or multiple Philippine Supreme Court decision files."}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="upload-browse-button"
                    onClick={(event) => {
                      event.stopPropagation();

                      handleBrowseFiles();
                    }}
                    disabled={isUploading}
                  >
                    <FolderOpen size={18} />
                    Browse Documents
                  </button>

                  <div className="upload-drop-requirements">
                    <div>
                      <Check size={15} />
                      PDF only
                    </div>

                    <div>
                      <Check size={15} />
                      Multiple files
                    </div>

                    <div>
                      <Check size={15} />
                      Maximum {maximumFileSizeMb} MB each
                    </div>
                  </div>
                </div>

                {validationMessages.length > 0 && (
                  <div className="upload-validation-list">
                    <div className="upload-validation-heading">
                      <AlertTriangle size={18} />

                      <div>
                        <strong>Some files were not added</strong>

                        <span>Review the validation messages below.</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setValidationMessages([])}
                        aria-label="Dismiss validation messages"
                      >
                        <X size={17} />
                      </button>
                    </div>

                    <div className="upload-validation-items">
                      {validationMessages.map((validationMessage) => (
                        <div
                          key={validationMessage.id}
                          className={`upload-validation-item upload-validation-${validationMessage.variant}`}
                        >
                          {validationMessage.variant === "duplicate" ? (
                            <CircleAlert size={17} />
                          ) : (
                            <AlertTriangle size={17} />
                          )}

                          <div>
                            <strong>{validationMessage.filename}</strong>

                            <span>{validationMessage.message}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="selected-files-section">
                  <div className="selected-files-header">
                    <div>
                      <span>Upload queue</span>

                      <h3>Selected Documents</h3>

                      <p>
                        Review the selected PDF files before starting the secure
                        upload process.
                      </p>
                    </div>

                    <div className="selected-files-header-actions">
                      <div className="selected-files-total">
                        <FileText size={17} />

                        <span>
                          {selectedFiles.length} file
                          {selectedFiles.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {selectedFiles.length > 0 && (
                        <button
                          type="button"
                          className="clear-selected-button"
                          onClick={() => setShowClearConfirmation(true)}
                          disabled={isUploading}
                        >
                          <Trash2 size={17} />
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  {selectedFiles.length === 0 ? (
                    <div className="selected-files-empty-state">
                      <div className="selected-empty-icon">
                        <FileText size={34} />
                      </div>

                      <h4>No PDF documents selected</h4>

                      <p>
                        Browse or drag documents into the upload area to begin
                        preparing a secure upload batch.
                      </p>

                      <button
                        type="button"
                        onClick={handleBrowseFiles}
                        disabled={isUploading}
                      >
                        <FolderOpen size={17} />
                        Select Documents
                      </button>
                    </div>
                  ) : (
                    <div className="selected-files-list">
                      {selectedFiles.map((selectedFile, index) => (
                        <article
                          key={selectedFile.id}
                          className={`selected-file-card selected-file-${selectedFile.status}`}
                          style={{
                            "--selected-file-delay": `${index * 45}ms`,
                          }}
                        >
                          <div className="selected-file-index">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="selected-file-icon">
                            <FileText size={22} />
                          </div>

                          <div className="selected-file-information">
                            <div className="selected-file-name-row">
                              <div>
                                <strong title={selectedFile.filename}>
                                  {selectedFile.filename}
                                </strong>

                                <span>{formatFileSize(selectedFile.size)}</span>
                              </div>

                              <UploadStatusBadge status={selectedFile.status} />
                            </div>

                            <div className="selected-file-metadata">
                              <span>
                                <CalendarDays size={14} />
                                Modified{" "}
                                {formatUploadDate(selectedFile.lastModified)}
                              </span>

                              <span>
                                <HardDriveUpload size={14} />

                                {selectedFile.type || "application/pdf"}
                              </span>
                            </div>

                            <div className="selected-file-progress-section">
                              <div className="selected-file-progress-heading">
                                <span>{selectedFile.message}</span>

                                <strong>
                                  {Math.round(
                                    Number(selectedFile.progress || 0),
                                  )}
                                  %
                                </strong>
                              </div>

                              <div className="selected-file-progress-track">
                                <span
                                  className={`selected-file-progress-bar selected-progress-${selectedFile.status}`}
                                  style={{
                                    width: `${Math.min(
                                      Math.max(
                                        Number(selectedFile.progress || 0),
                                        0,
                                      ),
                                      100,
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>

                            {selectedFile.savedPath && (
                              <div className="selected-file-path">
                                <FolderOpen size={14} />

                                <span title={selectedFile.savedPath}>
                                  {selectedFile.savedPath}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="selected-file-actions">
                            {selectedFile.status === "uploaded" && (
                              <div className="selected-file-success-indicator">
                                <CheckCircle2 size={19} />
                              </div>
                            )}

                            {selectedFile.status === "duplicate" && (
                              <div className="selected-file-duplicate-indicator">
                                <CircleAlert size={19} />
                              </div>
                            )}

                            {selectedFile.status === "failed" && (
                              <div className="selected-file-error-indicator">
                                <AlertTriangle size={19} />
                              </div>
                            )}

                            {selectedFile.status === "uploading" && (
                              <LoaderCircle
                                size={20}
                                className="spin-icon selected-file-spinner"
                              />
                            )}

                            {selectedFile.status === "ready" && (
                              <button
                                type="button"
                                className="remove-selected-file-button"
                                onClick={() =>
                                  removeSelectedFile(selectedFile.id)
                                }
                                disabled={isUploading}
                                aria-label={`Remove ${selectedFile.filename}`}
                                title="Remove document"
                              >
                                <X size={18} />
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>

                <div className="upload-batch-footer">
                  <div className="upload-batch-information">
                    <div>
                      <span>Total documents</span>

                      <strong>{selectedFileStatistics.total}</strong>
                    </div>

                    <div>
                      <span>Total file size</span>

                      <strong>{formatFileSize(totalSelectedSize)}</strong>
                    </div>

                    <div>
                      <span>Ready documents</span>

                      <strong>{selectedFileStatistics.ready}</strong>
                    </div>
                  </div>

                  <div className="upload-batch-actions">
                    <button
                      type="button"
                      className="upload-reset-button"
                      onClick={resetUploadWorkspace}
                      disabled={isUploading || selectedFiles.length === 0}
                    >
                      <RotateCcw size={18} />
                      Reset Workspace
                    </button>

                    <button
                      type="button"
                      className="upload-submit-button"
                      onClick={openUploadConfirmation}
                      disabled={uploadDisabled}
                    >
                      {isUploading ? (
                        <LoaderCircle size={19} className="spin-icon" />
                      ) : (
                        <UploadCloud size={19} />
                      )}

                      {isUploading
                        ? "Uploading Documents..."
                        : "Upload Documents"}
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <aside className="upload-secondary-column">
              <article className="upload-panel upload-animate upload-delay-three">
                <div className="upload-panel-heading compact-heading">
                  <div>
                    <span>Batch status</span>

                    <h2>Upload Monitor</h2>
                  </div>

                  <RefreshCcw
                    size={23}
                    className={isUploading ? "spin-icon" : ""}
                  />
                </div>

                <div className="upload-monitor-list">
                  <div className="upload-monitor-item">
                    <div className="upload-monitor-icon upload-monitor-ready">
                      <FileCheck2 size={20} />
                    </div>

                    <div>
                      <span>Ready</span>

                      <strong>{selectedFileStatistics.ready}</strong>
                    </div>

                    <small>Validated PDFs</small>
                  </div>

                  <div className="upload-monitor-item">
                    <div className="upload-monitor-icon upload-monitor-progress">
                      <CloudUpload size={20} />
                    </div>

                    <div>
                      <span>Uploading</span>

                      <strong>{selectedFileStatistics.uploading}</strong>
                    </div>

                    <small>Active transfers</small>
                  </div>

                  <div className="upload-monitor-item">
                    <div className="upload-monitor-icon upload-monitor-success">
                      <CheckCircle2 size={20} />
                    </div>

                    <div>
                      <span>Uploaded</span>

                      <strong>{selectedFileStatistics.uploaded}</strong>
                    </div>

                    <small>Stored documents</small>
                  </div>

                  <div className="upload-monitor-item">
                    <div className="upload-monitor-icon upload-monitor-warning">
                      <CircleAlert size={20} />
                    </div>

                    <div>
                      <span>Duplicates</span>

                      <strong>{selectedFileStatistics.duplicate}</strong>
                    </div>

                    <small>Existing files</small>
                  </div>

                  <div className="upload-monitor-item">
                    <div className="upload-monitor-icon upload-monitor-failed">
                      <AlertTriangle size={20} />
                    </div>

                    <div>
                      <span>Failed</span>

                      <strong>{selectedFileStatistics.failed}</strong>
                    </div>

                    <small>Upload errors</small>
                  </div>
                </div>

                <div className="upload-monitor-progress">
                  <div className="upload-monitor-progress-heading">
                    <span>Batch completion</span>

                    <strong>
                      {selectedFiles.length > 0
                        ? Math.round(
                            ((selectedFileStatistics.uploaded +
                              selectedFileStatistics.duplicate +
                              selectedFileStatistics.failed) /
                              selectedFiles.length) *
                              100,
                          )
                        : 0}
                      %
                    </strong>
                  </div>

                  <div className="upload-monitor-progress-track">
                    <span
                      style={{
                        width: `${
                          selectedFiles.length > 0
                            ? Math.round(
                                ((selectedFileStatistics.uploaded +
                                  selectedFileStatistics.duplicate +
                                  selectedFileStatistics.failed) /
                                  selectedFiles.length) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </article>
              <article className="upload-panel upload-animate upload-delay-four">
                <div className="upload-panel-heading compact-heading">
                  <div>
                    <span>Upload requirements</span>

                    <h2>Document Guidelines</h2>
                  </div>

                  <Info size={23} />
                </div>

                <div className="upload-guidelines-list">
                  <div className="upload-guideline-item">
                    <div className="upload-guideline-number">01</div>

                    <div>
                      <strong>Official PDF documents</strong>

                      <span>
                        Upload only authentic Philippine Supreme Court decision
                        documents saved in PDF format.
                      </span>
                    </div>

                    <FileCheck2 size={19} />
                  </div>

                  <div className="upload-guideline-item">
                    <div className="upload-guideline-number">02</div>

                    <div>
                      <strong>Correct decision classification</strong>

                      <span>
                        Select the year and month corresponding to the official
                        decision date before uploading.
                      </span>
                    </div>

                    <CalendarDays size={19} />
                  </div>

                  <div className="upload-guideline-item">
                    <div className="upload-guideline-number">03</div>

                    <div>
                      <strong>Unique filenames</strong>

                      <span>
                        Existing files are protected. Documents with duplicate
                        filenames will not overwrite stored decisions.
                      </span>
                    </div>

                    <ShieldCheck size={19} />
                  </div>

                  <div className="upload-guideline-item">
                    <div className="upload-guideline-number">04</div>

                    <div>
                      <strong>Maximum file size</strong>

                      <span>
                        Each selected PDF must not exceed {maximumFileSizeMb}{" "}
                        MB.
                      </span>
                    </div>

                    <HardDriveUpload size={19} />
                  </div>
                </div>

                <div className="upload-security-note">
                  <ShieldCheck size={19} />

                  <div>
                    <strong>Secure upload validation</strong>

                    <span>
                      The backend validates file extensions, content types, file
                      size, PDF signatures, and duplicate filenames before
                      permanently storing documents.
                    </span>
                  </div>
                </div>
              </article>

              <article className="upload-panel upload-animate upload-delay-five">
                <div className="upload-panel-heading compact-heading">
                  <div>
                    <span>Storage preview</span>

                    <h2>Batch Information</h2>
                  </div>

                  <Database size={23} />
                </div>

                <div className="upload-batch-preview">
                  <div className="upload-batch-preview-item">
                    <span>Decision year</span>

                    <strong>{selectedYear || "Not selected"}</strong>
                  </div>

                  <div className="upload-batch-preview-item">
                    <span>Decision month</span>

                    <strong>{selectedMonth || "Not selected"}</strong>
                  </div>

                  <div className="upload-batch-preview-item">
                    <span>Selected documents</span>

                    <strong>{selectedFiles.length}</strong>
                  </div>

                  <div className="upload-batch-preview-item">
                    <span>Combined size</span>

                    <strong>{formatFileSize(totalSelectedSize)}</strong>
                  </div>

                  <div className="upload-batch-preview-item upload-batch-preview-wide">
                    <span>Target directory</span>

                    <strong>
                      datasets/{selectedYear}/{selectedMonth || "Select-Month"}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="upload-review-button"
                  onClick={openUploadConfirmation}
                  disabled={uploadDisabled}
                >
                  <CloudUpload size={18} />
                  Review Upload Batch
                </button>
              </article>
            </aside>
          </section>

          {uploadResults.length > 0 && (
            <section className="upload-results-section upload-animate upload-delay-six">
              <div className="upload-results-heading">
                <div>
                  <span>Server response</span>

                  <h2>Upload Results</h2>

                  <p>
                    Review the outcome returned by the secure document upload
                    service for every submitted PDF.
                  </p>
                </div>

                <div className="upload-results-heading-actions">
                  <div className="upload-results-date">
                    <CalendarDays size={17} />

                    {formatUploadDate(uploadResults[0]?.uploadedAt)}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUploadResults([]);
                      setUploadSummary(DEFAULT_UPLOAD_SUMMARY);
                    }}
                    disabled={isUploading}
                  >
                    <X size={17} />
                    Dismiss Results
                  </button>
                </div>
              </div>

              <div className="upload-result-summary-grid">
                <div className="upload-result-summary-item upload-result-received">
                  <div>
                    <Layers3 size={20} />
                  </div>

                  <span>Received</span>

                  <strong>{uploadSummary.received}</strong>
                </div>

                <div className="upload-result-summary-item upload-result-uploaded">
                  <div>
                    <CheckCircle2 size={20} />
                  </div>

                  <span>Uploaded</span>

                  <strong>{uploadSummary.uploaded}</strong>
                </div>

                <div className="upload-result-summary-item upload-result-duplicate">
                  <div>
                    <CircleAlert size={20} />
                  </div>

                  <span>Duplicates</span>

                  <strong>{uploadSummary.duplicates}</strong>
                </div>

                <div className="upload-result-summary-item upload-result-failed">
                  <div>
                    <AlertTriangle size={20} />
                  </div>

                  <span>Failed</span>

                  <strong>{uploadSummary.failed}</strong>
                </div>
              </div>

              <div className="upload-results-table-wrapper">
                <table className="upload-results-table">
                  <thead>
                    <tr>
                      <th>Document</th>

                      <th>Status</th>

                      <th>File Size</th>

                      <th>Server Message</th>

                      <th>Saved Location</th>
                    </tr>
                  </thead>

                  <tbody>
                    {uploadResults.map((result, index) => (
                      <tr
                        key={result.id}
                        style={{
                          "--result-row-delay": `${index * 45}ms`,
                        }}
                      >
                        <td>
                          <div className="upload-result-document">
                            <div>
                              <FileText size={18} />
                            </div>

                            <span title={result.filename}>
                              {result.filename}
                            </span>
                          </div>
                        </td>

                        <td>
                          <UploadStatusBadge status={result.status} />
                        </td>

                        <td>
                          {result.size
                            ? formatFileSize(result.size)
                            : "Not available"}
                        </td>

                        <td>
                          <span className="upload-result-message">
                            {result.message}
                          </span>
                        </td>

                        <td>
                          {result.savedPath ? (
                            <div
                              className="upload-result-path"
                              title={result.savedPath}
                            >
                              <FolderOpen size={15} />

                              <span>{result.savedPath}</span>
                            </div>
                          ) : (
                            <span className="upload-result-empty-value">
                              Not stored
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <footer className="upload-page-footer">
            <div>
              <span>System Administrator Console</span>
            </div>

            <p>© 2026 LexMiner AI Adaptive Language Case Decision Miner</p>
          </footer>
        </div>
      </main>

      {showUploadConfirmation && (
        <div
          className="upload-confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUploading) {
              setShowUploadConfirmation(false);
            }
          }}
        >
          <div
            className="upload-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-confirmation-title"
          >
            <button
              type="button"
              className="upload-modal-close-button"
              onClick={() => setShowUploadConfirmation(false)}
              disabled={isUploading}
              aria-label="Close upload confirmation"
            >
              <X size={19} />
            </button>

            <div className="upload-confirmation-icon">
              <UploadCloud size={34} />
            </div>

            <span className="upload-modal-eyebrow">
              Secure upload confirmation
            </span>

            <h2 id="upload-confirmation-title">Upload Selected Documents?</h2>

            <p>
              You are about to upload{" "}
              <strong>
                {selectedFileStatistics.ready} PDF document
                {selectedFileStatistics.ready === 1 ? "" : "s"}
              </strong>{" "}
              to the{" "}
              <strong>
                {selectedYear}/{selectedMonth}
              </strong>{" "}
              dataset directory.
            </p>

            <div className="upload-confirmation-summary">
              <div>
                <span>Documents</span>

                <strong>{selectedFileStatistics.ready}</strong>
              </div>

              <div>
                <span>Combined size</span>

                <strong>
                  {formatFileSize(
                    selectedFiles
                      .filter((selectedFile) => selectedFile.status === "ready")
                      .reduce(
                        (total, selectedFile) =>
                          total + Number(selectedFile.size || 0),
                        0,
                      ),
                  )}
                </strong>
              </div>

              <div>
                <span>Destination</span>

                <strong>
                  {selectedYear}/{selectedMonth}
                </strong>
              </div>
            </div>

            <div className="upload-confirmation-warning">
              <ShieldCheck size={18} />

              <span>
                Existing files with duplicate filenames will not be overwritten.
              </span>
            </div>

            <div className="upload-modal-actions">
              <button
                type="button"
                className="upload-modal-cancel-button"
                onClick={() => setShowUploadConfirmation(false)}
                disabled={isUploading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="upload-modal-confirm-button"
                onClick={confirmUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <LoaderCircle size={18} className="spin-icon" />
                ) : (
                  <UploadCloud size={18} />
                )}

                {isUploading ? "Uploading..." : "Confirm Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirmation && (
        <div
          className="upload-confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isUploading) {
              setShowClearConfirmation(false);
            }
          }}
        >
          <div
            className="upload-confirmation-modal upload-clear-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-confirmation-title"
          >
            <button
              type="button"
              className="upload-modal-close-button"
              onClick={() => setShowClearConfirmation(false)}
              disabled={isUploading}
              aria-label="Close clear confirmation"
            >
              <X size={19} />
            </button>

            <div className="upload-confirmation-icon upload-clear-confirmation-icon">
              <Trash2 size={32} />
            </div>

            <span className="upload-modal-eyebrow">Workspace confirmation</span>

            <h2 id="clear-confirmation-title">Clear Selected Documents?</h2>

            <p>
              This will remove all <strong>{selectedFiles.length}</strong>{" "}
              document
              {selectedFiles.length === 1 ? "" : "s"} from the current upload
              workspace. Files already stored on the server will not be deleted.
            </p>

            <div className="upload-modal-actions">
              <button
                type="button"
                className="upload-modal-cancel-button"
                onClick={() => setShowClearConfirmation(false)}
                disabled={isUploading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="upload-modal-clear-button"
                onClick={clearSelectedFiles}
                disabled={isUploading}
              >
                <Trash2 size={18} />
                Clear Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirmation && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowLogoutConfirmation(false);
            }
          }}
        >
          <div
            className="confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={() => setShowLogoutConfirmation(false)}
              aria-label="Close logout confirmation"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon logout-confirmation-icon">
              <LogOut size={31} />
            </div>

            <span className="modal-eyebrow">Session confirmation</span>

            <h2 id="logout-modal-title">Logout Administrator?</h2>

            <p>
              Are you sure you want to end your LexMiner administrator session?
            </p>

            <div className="confirmation-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={() => setShowLogoutConfirmation(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-logout-button"
                onClick={confirmLogout}
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
