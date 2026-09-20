import { useEffect, useMemo, useState } from "react";

import {
  AlertCircle,
  CalendarDays,
  ExternalLink,
  FileText,
  FolderOpen,
  LoaderCircle,
  Scale,
  X,
} from "lucide-react";

import UserHomeHeader from "../../components/user/UserHomeHeader";

import CleanPdfViewer from "../../components/user/CleanPdfViewer";

import {
  getCaseCollectionArchive,
  getCaseCollectionErrorMessage,
  getCollectionMonthCases,
  getCollectionPdfUrl,
} from "../../services/caseCollectionService";

import "../../styles/user-home.css";
import "../../styles/user-case-collection.css";

const START_YEAR = 2016;
const END_YEAR = 2026;

function formatDate(value) {
  if (!value) {
    return "Decision date unavailable";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsedDate);
}

export default function UserCaseCollectionPage() {
  const [archive, setArchive] = useState(null);

  const [archiveLoading, setArchiveLoading] = useState(true);

  const [archiveError, setArchiveError] = useState("");

  const [selectedYear, setSelectedYear] = useState(null);

  const [selectedMonth, setSelectedMonth] = useState(null);

  const [monthData, setMonthData] = useState(null);

  const [monthLoading, setMonthLoading] = useState(false);

  const [monthError, setMonthError] = useState("");

  const [selectedCase, setSelectedCase] = useState(null);

  const selectedPdfUrl = useMemo(
    () => (selectedCase ? getCollectionPdfUrl(selectedCase.id) : ""),
    [selectedCase],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadArchive() {
      setArchiveLoading(true);
      setArchiveError("");

      try {
        const response = await getCaseCollectionArchive({
          startYear: START_YEAR,

          endYear: END_YEAR,
        });

        if (!cancelled) {
          setArchive(response);
        }
      } catch (error) {
        if (!cancelled) {
          setArchiveError(getCaseCollectionErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setArchiveLoading(false);
        }
      }
    }

    loadArchive();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleMonthSelection(year, month, hasCases) {
    if (!hasCases) {
      return;
    }

    setSelectedYear(year);
    setSelectedMonth(month);
    setSelectedCase(null);
    setMonthData(null);
    setMonthError("");
    setMonthLoading(true);

    try {
      const response = await getCollectionMonthCases({
        year,
        month,
      });

      setMonthData(response);
    } catch (error) {
      setMonthError(getCaseCollectionErrorMessage(error));
    } finally {
      setMonthLoading(false);
    }
  }

  function handleCaseSelection(caseItem) {
    setSelectedCase(caseItem);

    window.setTimeout(() => {
      document.getElementById("collection-document-viewer")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  return (
    <div className="user-case-collection-page">
      <UserHomeHeader />

      <main className="case-collection-main">
        <div className="collection-page-navigation">
          <span>
            <a
              href="https://elibrary.judiciary.gov.ph/"
              target="_blank"
              rel="noopener noreferrer"
              className="collection-external-link"
            >
              <FolderOpen size={17} />
              Design Inspired from Supreme Court E-Library
            </a>
          </span>
        </div>

        <section className="collection-introduction">
          <span className="collection-eyebrow">
            <Scale size={16} />
            Philippine Supreme Court Decisions
          </span>

          <h1>Decisions and Signed Resolutions</h1>

          <p>
            Browse available Supreme Court decisions from 2016 t0 2026. Blue
            months contain one or more available decisions. Red months currently
            contain no PDF-backed decisions.
          </p>

          {archive && (
            <div className="collection-summary">
              <strong>{archive.total_available_cases}</strong>

              <span>available original PDF decisions</span>
            </div>
          )}
        </section>

        {archiveLoading && (
          <div className="collection-loading-state">
            <LoaderCircle size={30} className="collection-spin" />

            <span>Loading case decision archive</span>
          </div>
        )}

        {archiveError && (
          <div className="collection-error-state">
            <AlertCircle size={24} />

            <span>{archiveError}</span>
          </div>
        )}

        {!archiveLoading && !archiveError && archive && (
          <section className="collection-archive-layout">
            <article className="collection-year-panel">
              <div className="collection-section-heading">
                <div>
                  <span>Archive calendar</span>

                  <h2>Browse by Year and Month</h2>
                </div>

                <CalendarDays size={24} />
              </div>

              <div className="collection-year-list">
                {archive.years.map((yearItem) => (
                  <section key={yearItem.year} className="collection-year-row">
                    <div className="collection-year-label">
                      <strong>{yearItem.year}</strong>

                      <span>{yearItem.case_count} decisions</span>
                    </div>

                    <div className="collection-month-list">
                      {yearItem.months.map((monthItem) => {
                        const isSelected =
                          selectedYear === yearItem.year &&
                          selectedMonth === monthItem.month;

                        return (
                          <button
                            key={monthItem.month}
                            type="button"
                            className={`collection-month-button ${
                              monthItem.has_cases
                                ? "collection-month-available"
                                : "collection-month-empty"
                            } ${isSelected ? "collection-month-selected" : ""}`}
                            onClick={() =>
                              handleMonthSelection(
                                yearItem.year,
                                monthItem.month,
                                monthItem.has_cases,
                              )
                            }
                            disabled={!monthItem.has_cases}
                            title={
                              monthItem.has_cases
                                ? `${monthItem.case_count} available decisions`
                                : "No available decisions"
                            }
                          >
                            {monthItem.short_name}

                            {monthItem.has_cases && (
                              <small>{monthItem.case_count}</small>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </article>

            <article className="collection-month-panel">
              {!selectedYear && (
                <div className="collection-empty-selection">
                  <CalendarDays size={42} />

                  <span>Select a blue month</span>

                  <p>
                    Available cases for the selected month will appear here.
                  </p>
                </div>
              )}

              {monthLoading && (
                <div className="collection-loading-state">
                  <LoaderCircle size={28} className="collection-spin" />

                  <span>Loading monthly decisions</span>
                </div>
              )}

              {monthError && (
                <div className="collection-error-state">
                  <AlertCircle size={22} />

                  <span>{monthError}</span>
                </div>
              )}

              {!monthLoading && monthData && (
                <>
                  <div className="collection-section-heading">
                    <div>
                      <span>
                        {monthData.month_name} {monthData.year}
                      </span>

                      <h2>Decisions and Signed Resolutions</h2>
                    </div>

                    <strong className="collection-month-total">
                      {monthData.case_count}
                    </strong>
                  </div>

                  <div className="collection-case-list">
                    {monthData.cases.map((caseItem) => (
                      <button
                        key={caseItem.id}
                        type="button"
                        className={`collection-case-item ${
                          selectedCase?.id === caseItem.id
                            ? "collection-case-item-active"
                            : ""
                        }`}
                        onClick={() => handleCaseSelection(caseItem)}
                      >
                        <FileText size={19} />

                        <div>
                          <strong>{caseItem.case_number}</strong>

                          <span>{caseItem.title}</span>

                          <small>{formatDate(caseItem.decision_date)}</small>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </article>
          </section>
        )}

        {selectedCase && (
          <section
            id="collection-document-viewer"
            className="collection-document-section"
          >
            <div className="collection-document-heading">
              <div>
                <span>Original Supreme Court PDF</span>

                <h2>{selectedCase.case_number}</h2>

                <p>{selectedCase.title}</p>
              </div>

              <div>
                <a href={selectedPdfUrl} target="_blank" rel="noreferrer">
                  <ExternalLink size={17} />
                  Open in New Tab
                </a>

                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
                  aria-label="Close PDF viewer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="collection-pdf-container">
              <CleanPdfViewer
                key={selectedPdfUrl}
                pdfUrl={selectedPdfUrl}
                title={`Original PDF for ${
                  selectedCase.case_number || selectedCase.pdf_filename
                }`}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
