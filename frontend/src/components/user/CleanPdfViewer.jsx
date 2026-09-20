import { useCallback, useEffect, useRef, useState } from "react";

import { FileWarning, LoaderCircle, RefreshCw } from "lucide-react";

import * as pdfjsLib from "pdfjs-dist";

import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import "../../styles/clean-pdf-viewer.css";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/* =========================================================
   ERROR MESSAGE HELPER
========================================================= */

function getPdfErrorMessage(error) {
  const errorName = String(error?.name || "");

  const errorMessage = String(error?.message || "").toLowerCase();

  if (
    errorName === "MissingPDFException" ||
    errorMessage.includes("missing pdf") ||
    errorMessage.includes("404")
  ) {
    return (
      "The original PDF could not be found. " +
      "The dataset file may have been moved, renamed, or deleted."
    );
  }

  if (
    errorName === "InvalidPDFException" ||
    errorMessage.includes("invalid pdf")
  ) {
    return "The selected file is not a valid PDF or the file is corrupted.";
  }

  if (errorName === "PasswordException") {
    return "This PDF is password-protected and cannot be displayed.";
  }

  if (errorName === "UnexpectedResponseException") {
    return "The backend returned an unexpected response instead of a PDF.";
  }

  if (
    errorMessage.includes("failed to fetch") ||
    errorMessage.includes("networkerror") ||
    errorMessage.includes("network error")
  ) {
    return (
      "LexMiner could not retrieve the PDF. " +
      "Check that the backend is running and that CORS allows the request."
    );
  }

  if (errorMessage.includes("cors")) {
    return "The browser blocked access to the PDF because of a CORS configuration problem.";
  }

  if (errorMessage.includes("worker")) {
    return (
      "The PDF rendering worker could not start. " +
      "Restart the frontend development server and try again."
    );
  }

  if (errorMessage.includes("canvas")) {
    return "The browser could not prepare a page canvas for this PDF.";
  }

  return error?.message || "LexMiner could not display this PDF.";
}

/* =========================================================
   CLEAN PDF VIEWER
========================================================= */

