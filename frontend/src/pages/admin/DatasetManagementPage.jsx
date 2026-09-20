import { useCallback, useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  BrainCircuit,
  Download,
  Eye,
  Play,
  RotateCcw,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Database,
  FileText,
  Gauge,
  Layers3,
  LoaderCircle,
  LogOut,
  Menu,
  RefreshCcw,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  Users,
  X,
  CalendarDays,
  Check,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import lexminerLogo from "../../assets/lexminer-logo.png";
import adminPicture from "../../assets/admin-picture.png";

import {
  deleteAdminDataset,
  downloadAdminDatasetPdf,
  getAdminDatasetImportJob,
  startAdminDatasetImportJob,
  getAdminDataset,
  getAdminDatasetErrorMessage,
  getAdminDatasetPage,
  openAdminDatasetPdf,
  processAdminDataset,
  reprocessAdminDataset,
  retryAdminDataset,
  getAdminDatasetQueue,
} from "../../services/adminDatasetService";

import { getAdminProfile } from "../../services/adminProfileService";

import "../../styles/admin-profile.css";
import "../../styles/dataset-management.css";

/* =====================================================
   DEFAULT ADMIN PROFILE
===================================================== */

const DEFAULT_PROFILE = {
  id: null,
  first_name: "",
  last_name: "",
  email: "",
  profile_picture: null,
  role: "",
};

const DEFAULT_IMPORT_PROGRESS = {
  percentage: 0,
  stage: "Waiting",
  startedAt: null,
  elapsedSeconds: 0,
  estimatedTotalSeconds: 0,
  estimatedRemainingSeconds: 0,
  estimatedFinishAt: null,
  processedFiles: 0,
  totalFiles: 0,
  completedFiles: 0,
  failedFiles: 0,
  currentFilename: null,
};

const IMPORT_JOB_STORAGE_KEY = "lexminer_active_dataset_import_job";

/* =====================================================
   DEFAULT DATASET RESPONSE
===================================================== */

const DEFAULT_DATASET_LIST = {
  total: 0,
  skip: 0,
  limit: 25,
  datasets: [],
};

/* =====================================================
   DEFAULT FILTERS
===================================================== */

const DEFAULT_FILTERS = {
  filename: "",
  importStatus: "",
  year: "",
  month: "",
  isIndexed: "",
};

/* =====================================================
   DEFAULT DATASET QUEUE
===================================================== */

const DEFAULT_QUEUE_FILTERS = {
  filename: "",
  queueStatus: "",
  year: "",
  month: "",
};

const DEFAULT_DATASET_QUEUE = {
  summary: {
    pending: 0,
    failed: 0,
    total: 0,
  },
  total: 0,
  skip: 0,
  limit: 25,
  items: [],
};
/* =====================================================
   IMPORT STATUS OPTIONS
===================================================== */

const IMPORT_STATUS_OPTIONS = [
  {
    value: "",
    label: "All Statuses",
  },
  {
    value: "PENDING",
    label: "Pending",
  },
  {
    value: "EXTRACTING",
    label: "Extracting",
  },
  {
    value: "CLEANING",
    label: "Cleaning",
  },
  {
    value: "CHUNKING",
    label: "Chunking",
  },
  {
    value: "INDEXING",
    label: "Indexing",
  },
  {
    value: "COMPLETED",
    label: "Completed",
  },
  {
    value: "FAILED",
    label: "Failed",
  },
];

/* =====================================================
   MONTH OPTIONS
===================================================== */

const MONTH_OPTIONS = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* =====================================================
   INDEX FILTER OPTIONS
===================================================== */

const INDEX_FILTER_OPTIONS = [
  {
    value: "",
    label: "All Index States",
  },
  {
    value: "true",
    label: "Indexed",
  },
  {
    value: "false",
    label: "Not Indexed",
  },
];

/* =====================================================
   PAGE SIZE OPTIONS
===================================================== */

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/* =====================================================
   ACTION TYPES
===================================================== */

const ACTION_TYPES = {
  PROCESS: "PROCESS",
  RETRY: "RETRY",
  REPROCESS: "REPROCESS",
  DELETE: "DELETE",
};

/* =====================================================
   NORMALIZE STATUS
===================================================== */

function normalizeStatus(value) {
  return String(value || "UNKNOWN")
    .trim()
    .toUpperCase();
}

/* =====================================================
   FORMAT READABLE VALUE
===================================================== */

function formatReadableValue(value) {
  if (!value) {
    return "Not available";
  }

  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

/* =====================================================
   FORMAT NUMBER
===================================================== */

function formatNumber(value) {
  return new Intl.NumberFormat("en-PH").format(Number(value) || 0);
}

/* =====================================================
    FORMAT DURATION
===================================================== */
function formatDuration(totalSeconds) {
  const seconds = Math.max(Math.floor(Number(totalSeconds) || 0), 0);

  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);

  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);

  return `${hours}h ${minutes % 60}m`;
}

