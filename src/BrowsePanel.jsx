import { useEffect, useState } from "react";
import { domainGroups, searchQuestions, subjectLabel } from "./quizUtils";
import "./BrowsePanel.css";

function BrowsePanel({ onClose, onStartFilter, onStartSearch }) {
  const [query, setQuery] = useState("");
  const trimmed = query.trim();
  const results = trimmed ? searchQuestions(trimmed) : [];

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="browse-backdrop" onClick={onClose}>
      <div
        className="browse-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Browse and search questions"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="browse-header">
          <span className="browse-title">Browse &amp; Search</span>
          <button type="button" className="browse-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        <div className="browse-search">
          <svg className="browse-search-icon" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M13.5 13.5 18 18M15.5 9a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            className="browse-search-input"
            placeholder="Search question text..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {trimmed ? (
          <div className="browse-results">
            <span className="browse-results-count">
              {results.length} question{results.length === 1 ? "" : "s"} match
            </span>
            {results.length > 0 && (
              <button
                type="button"
                className="concept-start-btn"
                onClick={() => onStartSearch(trimmed)}
              >
                Practice These Results
              </button>
            )}
          </div>
        ) : (
          <div className="browse-scroll">
            <button
              type="button"
              className="browse-all-btn"
              onClick={() => onStartFilter({ subject: "all", domain: null, skill: null })}
            >
              Practice All Questions
            </button>

            <span className="concept-sub-label">Browse by domain</span>
            <div className="browse-domains">
              {domainGroups.map((group) => (
                <div className="browse-domain-group" key={group.domain}>
                  <button
                    type="button"
                    className="browse-domain-btn"
                    onClick={() =>
                      onStartFilter({ subject: group.subject, domain: group.domain, skill: null })
                    }
                  >
                    <span className="browse-domain-name">{group.domain}</span>
                    <span className="browse-domain-subject">{subjectLabel(group.subject)}</span>
                  </button>
                  <div className="browse-skill-list">
                    {group.skills.map((skill) => (
                      <button
                        type="button"
                        key={skill}
                        className="browse-skill-btn"
                        onClick={() =>
                          onStartFilter({ subject: group.subject, domain: group.domain, skill })
                        }
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BrowsePanel;