export default function CleanPdfViewer({
  pdfUrl,
  title = "Original decision PDF",
}) {
  const containerRef = useRef(null);

  const loadingTaskRef = useRef(null);

  const renderTasksRef = useRef([]);

  const renderSequenceRef = useRef(0);

  const [loading, setLoading] = useState(true);

  const [loadingStage, setLoadingStage] = useState("Preparing PDF viewer…");

  const [error, setError] = useState("");

  const [pageCount, setPageCount] = useState(0);

  const [renderedPageCount, setRenderedPageCount] = useState(0);

  const [retryCount, setRetryCount] = useState(0);

  /* =======================================================
     CANCEL ACTIVE TASKS
  ======================================================= */

  const cancelActiveTasks = useCallback(() => {
    renderTasksRef.current.forEach((renderTask) => {
      try {
        renderTask.cancel();
      } catch {
        // Ignore cancellation errors.
      }
    });

    renderTasksRef.current = [];

    const loadingTask = loadingTaskRef.current;

    loadingTaskRef.current = null;

    if (loadingTask) {
      loadingTask.destroy().catch(() => {});
    }
  }, []);

  /* =======================================================
     RETRY
  ======================================================= */

  function handleRetry() {
    setRetryCount((current) => current + 1);
  }

  /* =======================================================
     LOAD AND RENDER PDF
  ======================================================= */

  useEffect(() => {
    const normalizedPdfUrl = String(pdfUrl || "").trim();

    cancelActiveTasks();

    const currentSequence = renderSequenceRef.current + 1;

    renderSequenceRef.current = currentSequence;

    let cancelled = false;

    async function renderDocument() {
      const container = containerRef.current;

      if (!container) {
        return;
      }

      container.replaceChildren();

      setLoading(true);

      setLoadingStage("Connecting to the original PDF…");

      setError("");

      setPageCount(0);

      setRenderedPageCount(0);

      if (!normalizedPdfUrl) {
        setLoading(false);

        setError("No PDF URL was provided.");

        return;
      }

      try {
        const loadingTask = pdfjsLib.getDocument({
          url: normalizedPdfUrl,

          withCredentials: false,

          /*
           * Keep range and streaming enabled
           * so large PDFs can load progressively.
           */
          disableRange: false,

          disableStream: false,

          disableAutoFetch: false,
        });

        loadingTaskRef.current = loadingTask;

        const pdfDocument = await loadingTask.promise;

        if (cancelled || renderSequenceRef.current !== currentSequence) {
          return;
        }

        if (!pdfDocument.numPages || pdfDocument.numPages < 1) {
          throw new Error("The PDF does not contain any readable pages.");
        }

        setPageCount(pdfDocument.numPages);

        setLoadingStage(`Rendering page 1 of ${pdfDocument.numPages}…`);

        for (
          let pageNumber = 1;
          pageNumber <= pdfDocument.numPages;
          pageNumber += 1
        ) {
          if (cancelled || renderSequenceRef.current !== currentSequence) {
            return;
          }

          setLoadingStage(
            `Rendering page ${pageNumber} of ${pdfDocument.numPages}…`,
          );

          const page = await pdfDocument.getPage(pageNumber);

          if (cancelled || renderSequenceRef.current !== currentSequence) {
            return;
          }

          const baseViewport = page.getViewport({
            scale: 1,
          });

          const containerWidth = Math.max(container.clientWidth, 320);

          const horizontalPadding = containerWidth <= 720 ? 16 : 40;

          const availableWidth = Math.min(
            containerWidth - horizontalPadding,
            900,
          );

          const displayScale = Math.max(
            Math.min(availableWidth / baseViewport.width, 1.6),
            0.55,
          );

          const viewport = page.getViewport({
            scale: displayScale,
          });

          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

          const pageWrapper = document.createElement("article");

          pageWrapper.className = "clean-pdf-page";

          pageWrapper.setAttribute(
            "aria-label",
            `Page ${pageNumber} of ${pdfDocument.numPages}`,
          );

          const canvas = document.createElement("canvas");

          canvas.className = "clean-pdf-page-canvas";

          canvas.width = Math.floor(viewport.width * pixelRatio);

          canvas.height = Math.floor(viewport.height * pixelRatio);

          canvas.style.width = `${Math.floor(viewport.width)}px`;

          canvas.style.height = `${Math.floor(viewport.height)}px`;

          const pageNumberLabel = document.createElement("span");

          pageNumberLabel.className = "clean-pdf-page-number";

          pageNumberLabel.textContent = `Page ${pageNumber}`;

          pageWrapper.append(canvas, pageNumberLabel);

          container.appendChild(pageWrapper);

          const canvasContext = canvas.getContext("2d", {
            alpha: false,
          });

          if (!canvasContext) {
            throw new Error(
              `Could not create the canvas for page ${pageNumber}.`,
            );
          }

          canvasContext.save();

          canvasContext.fillStyle = "#ffffff";

          canvasContext.fillRect(0, 0, canvas.width, canvas.height);

          canvasContext.restore();

          const renderTask = page.render({
            canvasContext,

            viewport,

            transform:
              pixelRatio !== 1
                ? [pixelRatio, 0, 0, pixelRatio, 0, 0]
                : undefined,
          });

          renderTasksRef.current.push(renderTask);

          await renderTask.promise;

          renderTasksRef.current = renderTasksRef.current.filter(
            (task) => task !== renderTask,
          );

          if (cancelled || renderSequenceRef.current !== currentSequence) {
            return;
          }

          pageWrapper.classList.add("clean-pdf-page-rendered");

          setRenderedPageCount(pageNumber);
        }

        setLoadingStage("Document ready.");
      } catch (renderError) {
        if (cancelled || renderError?.name === "RenderingCancelledException") {
          return;
        }

        console.error("PDF rendering failed:", renderError);

        container.replaceChildren();

        setError(getPdfErrorMessage(renderError));
      } finally {
        if (!cancelled && renderSequenceRef.current === currentSequence) {
          setLoading(false);
        }
      }
    }

    renderDocument();

    return () => {
      cancelled = true;

      renderSequenceRef.current += 1;

      cancelActiveTasks();
    };
  }, [pdfUrl, retryCount, cancelActiveTasks]);

  /* =======================================================
     PROGRESS
  ======================================================= */

  const progressPercentage =
    pageCount > 0
      ? Math.min(Math.round((renderedPageCount / pageCount) * 100), 100)
      : 0;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className="clean-pdf-viewer"
      aria-label={title}
      aria-busy={loading}
    >
      <header className="clean-pdf-viewer-status">
        <div>
          <strong>Original Decision</strong>

          <span>
            {pageCount > 0
              ? `${pageCount} ${pageCount === 1 ? "page" : "pages"}`
              : "Supreme Court PDF"}
          </span>
        </div>

        {loading && pageCount > 0 && (
          <span className="clean-pdf-header-progress">
            {renderedPageCount}/{pageCount}
          </span>
        )}
      </header>

      {loading && (
        <div className="clean-pdf-loading" role="status" aria-live="polite">
          <LoaderCircle size={34} className="clean-pdf-spin" />

          <strong>Rendering original decision</strong>

          <span>{loadingStage}</span>

          {pageCount > 0 && (
            <div className="clean-pdf-progress">
              <div className="clean-pdf-progress-track">
                <div
                  className="clean-pdf-progress-value"
                  style={{
                    width: `${progressPercentage}%`,
                  }}
                />
              </div>

              <small>{progressPercentage}%</small>
            </div>
          )}
        </div>
      )}

      {!loading && error && (
        <div className="clean-pdf-error" role="alert">
          <div className="clean-pdf-error-icon">
            <FileWarning size={32} />
          </div>

          <strong>PDF unavailable</strong>

          <span>{error}</span>

          <button
            type="button"
            className="clean-pdf-retry-button"
            onClick={handleRetry}
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      )}

      <div
        ref={containerRef}
        className={`clean-pdf-pages ${
          loading ? "clean-pdf-pages-rendering" : ""
        } ${error ? "clean-pdf-pages-error" : ""}`}
      />
    </section>
  );
}