function formatEstimatedFinish(value) {
  if (!value) {
    return "Calculating...";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Calculating...";
  }

  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/* =====================================================
   FORMAT FILE SIZE
===================================================== */

function formatFileSize(bytes) {
  const numericBytes = Number(bytes);

  if (!Number.isFinite(numericBytes) || numericBytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];

  const unitIndex = Math.min(
    Math.floor(Math.log(numericBytes) / Math.log(1024)),
    units.length - 1,
  );

  const size = numericBytes / 1024 ** unitIndex;

  return `${size.toFixed(unitIndex === 0 ? 0 : 2)} ${units[unitIndex]}`;
}

/* =====================================================
   FORMAT DATE
===================================================== */

function formatDate(value) {
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

/* =====================================================
   ACTIVE IMPORT JOB STORAGE
===================================================== */

function saveActiveImportJob(jobId) {
  if (!jobId) {
    return;
  }

  localStorage.setItem(IMPORT_JOB_STORAGE_KEY, String(jobId));
}

function clearActiveImportJob() {
  localStorage.removeItem(IMPORT_JOB_STORAGE_KEY);
}
/* =====================================================
   DATASET PAGE LOADER
===================================================== */

function DatasetManagementLoader() {
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
          Loading dataset management center...
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   STATUS BADGE
===================================================== */

function DatasetStatusBadge({ status }) {
  const normalizedStatus = normalizeStatus(status);

  const className = normalizedStatus.toLowerCase().replaceAll("_", "-");

  return (
    <span className={`dataset-status-badge ` + `dataset-status-${className}`}>
      {normalizedStatus === "COMPLETED" ? (
        <CheckCircle2 size={14} />
      ) : normalizedStatus === "FAILED" ? (
        <AlertTriangle size={14} />
      ) : normalizedStatus === "PENDING" ? (
        <Clock3 size={14} />
      ) : (
        <LoaderCircle
          size={14}
          className={
            ["EXTRACTING", "CLEANING", "CHUNKING", "INDEXING"].includes(
              normalizedStatus,
            )
              ? "spin-icon"
              : ""
          }
        />
      )}

      {formatReadableValue(normalizedStatus)}
    </span>
  );
}

/* =====================================================
   MAIN PAGE
===================================================== */

export default function DatasetManagementPage() {
  const navigate = useNavigate();

  /* ===================================================
     ADMIN PROFILE STATE
  =================================================== */

  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  /* ===================================================
     DATASET STATE
  =================================================== */

  const [datasetList, setDatasetList] = useState(DEFAULT_DATASET_LIST);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  const [currentPage, setCurrentPage] = useState(1);

  const [pageSize, setPageSize] = useState(25);

  const [importJobId, setImportJobId] = useState(() => {
    const storedJobId = localStorage.getItem(IMPORT_JOB_STORAGE_KEY);

    return storedJobId || null;
  });

  const [importProgress, setImportProgress] = useState(DEFAULT_IMPORT_PROGRESS);

  const [importProgressComplete, setImportProgressComplete] = useState(false);

  /* ===================================================
     LOADING STATE
  =================================================== */

  const [initialLoading, setInitialLoading] = useState(true);

  const [datasetsLoading, setDatasetsLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const [importLoading, setImportLoading] = useState(false);

  const [detailsLoading, setDetailsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState(false);

  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  const [downloadLoadingId, setDownloadLoadingId] = useState(null);

  /* ===================================================
     SIDEBAR STATE
  =================================================== */

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  /* ===================================================
     FEEDBACK STATE
  =================================================== */

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  /* ===================================================
     MODAL STATE
  =================================================== */

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [showImportConfirmation, setShowImportConfirmation] = useState(false);

  const [showActionConfirmation, setShowActionConfirmation] = useState(false);

  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

  const [datasetDetails, setDatasetDetails] = useState(null);

  const [pendingActionType, setPendingActionType] = useState(null);

  const [pendingActionDataset, setPendingActionDataset] = useState(null);

  const [deleteOriginalFile, setDeleteOriginalFile] = useState(false);

  const [datasetQueue, setDatasetQueue] = useState(DEFAULT_DATASET_QUEUE);

  const [queueFilters, setQueueFilters] = useState(DEFAULT_QUEUE_FILTERS);

  const [appliedQueueFilters, setAppliedQueueFilters] = useState(
    DEFAULT_QUEUE_FILTERS,
  );

  const [queuePage, setQueuePage] = useState(1);

  const [queuePageSize, setQueuePageSize] = useState(25);

  const [queueLoading, setQueueLoading] = useState(false);
  /* ===================================================
     AUTHENTICATION REDIRECT
  =================================================== */

  const redirectToAdminLogin = useCallback(() => {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_user");

    navigate("/admin/login", {
      replace: true,
    });
  }, [navigate]);

  /* ===================================================
     REQUEST ERROR HANDLER
  =================================================== */

  const handleRequestError = useCallback(
    (requestError) => {
      const status = requestError?.response?.status;

      if (status === 401 || status === 403) {
        redirectToAdminLogin();

        return;
      }

      setError(getAdminDatasetErrorMessage(requestError));
    },
    [redirectToAdminLogin],
  );

  /* ===================================================
     ADMIN PROFILE LOADING
  =================================================== */

  const loadAdminProfile = useCallback(async () => {
    try {
      const result = await getAdminProfile();

      setProfile({
        ...DEFAULT_PROFILE,
        ...result,
      });

      return result;
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 401 || status === 403) {
        redirectToAdminLogin();

        return null;
      }

      setError(getAdminDatasetErrorMessage(requestError));

      return null;
    }
  }, [redirectToAdminLogin]);

  /* =====================================================
    DATASET QUEUE STATE
===================================================== */

  const fetchDatasetQueue = useCallback(
    async ({
      page = 1,
      size = 25,
      filtersToUse = DEFAULT_QUEUE_FILTERS,
    } = {}) => {
      setQueueLoading(true);

      try {
        const result = await getAdminDatasetQueue({
          page,
          pageSize: size,

          queueStatus: filtersToUse?.queueStatus || "",

          filename: filtersToUse?.filename || "",

          year: filtersToUse?.year || "",

          month: filtersToUse?.month || "",
        });

        setDatasetQueue({
          summary: {
            pending: Number(result?.summary?.pending || 0),

            failed: Number(result?.summary?.failed || 0),

            total: Number(result?.summary?.total || 0),
          },

          total: Number(result?.total || 0),

          skip: Number(result?.skip || 0),

          limit: Number(result?.limit || size),

          items: Array.isArray(result?.items) ? result.items : [],
        });

        return result;
      } catch (requestError) {
        handleRequestError(requestError);

        return null;
      } finally {
        setQueueLoading(false);
      }
    },
    [handleRequestError],
  );

  const queueTotalPages = useMemo(
    () => Math.max(Math.ceil(datasetQueue.total / queuePageSize), 1),
    [datasetQueue.total, queuePageSize],
  );

  const queueVisiblePages = useMemo(() => {
    const pages = [];

    const start = Math.max(queuePage - 2, 1);

    const end = Math.min(start + 4, queueTotalPages);

    const adjustedStart = Math.max(end - 4, 1);

    for (let page = adjustedStart; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  }, [queuePage, queueTotalPages]);

  const handleQueueFilterChange = useCallback((field, value) => {
    setQueueFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const applyQueueFilters = useCallback(() => {
    setQueuePage(1);

    setAppliedQueueFilters({
      filename: String(queueFilters.filename || "").trim(),

      queueStatus: queueFilters.queueStatus,

      year: queueFilters.year,

      month: queueFilters.month,
    });
  }, [queueFilters]);

  const resetQueueFilters = useCallback(() => {
    setQueueFilters(DEFAULT_QUEUE_FILTERS);

    setAppliedQueueFilters(DEFAULT_QUEUE_FILTERS);

    setQueuePage(1);
  }, []);

  const handleQueuePageSizeChange = useCallback((event) => {
    setQueuePageSize(Number(event.target.value) || 25);

    setQueuePage(1);
  }, []);

  const goToQueuePage = useCallback(
    (requestedPage) => {
      setQueuePage(
        Math.min(Math.max(Number(requestedPage) || 1, 1), queueTotalPages),
      );
    },
    [queueTotalPages],
  );

  useEffect(() => {
    if (initialLoading) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void fetchDatasetQueue({
        page: queuePage,
        size: queuePageSize,
        filtersToUse: appliedQueueFilters,
      });
    }, 150);

    return () => window.clearTimeout(timer);
  }, [
    appliedQueueFilters,
    fetchDatasetQueue,
    initialLoading,
    queuePage,
    queuePageSize,
  ]);

  /* ===================================================
     DATASET LOADING
  =================================================== */

  const fetchDatasets = useCallback(
    async ({
      page = 1,
      size = 25,
      filtersToUse = DEFAULT_FILTERS,
      showLoader = true,
    } = {}) => {
      const normalizedPage = Math.max(Number(page) || 1, 1);

      const normalizedSize = Math.min(Math.max(Number(size) || 25, 1), 100);

      const normalizedFilters = {
        filename: String(filtersToUse?.filename || "").trim(),

        importStatus: filtersToUse?.importStatus || "",

        year: filtersToUse?.year || "",

        month: filtersToUse?.month || "",

        isIndexed: filtersToUse?.isIndexed ?? "",
      };

      if (showLoader) {
        setDatasetsLoading(true);
      }

      setError("");

      try {
        const response = await getAdminDatasetPage({
          page: normalizedPage,

          pageSize: normalizedSize,

          filename: normalizedFilters.filename,

          importStatus: normalizedFilters.importStatus,

          year: normalizedFilters.year,

          month: normalizedFilters.month,

          isIndexed: normalizedFilters.isIndexed,
        });

        const normalizedResponse = {
          total: Number(response?.total ?? 0),

          skip: Number(response?.skip ?? (normalizedPage - 1) * normalizedSize),

          limit: Number(response?.limit ?? normalizedSize),

          datasets: Array.isArray(response?.datasets) ? response.datasets : [],
        };

        setDatasetList(normalizedResponse);

        const resolvedTotalPages = Math.max(
          Math.ceil(normalizedResponse.total / normalizedSize),
          1,
        );

        if (normalizedPage > resolvedTotalPages) {
          setCurrentPage(resolvedTotalPages);
        }

        return normalizedResponse;
      } catch (requestError) {
        handleRequestError(requestError);

        return null;
      } finally {
        if (showLoader) {
          setDatasetsLoading(false);
        }
      }
    },
    [handleRequestError],
  );

  /* ===================================================
     INITIAL PAGE LOAD
  =================================================== */

  useEffect(() => {
    const token = localStorage.getItem("admin_token");

    if (!token) {
      redirectToAdminLogin();

      return undefined;
    }

    let componentActive = true;

    const loadingTimer = window.setTimeout(async () => {
      await Promise.all([
        loadAdminProfile(),

        fetchDatasets({
          page: 1,
          size: 25,
          filtersToUse: DEFAULT_FILTERS,
          showLoader: false,
        }),

        fetchDatasetQueue({
          page: 1,
          size: 25,
          filtersToUse: DEFAULT_QUEUE_FILTERS,
        }),
      ]);

      if (componentActive) {
        setInitialLoading(false);
      }
    }, 700);

    return () => {
      componentActive = false;

      window.clearTimeout(loadingTimer);
    };
  }, [
    fetchDatasets,
    loadAdminProfile,
    redirectToAdminLogin,
    fetchDatasetQueue,
  ]);

  /* ===================================================
     RELOAD DATASETS WHEN PAGINATION OR FILTERS CHANGE
  =================================================== */

  useEffect(() => {
    if (initialLoading) {
      return undefined;
    }

    let componentActive = true;

    const requestTimer = window.setTimeout(async () => {
      if (!componentActive) {
        return;
      }

      await fetchDatasets({
        page: currentPage,

        size: pageSize,

        filtersToUse: appliedFilters,

        showLoader: true,
      });
    }, 150);

    return () => {
      componentActive = false;

      window.clearTimeout(requestTimer);
    };
  }, [appliedFilters, currentPage, fetchDatasets, initialLoading, pageSize]);

  /* ===================================================
     AUTO-HIDE NOTICE
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
     AUTO-HIDE ERROR
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
     ESCAPE KEY HANDLER
  =================================================== */

  useEffect(() => {
    function handleEscape(event) {
      if (event.key !== "Escape") {
        return;
      }

      if (actionLoading || importLoading) {
        return;
      }

      setShowDetailsModal(false);

      setShowImportConfirmation(false);

      setShowActionConfirmation(false);

      setShowLogoutConfirmation(false);

      setMobileSidebarOpen(false);
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, [actionLoading, importLoading]);

  /* ===================================================
   DATASET IMPORT JOB HANDLERS
=================================================== */

  useEffect(() => {
    if (!importJobId) {
      return undefined;
    }

    let active = true;
    let pollingTimer = null;

    const pollImportJob = async () => {
      try {
        const job = await getAdminDatasetImportJob(importJobId);

        if (!active) {
          return;
        }

        const normalizedStatus = normalizeStatus(job?.status);

        const startedAt = job?.started_at
          ? new Date(job.started_at).getTime()
          : null;

        const elapsedSeconds = startedAt
          ? Math.max(Math.floor((Date.now() - startedAt) / 1000), 0)
          : 0;

        setImportProgress({
          ...DEFAULT_IMPORT_PROGRESS,

          percentage: Number(job?.progress_percentage) || 0,

          stage: formatReadableValue(job?.current_stage),

          startedAt,

          elapsedSeconds,

          estimatedTotalSeconds: 0,

          estimatedRemainingSeconds:
            Number(job?.estimated_seconds_remaining) || 0,

          estimatedFinishAt: job?.estimated_finish_at || null,

          processedFiles: Number(job?.processed_files) || 0,

          totalFiles: Number(job?.total_files) || 0,

          completedFiles: Number(job?.completed_files) || 0,

          failedFiles: Number(job?.failed_files) || 0,

          currentFilename: job?.current_filename || null,
        });

        const finishedStatuses = [
          "COMPLETED",
          "COMPLETED_WITH_ERRORS",
          "FAILED",
          "CANCELLED",
        ];

        if (finishedStatuses.includes(normalizedStatus)) {
          setImportLoading(false);

          setImportProgressComplete(true);

          clearActiveImportJob();

          setImportJobId(null);

          setCurrentPage(1);

          setQueuePage(1);

          await Promise.all([
            fetchDatasets({
              page: 1,

              size: pageSize,

              filtersToUse: appliedFilters,

              showLoader: true,
            }),

            fetchDatasetQueue({
              page: 1,

              size: queuePageSize,

              filtersToUse: appliedQueueFilters,
            }),
          ]);

          if (normalizedStatus === "FAILED") {
            setError(job?.error_message || "The dataset import job failed.");
          } else if (normalizedStatus === "CANCELLED") {
            setError("The dataset import job was cancelled.");
          } else if (normalizedStatus === "COMPLETED_WITH_ERRORS") {
            setNotice(
              `Import finished with errors. ${
                Number(job?.completed_files) || 0
              } completed, ${Number(job?.failed_files) || 0} failed, and ${
                Number(job?.skipped_files) || 0
              } skipped.`,
            );
          } else {
            setNotice(
              `Import finished. ${
                Number(job?.completed_files) || 0
              } completed, ${Number(job?.failed_files) || 0} failed, and ${
                Number(job?.skipped_files) || 0
              } skipped.`,
            );
          }

          return;
        }

        pollingTimer = window.setTimeout(pollImportJob, 2000);
      } catch (requestError) {
        if (!active) {
          return;
        }

        clearActiveImportJob();

        setImportLoading(false);

        setImportProgressComplete(false);

        setImportJobId(null);

        handleRequestError(requestError);
      }
    };

    void pollImportJob();

    return () => {
      active = false;

      if (pollingTimer) {
        window.clearTimeout(pollingTimer);
      }
    };
  }, [
    appliedFilters,
    appliedQueueFilters,
    fetchDatasetQueue,
    fetchDatasets,
    handleRequestError,
    importJobId,
    pageSize,
    queuePageSize,
  ]);

  /* ===================================================
     PROFILE DISPLAY VALUES
  =================================================== */

  const fullName = useMemo(() => {
    const name = [profile.first_name, profile.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return name || "LexMiner Administrator";
  }, [profile.first_name, profile.last_name]);

  const avatarSource = profile.profile_picture || adminPicture;

  /* ===================================================
     CURRENT DATASETS
  =================================================== */

  const currentDatasets = useMemo(
    () => (Array.isArray(datasetList.datasets) ? datasetList.datasets : []),
    [datasetList.datasets],
  );

  /* ===================================================
     TOTAL PAGES
  =================================================== */

  const totalPages = useMemo(
    () => Math.max(Math.ceil(Number(datasetList.total) / Number(pageSize)), 1),
    [datasetList.total, pageSize],
  );

  /* ===================================================
     VISIBLE PAGE NUMBERS
  =================================================== */

  const visiblePageNumbers = useMemo(() => {
    const pageNumbers = [];

    const startPage = Math.max(currentPage - 2, 1);

    const endPage = Math.min(startPage + 4, totalPages);

    const adjustedStartPage = Math.max(endPage - 4, 1);

    for (
      let pageNumber = adjustedStartPage;
      pageNumber <= endPage;
      pageNumber += 1
    ) {
      pageNumbers.push(pageNumber);
    }

    return pageNumbers;
  }, [currentPage, totalPages]);

  /* ===================================================
     ACTIVE FILTER COUNT
  =================================================== */

  const activeFilterCount = useMemo(
    () =>
      Object.values(appliedFilters).filter(
        (value) => value !== "" && value !== null && value !== undefined,
      ).length,
    [appliedFilters],
  );

  /* ===================================================
     DATASET STATISTICS
  =================================================== */

  const datasetStatistics = useMemo(() => {
    const statistics = {
      total: Number(datasetList.total) || 0,

      indexed: 0,
      pending: 0,
      failed: 0,
      completed: 0,
      chunks: 0,
    };

    currentDatasets.forEach((dataset) => {
      const status = normalizeStatus(dataset.import_status);

      if (dataset.is_indexed) {
        statistics.indexed += 1;
      }

      if (status === "PENDING") {
        statistics.pending += 1;
      }

      if (status === "FAILED") {
        statistics.failed += 1;
      }

      if (status === "COMPLETED") {
        statistics.completed += 1;
      }

      statistics.chunks += Number(dataset.chunk_count) || 0;
    });

    return statistics;
  }, [currentDatasets, datasetList.total]);

  /* ===================================================
     FILTER HANDLERS
  =================================================== */

  const handleFilterChange = useCallback((key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  }, []);

  const applyFilters = useCallback(() => {
    setCurrentPage(1);

    setAppliedFilters({
      filename: String(filters.filename || "").trim(),

      importStatus: filters.importStatus,

      year: filters.year,

      month: filters.month,

      isIndexed: filters.isIndexed,
    });
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);

    setAppliedFilters(DEFAULT_FILTERS);

    setCurrentPage(1);
  }, []);

  /* ===================================================
     PAGE CHANGE
  =================================================== */

  const goToPage = useCallback(
    (pageNumber) => {
      const normalizedPage = Math.min(
        Math.max(Number(pageNumber) || 1, 1),
        totalPages,
      );

      setCurrentPage(normalizedPage);
    },
    [totalPages],
  );

  /* ===================================================
     PAGE SIZE CHANGE
  =================================================== */

  const handlePageSizeChange = useCallback((event) => {
    const newPageSize = Number(event.target.value) || 25;

    setPageSize(newPageSize);

    setCurrentPage(1);
  }, []);

  /* ===================================================
     REFRESH DATASETS
  =================================================== */

  const refreshDatasets = useCallback(async () => {
    setRefreshing(true);

    await Promise.all([
      loadAdminProfile(),

      fetchDatasets({
        page: currentPage,

        size: pageSize,

        filtersToUse: appliedFilters,

        showLoader: true,
      }),
      fetchDatasetQueue(),
    ]);

    setRefreshing(false);
  }, [
    appliedFilters,
    currentPage,
    fetchDatasets,
    loadAdminProfile,
    pageSize,
    fetchDatasetQueue,
  ]);
  /* ===================================================
     OPEN DATASET DETAILS
  =================================================== */

  const openDatasetDetails = useCallback(
    async (dataset) => {
      if (!dataset?.id) {
        setError("The selected dataset has no valid ID.");

        return;
      }

      setDatasetDetails(null);

      setShowDetailsModal(true);

      setDetailsLoading(true);

      setError("");

      try {
        const result = await getAdminDataset(dataset.id);

        setDatasetDetails(result);
      } catch (requestError) {
        handleRequestError(requestError);
      } finally {
        setDetailsLoading(false);
      }
    },
    [handleRequestError],
  );

  /* ===================================================
     CLOSE DATASET DETAILS
  =================================================== */

  const closeDatasetDetails = useCallback(() => {
    if (detailsLoading || actionLoading) {
      return;
    }

    setShowDetailsModal(false);

    setDatasetDetails(null);
  }, [actionLoading, detailsLoading]);

  /* ===================================================
     OPEN DATASET PDF
  =================================================== */

  const handleOpenPdf = useCallback(
    async (dataset) => {
      if (!dataset?.id) {
        setError("The selected dataset has no valid ID.");

        return;
      }

      setPdfLoadingId(dataset.id);

      setError("");

      try {
        await openAdminDatasetPdf(dataset.id);
      } catch (requestError) {
        handleRequestError(requestError);
      } finally {
        setPdfLoadingId(null);
      }
    },
    [handleRequestError],
  );

  /* ===================================================
     DOWNLOAD DATASET PDF
  =================================================== */

  const handleDownloadPdf = useCallback(
    async (dataset) => {
      if (!dataset?.id) {
        setError("The selected dataset has no valid ID.");

        return;
      }

      setDownloadLoadingId(dataset.id);

      setError("");

      try {
        await downloadAdminDatasetPdf(
          dataset.id,
          dataset.filename || "dataset.pdf",
        );

        setNotice("The dataset PDF download has started.");
      } catch (requestError) {
        handleRequestError(requestError);
      } finally {
        setDownloadLoadingId(null);
      }
    },
    [handleRequestError],
  );

  /* ===================================================
     IMPORT CONFIRMATION
  =================================================== */

  const openImportConfirmation = useCallback(() => {
    setError("");
    setNotice("");

    setShowImportConfirmation(true);
  }, []);

  const closeImportConfirmation = useCallback(() => {
    if (importLoading) {
      return;
    }

    setShowImportConfirmation(false);
  }, [importLoading]);

  /* ===================================================
     EXECUTE DATASET IMPORT
  =================================================== */

  const handleImportDatasets = useCallback(async () => {
    if (importLoading) {
      return;
    }

    setImportLoading(true);

    setImportProgressComplete(false);

    setError("");

    setNotice("");

    setShowImportConfirmation(true);

    try {
      const result = await startAdminDatasetImportJob();

      const jobId = result?.job_id;

      if (!jobId) {
        throw new Error("The server did not return a valid import job ID.");
      }

      saveActiveImportJob(jobId);

      setImportJobId(String(jobId));

      setImportProgress({
        ...DEFAULT_IMPORT_PROGRESS,

        percentage: 0,

        stage: "Queued",

        startedAt: null,

        estimatedRemainingSeconds: 0,

        estimatedFinishAt: null,

        processedFiles: 0,

        totalFiles: 0,

        completedFiles: 0,

        failedFiles: 0,

        currentFilename: null,
      });
    } catch (requestError) {
      clearActiveImportJob();

      setImportJobId(null);

      setImportLoading(false);

      const responseStatus = requestError?.response?.status;

      if (responseStatus === 409) {
        setError(
          "Another dataset import is currently active. Please wait for that import to finish before starting another one.",
        );

        return;
      }

      handleRequestError(requestError);
    }
  }, [handleRequestError, importLoading]);
  /* ===================================================
     ACTION ELIGIBILITY
  =================================================== */

  const canProcessDataset = useCallback((dataset) => {
    const status = normalizeStatus(dataset?.import_status);

    return status === "PENDING" && !dataset?.is_indexed;
  }, []);

  const canRetryDataset = useCallback(
    (dataset) => normalizeStatus(dataset?.import_status) === "FAILED",
    [],
  );

  const canReprocessDataset = useCallback(
    (dataset) =>
      dataset?.is_indexed ||
      normalizeStatus(dataset?.import_status) === "COMPLETED" ||
      Number(dataset?.chunk_count || 0) > 0,
    [],
  );
  /* ===================================================
     OPEN ACTION CONFIRMATION
  =================================================== */

  const openActionConfirmation = useCallback((actionType, dataset) => {
    if (!dataset?.id) {
      setError("The selected dataset has no valid ID.");

      return;
    }

    setPendingActionType(actionType);

    setPendingActionDataset(dataset);

    setDeleteOriginalFile(false);

    setShowActionConfirmation(true);

    setError("");
  }, []);

  /* ===================================================
     CLOSE ACTION CONFIRMATION
  =================================================== */

  const closeActionConfirmation = useCallback(() => {
    if (actionLoading) {
      return;
    }

    setShowActionConfirmation(false);

    setPendingActionType(null);

    setPendingActionDataset(null);

    setDeleteOriginalFile(false);
  }, [actionLoading]);

  /* ===================================================
     ACTION TITLES
  =================================================== */

  const getActionTitle = useCallback((actionType) => {
    switch (actionType) {
      case ACTION_TYPES.PROCESS:
        return "Process Dataset";

      case ACTION_TYPES.RETRY:
        return "Retry Failed Dataset";

      case ACTION_TYPES.REPROCESS:
        return "Reprocess Dataset";

      case ACTION_TYPES.DELETE:
        return "Delete Dataset";

      default:
        return "Dataset Operation";
    }
  }, []);

  /* ===================================================
     ACTION DESCRIPTIONS
  =================================================== */

  const getActionDescription = useCallback((actionType, dataset) => {
    const filename = dataset?.filename || "the selected dataset";

    switch (actionType) {
      case ACTION_TYPES.PROCESS:
        return `Start the full text extraction, cleaning, chunking, embedding, and indexing pipeline for ${filename}.`;

      case ACTION_TYPES.RETRY:
        return `Clear the previous failure state and retry processing for ${filename}.`;

      case ACTION_TYPES.REPROCESS:
        return `Remove the existing indexed case data and regenerate all chunks and vectors for ${filename}.`;

      case ACTION_TYPES.DELETE:
        return `Permanently remove ${filename} and its related database records, chunks, vectors, and case metadata.`;

      default:
        return "Confirm the selected dataset operation.";
    }
  }, []);

  /* ===================================================
     ACTION BUTTON LABEL
  =================================================== */

  const getActionButtonLabel = useCallback((actionType) => {
    switch (actionType) {
      case ACTION_TYPES.PROCESS:
        return "Start Processing";

      case ACTION_TYPES.RETRY:
        return "Retry Dataset";

      case ACTION_TYPES.REPROCESS:
        return "Reprocess Dataset";

      case ACTION_TYPES.DELETE:
        return "Delete Dataset";

      default:
        return "Confirm";
    }
  }, []);

  /* ===================================================
     EXECUTE PENDING ACTION
  =================================================== */

  const executePendingAction = useCallback(async () => {
    if (!pendingActionDataset?.id || !pendingActionType) {
      setError("No valid dataset action was selected.");

      return;
    }

    setActionLoading(true);

    setError("");
    setNotice("");

    try {
      let result;

      switch (pendingActionType) {
        case ACTION_TYPES.PROCESS:
          result = await processAdminDataset(pendingActionDataset.id);
          break;

        case ACTION_TYPES.RETRY:
          result = await retryAdminDataset(pendingActionDataset.id);
          break;

        case ACTION_TYPES.REPROCESS:
          result = await reprocessAdminDataset(pendingActionDataset.id);
          break;

        case ACTION_TYPES.DELETE:
          result = await deleteAdminDataset(pendingActionDataset.id, {
            deleteFile: deleteOriginalFile,
          });
          break;

        default:
          throw new Error("Unsupported dataset operation.");
      }

      setNotice(
        result?.message || "The dataset operation completed successfully.",
      );

      setShowActionConfirmation(false);

      setPendingActionType(null);

      setPendingActionDataset(null);

      setDeleteOriginalFile(false);

      if (pendingActionType === ACTION_TYPES.DELETE) {
        setShowDetailsModal(false);

        setDatasetDetails(null);
      } else if (
        showDetailsModal &&
        datasetDetails?.id === pendingActionDataset.id
      ) {
        try {
          const refreshedDetails = await getAdminDataset(
            pendingActionDataset.id,
          );

          setDatasetDetails(refreshedDetails);
        } catch {
          setShowDetailsModal(false);

          setDatasetDetails(null);
        }
      }

      await fetchDatasets({
        page: currentPage,
        size: pageSize,
        filtersToUse: appliedFilters,
        showLoader: true,
      });
    } catch (requestError) {
      handleRequestError(requestError);
    } finally {
      setActionLoading(false);
    }
  }, [
    appliedFilters,
    currentPage,
    datasetDetails,
    deleteOriginalFile,
    fetchDatasets,
    handleRequestError,
    pageSize,
    pendingActionDataset,
    pendingActionType,
    showDetailsModal,
  ]);

  /* ===================================================
     LOGOUT
  =================================================== */

  const confirmLogout = useCallback(() => {
    localStorage.removeItem("admin_token");

    localStorage.removeItem("admin_user");

    navigate("/authentication", {
      replace: true,
    });
  }, [navigate]);

  /* ===================================================
     INITIAL LOADER
  =================================================== */

  if (initialLoading) {
    return <DatasetManagementLoader />;
  }
  return (
    <div
      className={`admin-profile-page ${
        sidebarCollapsed ? "sidebar-is-collapsed" : ""
      }`}
    >
      {/* Background */}

      <div className="profile-background">
        <div className="background-grid" />

        <div className="background-orb orb-a" />
        <div className="background-orb orb-b" />
        <div className="background-orb orb-c" />
      </div>

      {/* Mobile Overlay */}

      {mobileSidebarOpen && (
        <button
          type="button"
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}

      <aside
        className={`admin-sidebar ${mobileSidebarOpen ? "mobile-open" : ""}`}
      >
        <div className="sidebar-brand">
          <img src={lexminerLogo} alt="LexMiner" />

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
              <strong>System Operational</strong>

              <span>AI Services Online</span>
            </div>
          )}
        </div>

        <nav className="sidebar-navigation">
          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/admin/dashboard")}
          >
            <Gauge size={21} />

            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/admin/profile")}
          >
            <CircleUserRound size={21} />

            {!sidebarCollapsed && <span>Profile</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/admin/user-management")}
          >
            <Users size={21} />

            {!sidebarCollapsed && <span>User Management</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/admin/upload-documents")}
          >
            <UploadCloud size={21} />

            {!sidebarCollapsed && <span>Upload Documents</span>}
          </button>

          <button type="button" className="sidebar-link active">
            <Database size={21} />

            {!sidebarCollapsed && <span>Dataset Management</span>}
          </button>

          <button
            type="button"
            className="sidebar-link"
            onClick={() => navigate("/admin/vector-index")}
          >
            <BrainCircuit size={18} />
            {!sidebarCollapsed && <span>Vector Index</span>}
          </button>
        </nav>

        <div className="sidebar-footer">
          <button
            type="button"
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

      {/* Main */}

      <main className="profile-main">
        {/* Topbar */}

        <header className="profile-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() => setMobileSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

            <div>
              <span className="topbar-eyebrow">Administrator Console</span>

              <h1>Dataset Management</h1>
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
              onClick={refreshDatasets}
              disabled={refreshing}
            >
              <RefreshCcw size={18} className={refreshing ? "spin-icon" : ""} />

              <span>{refreshing ? "Refreshing" : "Refresh"}</span>
            </button>

            <button type="button" className="admin-account-button">
              <img
                src={avatarSource}
                alt="Administrator"
                className="admin-avatar"
              />

              <div>
                <strong>{fullName}</strong>

                <span>System Admin</span>
              </div>
            </button>
          </div>
        </header>

        {/* Content */}

        <div className="profile-content">
          {error && (
            <div className="profile-alert error-alert">
              <AlertTriangle size={20} />

              <span>{error}</span>

              <button type="button" onClick={() => setError("")}>
                <X size={18} />
              </button>
            </div>
          )}

          {notice && (
            <div className="profile-alert success-alert">
              <CheckCircle2 size={20} />

              <span>{notice}</span>

              <button type="button" onClick={() => setNotice("")}>
                <X size={18} />
              </button>
            </div>
          )}
          {/* =================================================
            DATASET HERO
        ================================================= */}

          <section className="dataset-hero-section profile-animate">
            <div className="dataset-hero-copy">
              <div className="hero-label">
                <Database size={16} />
                Enterprise dataset registry
              </div>

              <h2>
                Manage Supreme Court
                <span> Legal Datasets</span>
              </h2>

              <p>
                Review imported Supreme Court decisions, monitor document
                processing, manage semantic chunks, inspect indexing status,
                retry failed operations, and maintain the LexMiner legal
                knowledge repository.
              </p>

              <div className="dataset-hero-actions">
                <button
                  type="button"
                  className="dataset-import-button"
                  onClick={openImportConfirmation}
                  disabled={importLoading}
                >
                  {importLoading ? (
                    <LoaderCircle size={19} className="spin-icon" />
                  ) : (
                    <UploadCloud size={19} />
                  )}

                  {importLoading
                    ? "Importing Datasets..."
                    : "Import Uploaded Datasets"}
                </button>

                <button
                  type="button"
                  className="dataset-upload-button"
                  onClick={() => navigate("/admin/upload-documents")}
                >
                  <FileText size={19} />
                  Upload PDF Documents
                </button>
              </div>

              <div className="dataset-hero-features">
                <div>
                  <ShieldCheck size={17} />
                  Protected administrator access
                </div>

                <div>
                  <BrainCircuit size={17} />
                  Semantic vector indexing
                </div>

                <div>
                  <Layers3 size={17} />
                  Automated legal chunking
                </div>
              </div>
            </div>

            <div className="dataset-hero-visual">
              <div className="dataset-orbit dataset-orbit-one" />

              <div className="dataset-orbit dataset-orbit-two" />

              <div className="dataset-orbit dataset-orbit-three" />

              <div className="dataset-hero-core">
                <Database size={54} />

                <span className="dataset-core-pulse" />
              </div>

              <div className="dataset-visual-chip dataset-chip-imported">
                <CheckCircle2 size={16} />
                Imported
              </div>

              <div className="dataset-visual-chip dataset-chip-indexed">
                <BrainCircuit size={16} />
                Indexed
              </div>

              <div className="dataset-visual-chip dataset-chip-chunks">
                <Layers3 size={16} />
                Semantic Chunks
              </div>
            </div>
          </section>

          {/* =================================================
            DATASET STATISTICS
        ================================================= */}

          <section className="dataset-statistics-grid">
            <article className="dataset-stat-card profile-animate animation-delay-one">
              <div className="dataset-stat-icon dataset-stat-total">
                <Database size={23} />
              </div>

              <div className="dataset-stat-content">
                <span>Total Datasets</span>

                <strong>{formatNumber(datasetStatistics.total)}</strong>

                <small>Registered database records</small>
              </div>
            </article>

            <article className="dataset-stat-card profile-animate animation-delay-two">
              <div className="dataset-stat-icon dataset-stat-indexed">
                <BrainCircuit size={23} />
              </div>

              <div className="dataset-stat-content">
                <span>Indexed</span>

                <strong>{formatNumber(datasetStatistics.indexed)}</strong>

                <small>Indexed on the current page</small>
              </div>
            </article>

            <article className="dataset-stat-card profile-animate animation-delay-three">
              <div className="dataset-stat-icon dataset-stat-completed">
                <CheckCircle2 size={23} />
              </div>

              <div className="dataset-stat-content">
                <span>Completed</span>

                <strong>{formatNumber(datasetStatistics.completed)}</strong>

                <small>Successfully processed records</small>
              </div>
            </article>

            <article className="dataset-stat-card profile-animate animation-delay-four">
              <div className="dataset-stat-icon dataset-stat-pending">
                <Clock3 size={23} />
              </div>

              <div className="dataset-stat-content">
                <span>Pending</span>

                <strong>{formatNumber(datasetStatistics.pending)}</strong>

                <small>Awaiting document processing</small>
              </div>
            </article>

            <article className="dataset-stat-card profile-animate animation-delay-five">
              <div className="dataset-stat-icon dataset-stat-failed">
                <AlertTriangle size={23} />
              </div>

              <div className="dataset-stat-content">
                <span>Failed</span>

                <strong>{formatNumber(datasetStatistics.failed)}</strong>

                <small>Records requiring attention</small>
              </div>
            </article>

            <article className="dataset-stat-card profile-animate animation-delay-five">
              <div className="dataset-stat-icon dataset-stat-chunks">
                <Layers3 size={23} />
              </div>

              <div className="dataset-stat-content">
                <span>Chunks</span>

                <strong>{formatNumber(datasetStatistics.chunks)}</strong>

                <small>Generated on the current page</small>
              </div>
            </article>
          </section>

          {/* =================================================
            DATASET WORKFLOW PANEL
        ================================================= */}

          <section className="dataset-workflow-panel profile-animate animation-delay-two">
            <div className="panel-heading">
              <div>
                <span>Automated legal document pipeline</span>

                <h2>Dataset Processing Workflow</h2>
              </div>

              <BrainCircuit size={23} />
            </div>

            <div className="dataset-workflow-steps">
              <div className="dataset-workflow-step">
                <div className="dataset-workflow-step-number">01</div>

                <div className="dataset-workflow-step-icon">
                  <UploadCloud size={21} />
                </div>

                <div>
                  <strong>Upload PDFs</strong>

                  <span>
                    Save Supreme Court PDF documents inside the selected year
                    and month directory.
                  </span>
                </div>
              </div>

              <ChevronRight size={20} className="dataset-workflow-arrow" />

              <div className="dataset-workflow-step">
                <div className="dataset-workflow-step-number">02</div>

                <div className="dataset-workflow-step-icon">
                  <Database size={21} />
                </div>

                <div>
                  <strong>Register Datasets</strong>

                  <span>
                    Scan uploaded folders and create new dataset records in
                    PostgreSQL.
                  </span>
                </div>
              </div>

              <ChevronRight size={20} className="dataset-workflow-arrow" />

              <div className="dataset-workflow-step">
                <div className="dataset-workflow-step-number">03</div>

                <div className="dataset-workflow-step-icon">
                  <FileText size={21} />
                </div>

                <div>
                  <strong>Extract and Clean</strong>

                  <span>
                    Extract legal text, normalize document content, and prepare
                    metadata.
                  </span>
                </div>
              </div>

              <ChevronRight size={20} className="dataset-workflow-arrow" />

              <div className="dataset-workflow-step">
                <div className="dataset-workflow-step-number">04</div>

                <div className="dataset-workflow-step-icon">
                  <Layers3 size={21} />
                </div>

                <div>
                  <strong>Chunk Content</strong>

                  <span>
                    Divide every decision into semantic legal document chunks.
                  </span>
                </div>
              </div>

              <ChevronRight size={20} className="dataset-workflow-arrow" />

              <div className="dataset-workflow-step">
                <div className="dataset-workflow-step-number">05</div>

                <div className="dataset-workflow-step-icon">
                  <BrainCircuit size={21} />
                </div>

                <div>
                  <strong>Index Vectors</strong>

                  <span>
                    Generate embeddings and store searchable vectors inside
                    ChromaDB.
                  </span>
                </div>
              </div>
            </div>

            <div className="dataset-workflow-footer">
              <div>
                <ShieldCheck size={18} />

                <span>
                  Existing uploaded files are detected automatically during
                  import. Duplicate registered datasets will be skipped by the
                  backend importer.
                </span>
              </div>

              <button
                type="button"
                onClick={openImportConfirmation}
                disabled={importLoading}
              >
                {importLoading ? (
                  <LoaderCircle size={18} className="spin-icon" />
                ) : (
                  <RefreshCcw size={18} />
                )}
                Run Import Pipeline
              </button>
            </div>
          </section>

          <section className="dataset-queue-panel profile-animate">
            <div className="dataset-queue-heading">
              <div>
                <span>Upload and processing queue</span>

                <h2>Pending and Failed Datasets</h2>

                <p>
                  Review uploaded files awaiting import and registered datasets
                  requiring another processing attempt.
                </p>
              </div>

              <label>
                Rows per page
                <select
                  value={queuePageSize}
                  onChange={handleQueuePageSizeChange}
                  disabled={queueLoading}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="dataset-queue-summary">
              <div>
                <UploadCloud size={20} />
                <span>Pending</span>
                <strong>{formatNumber(datasetQueue.summary.pending)}</strong>
              </div>

              <div>
                <AlertTriangle size={20} />
                <span>Failed</span>
                <strong>{formatNumber(datasetQueue.summary.failed)}</strong>
              </div>

              <div>
                <Database size={20} />
                <span>Total Queue</span>
                <strong>{formatNumber(datasetQueue.summary.total)}</strong>
              </div>
            </div>

            <div className="dataset-queue-filter-grid">
              <div className="dataset-filter-field">
                <label htmlFor="queue-filename">Filename</label>

                <div className="dataset-filter-input">
                  <Search size={17} />

                  <input
                    id="queue-filename"
                    value={queueFilters.filename}
                    placeholder="Search queue filename"
                    onChange={(event) =>
                      handleQueueFilterChange("filename", event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyQueueFilters();
                      }
                    }}
                  />
                </div>
              </div>

              <div className="dataset-filter-field">
                <label htmlFor="queue-status">Queue Status</label>

                <div className="dataset-filter-select">
                  <Clock3 size={17} />

                  <select
                    id="queue-status"
                    value={queueFilters.queueStatus}
                    onChange={(event) =>
                      handleQueueFilterChange("queueStatus", event.target.value)
                    }
                  >
                    <option value="">All Queue Statuses</option>

                    <option value="PENDING">Pending</option>

                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              <div className="dataset-filter-field">
                <label htmlFor="queue-year">Year</label>

                <div className="dataset-filter-input">
                  <CalendarDays size={17} />

                  <input
                    id="queue-year"
                    type="number"
                    min="1900"
                    max="2100"
                    placeholder="All years"
                    value={queueFilters.year}
                    onChange={(event) =>
                      handleQueueFilterChange("year", event.target.value)
                    }
                  />
                </div>
              </div>

              <div className="dataset-filter-field">
                <label htmlFor="queue-month">Month</label>

                <div className="dataset-filter-select">
                  <Clock3 size={17} />

                  <select
                    id="queue-month"
                    value={queueFilters.month}
                    onChange={(event) =>
                      handleQueueFilterChange("month", event.target.value)
                    }
                  >
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month || "all-queue-months"} value={month}>
                        {month || "All Months"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="dataset-queue-filter-footer">
              <button
                type="button"
                onClick={resetQueueFilters}
                disabled={queueLoading}
              >
                <RefreshCcw size={17} />
                Reset
              </button>

              <button
                type="button"
                className="primary"
                onClick={applyQueueFilters}
                disabled={queueLoading}
              >
                {queueLoading ? (
                  <LoaderCircle size={17} className="spin-icon" />
                ) : (
                  <Search size={17} />
                )}
                Apply Queue Filters
              </button>
            </div>

            <div className="dataset-queue-table-wrapper">
              <table className="dataset-queue-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Stage</th>
                    <th>Size</th>
                    <th>Activity</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {queueLoading ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="dataset-queue-loading">
                          <LoaderCircle size={27} className="spin-icon" />
                          Loading queue...
                        </div>
                      </td>
                    </tr>
                  ) : datasetQueue.items.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="dataset-queue-empty">
                          No queue records matched the current filters.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    datasetQueue.items.map((item) => (
                      <tr key={item.key}>
                        <td>
                          <div className="dataset-document-cell">
                            <FileText size={19} />

                            <div>
                              <strong>{item.filename}</strong>

                              <span>{item.file_path}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {item.year}
                          {" • "}
                          {item.month}
                        </td>

                        <td>
                          <DatasetStatusBadge status={item.queue_status} />
                        </td>

                        <td>{formatReadableValue(item.current_stage)}</td>

                        <td>{formatFileSize(item.file_size)}</td>

                        <td>
                          {formatDate(
                            item.uploaded_at ||
                              item.last_processed_at ||
                              item.imported_at,
                          )}
                        </td>

                        <td>
                          {item.queue_status === "FAILED" ? (
                            <button
                              type="button"
                              className="dataset-queue-retry-button"
                              onClick={() =>
                                openActionConfirmation(ACTION_TYPES.RETRY, {
                                  ...item,
                                  id: item.dataset_id,
                                  import_status: item.import_status,
                                })
                              }
                            >
                              <RefreshCcw size={16} />
                              Retry
                            </button>
                          ) : (
                            <span className="dataset-queue-awaiting">
                              Awaiting Import
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="dataset-pagination">
              <div className="dataset-pagination-information">
                Showing{" "}
                <strong>
                  {datasetQueue.total === 0 ? 0 : datasetQueue.skip + 1}
                </strong>{" "}
                to{" "}
                <strong>
                  {Math.min(
                    datasetQueue.skip + datasetQueue.items.length,
                    datasetQueue.total,
                  )}
                </strong>{" "}
                of <strong>{formatNumber(datasetQueue.total)}</strong>
              </div>

              <div className="dataset-pagination-controls">
                <button
                  type="button"
                  onClick={() => goToQueuePage(queuePage - 1)}
                  disabled={queuePage === 1 || queueLoading}
                >
                  <ChevronLeft size={17} />
                </button>

                {queueVisiblePages.map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    className={pageNumber === queuePage ? "active" : ""}
                    onClick={() => goToQueuePage(pageNumber)}
                    disabled={queueLoading}
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => goToQueuePage(queuePage + 1)}
                  disabled={queuePage === queueTotalPages || queueLoading}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
          </section>

          {/* =================================================
            SEARCH AND FILTER PANEL
        ================================================= */}

          <section className="dataset-filter-panel profile-animate animation-delay-three">
            <div className="panel-heading">
              <div>
                <span>Dataset discovery controls</span>

                <h2>Search and Filter Registry</h2>
              </div>

              <Search size={23} />
            </div>

            <div className="dataset-filter-grid">
              {/* Filename Search */}

              <div className="dataset-filter-field dataset-filter-search">
                <label htmlFor="dataset-filename-filter">Filename</label>

                <div className="dataset-filter-input">
                  <Search size={18} />

                  <input
                    id="dataset-filename-filter"
                    type="search"
                    placeholder="Search PDF filename"
                    value={filters.filename}
                    onChange={(event) =>
                      handleFilterChange("filename", event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyFilters();
                      }
                    }}
                  />

                  {filters.filename && (
                    <button
                      type="button"
                      className="dataset-filter-clear-button"
                      onClick={() => handleFilterChange("filename", "")}
                      aria-label="Clear filename search"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Import Status */}

              <div className="dataset-filter-field">
                <label htmlFor="dataset-status-filter">Import Status</label>

                <div className="dataset-filter-select">
                  <Database size={18} />

                  <select
                    id="dataset-status-filter"
                    value={filters.importStatus}
                    onChange={(event) =>
                      handleFilterChange("importStatus", event.target.value)
                    }
                  >
                    {IMPORT_STATUS_OPTIONS.map((option) => (
                      <option
                        key={option.value || "all-statuses"}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Year */}

              <div className="dataset-filter-field">
                <label htmlFor="dataset-year-filter">Decision Year</label>

                <div className="dataset-filter-input">
                  <CalendarDays size={18} />

                  <input
                    id="dataset-year-filter"
                    type="number"
                    min="1900"
                    max="2100"
                    placeholder="All years"
                    value={filters.year}
                    onChange={(event) =>
                      handleFilterChange("year", event.target.value)
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        applyFilters();
                      }
                    }}
                  />
                </div>
              </div>

              {/* Month */}

              <div className="dataset-filter-field">
                <label htmlFor="dataset-month-filter">Decision Month</label>

                <div className="dataset-filter-select">
                  <Clock3 size={18} />

                  <select
                    id="dataset-month-filter"
                    value={filters.month}
                    onChange={(event) =>
                      handleFilterChange("month", event.target.value)
                    }
                  >
                    {MONTH_OPTIONS.map((month) => (
                      <option key={month || "all-months"} value={month}>
                        {month || "All Months"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Indexed State */}

              <div className="dataset-filter-field">
                <label htmlFor="dataset-index-filter">Vector Index</label>

                <div className="dataset-filter-select">
                  <BrainCircuit size={18} />

                  <select
                    id="dataset-index-filter"
                    value={filters.isIndexed}
                    onChange={(event) =>
                      handleFilterChange("isIndexed", event.target.value)
                    }
                  >
                    {INDEX_FILTER_OPTIONS.map((option) => (
                      <option
                        key={option.value || "all-index-states"}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Footer */}

            <div className="dataset-filter-footer">
              <div className="dataset-filter-summary">
                <Database size={17} />

                <span>
                  {activeFilterCount === 0
                    ? "Showing all registered datasets."
                    : `${activeFilterCount} active filter${
                        activeFilterCount === 1 ? "" : "s"
                      } applied.`}
                </span>
              </div>

              <div className="dataset-filter-actions">
                <button
                  type="button"
                  className="dataset-filter-reset-button"
                  onClick={resetFilters}
                  disabled={datasetsLoading && activeFilterCount === 0}
                >
                  <RefreshCcw size={17} />
                  Reset Filters
                </button>

                <button
                  type="button"
                  className="dataset-filter-apply-button"
                  onClick={applyFilters}
                  disabled={datasetsLoading}
                >
                  {datasetsLoading ? (
                    <LoaderCircle size={17} className="spin-icon" />
                  ) : (
                    <Search size={17} />
                  )}

                  {datasetsLoading ? "Loading..." : "Apply Filters"}
                </button>
              </div>
            </div>
          </section>

          {/* =================================================
            DATASET REGISTRY HEADER
        ================================================= */}

          <section className="dataset-registry-panel profile-animate animation-delay-four">
            <div className="dataset-registry-heading">
              <div>
                <span>PostgreSQL dataset registry</span>

                <h2>Registered Legal Datasets</h2>

                <p>
                  Showing{" "}
                  <strong>{formatNumber(currentDatasets.length)}</strong>{" "}
                  dataset
                  {currentDatasets.length === 1 ? "" : "s"} on this page from{" "}
                  <strong>{formatNumber(datasetList.total)}</strong> total
                  registered records.
                </p>
              </div>

              <div className="dataset-registry-controls">
                <label htmlFor="dataset-page-size">
                  Rows per page
                  <select
                    id="dataset-page-size"
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    disabled={datasetsLoading}
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={refreshDatasets}
                  disabled={refreshing || datasetsLoading}
                >
                  <RefreshCcw
                    size={17}
                    className={refreshing || datasetsLoading ? "spin-icon" : ""}
                  />
                  Refresh Registry
                </button>
              </div>
            </div>

            {/* Registry Summary */}

            <div className="dataset-registry-summary">
              <div>
                <Database size={17} />

                <span>Total Records</span>

                <strong>{formatNumber(datasetList.total)}</strong>
              </div>

              <div>
                <FileText size={17} />

                <span>Current Page</span>

                <strong>{formatNumber(currentDatasets.length)}</strong>
              </div>

              <div>
                <BrainCircuit size={17} />

                <span>Indexed Here</span>

                <strong>{formatNumber(datasetStatistics.indexed)}</strong>
              </div>

              <div>
                <Layers3 size={17} />

                <span>Chunks Here</span>

                <strong>{formatNumber(datasetStatistics.chunks)}</strong>
              </div>
            </div>

            {/* =================================================
              DATASET TABLE
          ================================================= */}

            <div className="dataset-table-wrapper">
              <table className="dataset-table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Decision Period</th>
                    <th>Import Status</th>
                    <th>Current Stage</th>
                    <th>Chunks</th>
                    <th>Vector Index</th>
                    <th>Attempts</th>
                    <th>Last Activity</th>
                    <th className="dataset-actions-heading">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {datasetsLoading ? (
                    <tr className="dataset-table-loading-row">
                      <td colSpan={9}>
                        <div className="dataset-table-loading">
                          <LoaderCircle size={30} className="spin-icon" />

                          <div>
                            <strong>Loading Dataset Registry</strong>

                            <span>
                              Retrieving registered Supreme Court datasets...
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : currentDatasets.length === 0 ? (
                    <tr className="dataset-table-empty-row">
                      <td colSpan={9}>
                        <div className="dataset-empty-state">
                          <div className="dataset-empty-icon">
                            <Database size={45} />
                          </div>

                          <span>Dataset registry</span>

                          <h3>No Registered Datasets Found</h3>

                          <p>
                            No database records matched the current filters.
                            Uploaded PDF files will appear here only after the
                            dataset import pipeline registers them.
                          </p>

                          <div className="dataset-empty-actions">
                            {activeFilterCount > 0 && (
                              <button
                                type="button"
                                className="dataset-empty-secondary-button"
                                onClick={resetFilters}
                              >
                                <RefreshCcw size={17} />
                                Reset Filters
                              </button>
                            )}

                            <button
                              type="button"
                              className="dataset-empty-secondary-button"
                              onClick={() =>
                                navigate("/admin/upload-documents")
                              }
                            >
                              <UploadCloud size={17} />
                              Upload Documents
                            </button>

                            <button
                              type="button"
                              className="dataset-empty-primary-button"
                              onClick={openImportConfirmation}
                              disabled={importLoading}
                            >
                              {importLoading ? (
                                <LoaderCircle size={17} className="spin-icon" />
                              ) : (
                                <Database size={17} />
                              )}
                              Import Datasets
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentDatasets.map((dataset) => {
                      const status = normalizeStatus(dataset.import_status);

                      const processingStage = formatReadableValue(
                        dataset.current_stage,
                      );

                      const datasetUpdatedAt =
                        dataset.last_processed_at ||
                        dataset.indexed_at ||
                        dataset.imported_at;

                      const isPdfLoading = pdfLoadingId === dataset.id;

                      const isDownloadLoading =
                        downloadLoadingId === dataset.id;

                      return (
                        <tr key={dataset.id} className="dataset-table-row">
                          {/* Document */}

                          <td>
                            <div className="dataset-document-cell">
                              <div className="dataset-document-icon">
                                <FileText size={20} />
                              </div>

                              <div className="dataset-document-copy">
                                <strong title={dataset.filename}>
                                  {dataset.filename}
                                </strong>

                                <span title={String(dataset.id)}>
                                  ID: {String(dataset.id)}
                                </span>

                                <small>
                                  {formatFileSize(dataset.file_size)}
                                </small>
                              </div>
                            </div>
                          </td>

                          {/* Decision Period */}

                          <td>
                            <div className="dataset-period-cell">
                              <CalendarDays size={16} />

                              <div>
                                <strong>{dataset.year}</strong>

                                <span>{dataset.month}</span>
                              </div>
                            </div>
                          </td>

                          {/* Import Status */}

                          <td>
                            <DatasetStatusBadge
                              status={dataset.import_status}
                            />
                          </td>

                          {/* Current Stage */}

                          <td>
                            <div className="dataset-stage-cell">
                              {[
                                "EXTRACTING",
                                "CLEANING",
                                "CHUNKING",
                                "INDEXING",
                              ].includes(status) ? (
                                <LoaderCircle size={16} className="spin-icon" />
                              ) : status === "FAILED" ? (
                                <AlertTriangle size={16} />
                              ) : status === "COMPLETED" ? (
                                <CheckCircle2 size={16} />
                              ) : (
                                <Clock3 size={16} />
                              )}

                              <span>{processingStage}</span>
                            </div>
                          </td>

                          {/* Chunk Count */}

                          <td>
                            <div className="dataset-count-cell">
                              <Layers3 size={16} />

                              <strong>
                                {formatNumber(dataset.chunk_count)}
                              </strong>
                            </div>
                          </td>

                          {/* Index Status */}

                          <td>
                            <span
                              className={`dataset-index-badge ${
                                dataset.is_indexed
                                  ? "dataset-indexed"
                                  : "dataset-not-indexed"
                              }`}
                            >
                              {dataset.is_indexed ? (
                                <CheckCircle2 size={14} />
                              ) : (
                                <Clock3 size={14} />
                              )}

                              {dataset.is_indexed ? "Indexed" : "Not Indexed"}
                            </span>
                          </td>

                          {/* Processing Attempts */}

                          <td>
                            <div
                              className={`dataset-attempt-cell ${
                                Number(dataset.processing_attempts) > 1
                                  ? "dataset-attempt-warning"
                                  : ""
                              }`}
                            >
                              <RefreshCcw size={15} />

                              <strong>
                                {formatNumber(dataset.processing_attempts)}
                              </strong>
                            </div>
                          </td>

                          {/* Last Activity */}

                          <td>
                            <div className="dataset-date-cell">
                              <Clock3 size={15} />

                              <span>{formatDate(datasetUpdatedAt)}</span>
                            </div>
                          </td>

                          {/* Actions */}

                          <td className="dataset-actions-cell">
                            <div className="dataset-row-actions">
                              <button
                                type="button"
                                className="dataset-row-action-button"
                                onClick={() => {
                                  void openDatasetDetails(dataset);
                                }}
                                title="View dataset details"
                                aria-label={`View details for ${dataset.filename}`}
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                type="button"
                                className="dataset-row-action-button"
                                onClick={() => {
                                  void handleOpenPdf(dataset);
                                }}
                                disabled={isPdfLoading}
                                title="Open PDF"
                                aria-label={`Open PDF for ${dataset.filename}`}
                              >
                                {isPdfLoading ? (
                                  <LoaderCircle
                                    size={17}
                                    className="spin-icon"
                                  />
                                ) : (
                                  <FileText size={17} />
                                )}
                              </button>

                              <button
                                type="button"
                                className="dataset-row-action-button"
                                onClick={() => {
                                  void handleDownloadPdf(dataset);
                                }}
                                disabled={isDownloadLoading}
                                title="Download PDF"
                                aria-label={`Download ${dataset.filename}`}
                              >
                                {isDownloadLoading ? (
                                  <LoaderCircle
                                    size={17}
                                    className="spin-icon"
                                  />
                                ) : (
                                  <Download size={17} />
                                )}
                              </button>

                              {canProcessDataset(dataset) && (
                                <button
                                  type="button"
                                  className="dataset-row-action-button dataset-process-action"
                                  onClick={() =>
                                    openActionConfirmation(
                                      ACTION_TYPES.PROCESS,
                                      dataset,
                                    )
                                  }
                                  title="Process pending dataset"
                                  aria-label={`Process ${dataset.filename}`}
                                >
                                  <Play size={17} />
                                </button>
                              )}

                              {canRetryDataset(dataset) && (
                                <button
                                  type="button"
                                  className="dataset-row-action-button dataset-retry-action"
                                  onClick={() =>
                                    openActionConfirmation(
                                      ACTION_TYPES.RETRY,
                                      dataset,
                                    )
                                  }
                                  title="Retry failed dataset"
                                  aria-label={`Retry ${dataset.filename}`}
                                >
                                  <RefreshCcw size={17} />
                                </button>
                              )}

                              {canReprocessDataset(dataset) && (
                                <button
                                  type="button"
                                  className="dataset-row-action-button dataset-reprocess-action"
                                  onClick={() =>
                                    openActionConfirmation(
                                      ACTION_TYPES.REPROCESS,
                                      dataset,
                                    )
                                  }
                                  title="Reprocess dataset"
                                  aria-label={`Reprocess ${dataset.filename}`}
                                >
                                  <RotateCcw size={17} />
                                </button>
                              )}

                              <button
                                type="button"
                                className="dataset-row-action-button dataset-delete-action"
                                onClick={() =>
                                  openActionConfirmation(
                                    ACTION_TYPES.DELETE,
                                    dataset,
                                  )
                                }
                                title="Delete dataset"
                                aria-label={`Delete ${dataset.filename}`}
                              >
                                <Trash2 size={17} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* =================================================
              PAGINATION
          ================================================= */}

            <div className="dataset-pagination">
              <div className="dataset-pagination-information">
                <span>Showing</span>

                <strong>
                  {datasetList.total === 0 ? 0 : datasetList.skip + 1}
                </strong>

                <span>to</span>

                <strong>
                  {Math.min(
                    datasetList.skip + currentDatasets.length,
                    datasetList.total,
                  )}
                </strong>

                <span>of</span>

                <strong>{formatNumber(datasetList.total)}</strong>

                <span>datasets</span>
              </div>

              <div className="dataset-pagination-controls">
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1 || datasetsLoading}
                  aria-label="First page"
                >
                  <ChevronLeft size={15} />
                  <ChevronLeft size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1 || datasetsLoading}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={17} />
                </button>

                {visiblePageNumbers.map((pageNumber) => (
                  <button
                    type="button"
                    key={pageNumber}
                    className={pageNumber === currentPage ? "active" : ""}
                    onClick={() => goToPage(pageNumber)}
                    disabled={datasetsLoading}
                    aria-current={
                      pageNumber === currentPage ? "page" : undefined
                    }
                  >
                    {pageNumber}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages || datasetsLoading}
                  aria-label="Next page"
                >
                  <ChevronRight size={17} />
                </button>

                <button
                  type="button"
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages || datasetsLoading}
                  aria-label="Last page"
                >
                  <ChevronRight size={15} />
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </section>
          {/* =================================================
            PAGE FOOTER
        ================================================= */}

          <footer className="profile-footer">
            <div>
              <Database size={17} />

              <span>Dataset Management Console</span>
            </div>

            <p>© 2026 LexMiner AI Adaptive Language Case Decision Miner</p>
          </footer>
        </div>
      </main>
      {/* =================================================
          DATASET DETAILS MODAL
      ================================================= */}

      {showDetailsModal && (
        <div
          className="confirmation-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDatasetDetails();
            }
          }}
        >
          <div className="dataset-details-modal">
            <button
              type="button"
              className="modal-close-button"
              onClick={closeDatasetDetails}
            >
              <X size={19} />
            </button>

            <div className="panel-heading">
              <div>
                <span>Registered Dataset</span>

                <h2>Dataset Information</h2>
              </div>

              <Database size={24} />
            </div>

            {detailsLoading ? (
              <div className="dataset-details-loading">
                <LoaderCircle size={34} className="spin-icon" />

                <p>Loading dataset details...</p>
              </div>
            ) : datasetDetails ? (
              <>
                {/* ========================================= */}

                <div className="dataset-details-grid">
                  <div className="dataset-detail-item">
                    <span>Filename</span>

                    <strong>{datasetDetails.filename}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Dataset ID</span>

                    <strong>{datasetDetails.id}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>File Path</span>

                    <strong>{datasetDetails.file_path}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Decision Year</span>

                    <strong>{datasetDetails.year}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Decision Month</span>

                    <strong>{datasetDetails.month}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>File Size</span>

                    <strong>{formatFileSize(datasetDetails.file_size)}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Import Status</span>

                    <DatasetStatusBadge status={datasetDetails.import_status} />
                  </div>

                  <div className="dataset-detail-item">
                    <span>Current Stage</span>

                    <strong>
                      {formatReadableValue(datasetDetails.current_stage)}
                    </strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Chunk Count</span>

                    <strong>{formatNumber(datasetDetails.chunk_count)}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Indexed</span>

                    <strong>{datasetDetails.is_indexed ? "Yes" : "No"}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Processing Attempts</span>

                    <strong>{datasetDetails.processing_attempts}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Imported At</span>

                    <strong>{formatDate(datasetDetails.imported_at)}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Indexed At</span>

                    <strong>{formatDate(datasetDetails.indexed_at)}</strong>
                  </div>

                  <div className="dataset-detail-item">
                    <span>Last Processed</span>

                    <strong>
                      {formatDate(datasetDetails.last_processed_at)}
                    </strong>
                  </div>
                </div>

                {/* ========================================= */}

                {datasetDetails.error_message && (
                  <div className="dataset-error-panel">
                    <AlertTriangle size={18} />

                    <div>
                      <strong>Processing Error</strong>

                      <p>{datasetDetails.error_message}</p>
                    </div>
                  </div>
                )}

                {/* ========================================= */}

                <div className="dataset-details-actions">
                  <button
                    type="button"
                    onClick={() => handleOpenPdf(datasetDetails)}
                  >
                    <Eye size={18} />
                    Open PDF
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(datasetDetails)}
                  >
                    <Download size={18} />
                    Download
                  </button>

                  {canProcessDataset(datasetDetails) && (
                    <button
                      type="button"
                      onClick={() =>
                        openActionConfirmation(
                          ACTION_TYPES.PROCESS,
                          datasetDetails,
                        )
                      }
                    >
                      <Play size={18} />
                      Process
                    </button>
                  )}

                  {canRetryDataset(datasetDetails) && (
                    <button
                      type="button"
                      onClick={() =>
                        openActionConfirmation(
                          ACTION_TYPES.RETRY,
                          datasetDetails,
                        )
                      }
                    >
                      <RefreshCcw size={18} />
                      Retry
                    </button>
                  )}

                  {canReprocessDataset(datasetDetails) && (
                    <button
                      type="button"
                      onClick={() =>
                        openActionConfirmation(
                          ACTION_TYPES.REPROCESS,
                          datasetDetails,
                        )
                      }
                    >
                      <RotateCcw size={18} />
                      Reprocess
                    </button>
                  )}

                  <button
                    type="button"
                    className="dataset-delete-button"
                    onClick={() =>
                      openActionConfirmation(
                        ACTION_TYPES.DELETE,
                        datasetDetails,
                      )
                    }
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <div className="dataset-details-loading">
                <AlertTriangle size={34} />

                <p>Unable to load dataset details.</p>
              </div>
            )}
          </div>
        </div>
      )}
      {/* =================================================
          IMPORT CONFIRMATION MODAL
      ================================================= */}

      {showImportConfirmation && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !importLoading) {
              closeImportConfirmation();
            }
          }}
        >
          <div
            className="confirmation-modal dataset-import-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dataset-import-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={closeImportConfirmation}
              disabled={importLoading}
              aria-label="Close import confirmation"
            >
              <X size={19} />
            </button>

            <div className="confirmation-icon dataset-import-confirmation-icon">
              {importLoading ? (
                <LoaderCircle size={31} className="spin-icon" />
              ) : (
                <UploadCloud size={31} />
              )}
            </div>

            <span className="modal-eyebrow">Dataset import confirmation</span>

            <h2 id="dataset-import-modal-title">Import Uploaded Datasets?</h2>

            <p>
              LexMiner will scan the configured dataset folders, register
              unregistered PDF documents, and process pending legal datasets.
              Existing registered files will be skipped automatically.
            </p>

            <div className="dataset-import-summary-list">
              <div>
                <CheckCircle2 size={17} />

                <span>Scan uploaded year and month directories</span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>Register new dataset records in PostgreSQL</span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>Extract and clean Supreme Court decision text</span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>Generate semantic chunks and embeddings</span>
              </div>

              <div>
                <CheckCircle2 size={17} />

                <span>Store searchable vectors in ChromaDB</span>
              </div>
            </div>

            <div className="dataset-import-warning">
              <AlertTriangle size={19} />

              <div>
                <strong>Processing time notice</strong>

                <span>
                  Large PDF collections may require several minutes to complete.
                  Do not close the administrator page while the import operation
                  is running.
                </span>
              </div>
            </div>

            {importLoading || importProgressComplete ? (
              <div className="dataset-import-progress-preview">
                <div className="dataset-import-progress-heading">
                  <div>
                    <span>Import Progress</span>

                    <strong>{importProgress.stage}</strong>
                  </div>

                  <div className="dataset-import-progress-percentage">
                    {Math.round(importProgress.percentage || 0)}%
                  </div>
                </div>

                {importProgress.currentFilename && (
                  <div className="dataset-import-current-file">
                    <FileText size={16} />

                    <span>Processing:</span>

                    <strong>{importProgress.currentFilename}</strong>
                  </div>
                )}

                <div
                  className="dataset-import-progress-track"
                  role="progressbar"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={Math.round(importProgress.percentage || 0)}
                >
                  <span
                    style={{
                      width: `${Math.min(
                        Math.max(Number(importProgress.percentage) || 0, 0),
                        100,
                      )}%`,
                    }}
                  />
                </div>

                <div className="dataset-import-progress-counts">
                  <span>Processed</span>

                  <strong>
                    {formatNumber(importProgress.processedFiles)}
                    {" / "}
                    {formatNumber(importProgress.totalFiles)}
                  </strong>
                </div>

                <div className="dataset-import-time-grid">
                  <div>
                    <Clock3 size={18} />

                    <span>Elapsed</span>

                    <strong>
                      {formatDuration(importProgress.elapsedSeconds)}
                    </strong>
                  </div>

                  <div>
                    <LoaderCircle
                      size={18}
                      className={importLoading ? "spin-icon" : ""}
                    />

                    <span>Remaining</span>

                    <strong>
                      {importProgressComplete
                        ? "Finished"
                        : formatDuration(
                            importProgress.estimatedRemainingSeconds,
                          )}
                    </strong>
                  </div>

                  <div>
                    <CheckCircle2 size={18} />

                    <span>Estimated Finish</span>

                    <strong>
                      {formatEstimatedFinish(importProgress.estimatedFinishAt)}
                    </strong>
                  </div>
                </div>

                <div className="dataset-import-result-summary">
                  <div>
                    <CheckCircle2 size={17} />

                    <span>Completed</span>

                    <strong>
                      {formatNumber(importProgress.completedFiles)}
                    </strong>
                  </div>

                  <div>
                    <AlertTriangle size={17} />

                    <span>Failed</span>

                    <strong>{formatNumber(importProgress.failedFiles)}</strong>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="confirmation-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeImportConfirmation}
                disabled={importLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-confirm-button"
                onClick={() => {
                  void handleImportDatasets();
                }}
                disabled={importLoading}
              >
                {importLoading ? (
                  <LoaderCircle size={18} className="spin-icon" />
                ) : (
                  <UploadCloud size={18} />
                )}

                {importLoading ? "Importing Datasets..." : "Start Import"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          DATASET ACTION CONFIRMATION MODAL
      ================================================= */}

      {showActionConfirmation && pendingActionDataset && (
        <div
          className="confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !actionLoading) {
              closeActionConfirmation();
            }
          }}
        >
          <div
            className="confirmation-modal dataset-action-confirmation-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dataset-action-modal-title"
          >
            <button
              type="button"
              className="modal-close-button"
              onClick={closeActionConfirmation}
              disabled={actionLoading}
              aria-label="Close dataset action confirmation"
            >
              <X size={19} />
            </button>

            <div
              className={`confirmation-icon ${
                pendingActionType === ACTION_TYPES.DELETE
                  ? "dataset-delete-confirmation-icon"
                  : "dataset-operation-confirmation-icon"
              }`}
            >
              {actionLoading ? (
                <LoaderCircle size={31} className="spin-icon" />
              ) : pendingActionType === ACTION_TYPES.DELETE ? (
                <Trash2 size={31} />
              ) : pendingActionType === ACTION_TYPES.PROCESS ? (
                <Play size={31} />
              ) : pendingActionType === ACTION_TYPES.RETRY ? (
                <RefreshCcw size={31} />
              ) : (
                <RotateCcw size={31} />
              )}
            </div>

            <span className="modal-eyebrow">
              Dataset operation confirmation
            </span>

            <h2 id="dataset-action-modal-title">
              {getActionTitle(pendingActionType)}
            </h2>

            <p>
              {getActionDescription(pendingActionType, pendingActionDataset)}
            </p>

            <div className="dataset-action-document-summary">
              <div className="dataset-action-document-icon">
                <FileText size={22} />
              </div>

              <div>
                <strong title={pendingActionDataset.filename}>
                  {pendingActionDataset.filename}
                </strong>

                <span>
                  {pendingActionDataset.year}
                  {" • "}
                  {pendingActionDataset.month}
                  {" • "}
                  {formatFileSize(pendingActionDataset.file_size)}
                </span>
              </div>

              <DatasetStatusBadge status={pendingActionDataset.import_status} />
            </div>

            <div className="dataset-action-metadata-grid">
              <div>
                <span>Current Stage</span>

                <strong>
                  {formatReadableValue(pendingActionDataset.current_stage)}
                </strong>
              </div>

              <div>
                <span>Existing Chunks</span>

                <strong>
                  {formatNumber(pendingActionDataset.chunk_count)}
                </strong>
              </div>

              <div>
                <span>Processing Attempts</span>

                <strong>
                  {formatNumber(pendingActionDataset.processing_attempts)}
                </strong>
              </div>
            </div>

            {pendingActionType === ACTION_TYPES.DELETE ? (
              <div className="dataset-delete-options">
                <div className="dataset-delete-warning">
                  <AlertTriangle size={20} />

                  <div>
                    <strong>Permanent database deletion</strong>

                    <span>
                      Related case metadata, chunks, and vector records will be
                      removed permanently.
                    </span>
                  </div>
                </div>

                <label className="dataset-delete-file-option">
                  <input
                    type="checkbox"
                    checked={deleteOriginalFile}
                    onChange={(event) =>
                      setDeleteOriginalFile(event.target.checked)
                    }
                    disabled={actionLoading}
                  />

                  <span className="dataset-delete-checkbox">
                    <Check size={15} />
                  </span>

                  <div>
                    <strong>Also delete the original PDF file</strong>

                    <span>
                      Remove the source document from the configured dataset
                      directory.
                    </span>
                  </div>
                </label>
              </div>
            ) : (
              <div className="dataset-action-pipeline-preview">
                <div>
                  <FileText size={17} />
                  Extract
                </div>

                <ChevronRight size={16} />

                <div>
                  <Database size={17} />
                  Register
                </div>

                <ChevronRight size={16} />

                <div>
                  <Layers3 size={17} />
                  Chunk
                </div>

                <ChevronRight size={16} />

                <div>
                  <BrainCircuit size={17} />
                  Index
                </div>
              </div>
            )}

            {actionLoading && (
              <div className="dataset-action-loading-panel">
                <div className="dataset-action-loading-track">
                  <span />
                </div>

                <div>
                  <LoaderCircle size={17} className="spin-icon" />
                  Performing dataset operation...
                </div>
              </div>
            )}

            <div className="confirmation-actions">
              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeActionConfirmation}
                disabled={actionLoading}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  pendingActionType === ACTION_TYPES.DELETE
                    ? "modal-logout-button"
                    : "modal-confirm-button"
                }
                onClick={() => {
                  void executePendingAction();
                }}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <LoaderCircle size={18} className="spin-icon" />
                ) : pendingActionType === ACTION_TYPES.DELETE ? (
                  <Trash2 size={18} />
                ) : pendingActionType === ACTION_TYPES.PROCESS ? (
                  <Play size={18} />
                ) : pendingActionType === ACTION_TYPES.RETRY ? (
                  <RefreshCcw size={18} />
                ) : (
                  <RotateCcw size={18} />
                )}

                {actionLoading
                  ? "Processing..."
                  : getActionButtonLabel(pendingActionType)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================
          LOGOUT CONFIRMATION MODAL
      ================================================= */}

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
            aria-labelledby="dataset-logout-modal-title"
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

            <h2 id="dataset-logout-modal-title">Logout Administrator?</h2>

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
