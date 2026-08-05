import { useState } from "react";
import { domainGroups } from "./quizUtils";

function Sidebar({ activeKey, onSelectAll, onSelectTimed, onSelectSubject, onSelectSkill }) {
  // null = no manual override yet, so the submenu auto-opens whenever the
  // active filter is a skill; true/false once the user has toggled it by hand.
  const [manualExpanded, setManualExpanded] = useState(null);
  const autoExpanded = Boolean(activeKey && activeKey.startsWith("skill:"));
  const expanded = manualExpanded === null ? autoExpanded : manualExpanded;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">SAT</span>
        <span className="brand-name">SAT Practice</span>
      </div>

      <div className="sidebar-search">
        <svg className="search-icon" viewBox="0 0 20 20" aria-hidden="true">
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
          className="sidebar-search-input"
          placeholder="Search questions..."
          readOnly
        />
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Study Material</div>
        <ul className="nav-list">
          <li>
            <button
              type="button"
              className={`nav-item${activeKey === "all" ? " active" : ""}`}
              onClick={onSelectAll}
            >
              <span>All Questions</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-item${activeKey === "timed" ? " active" : ""}`}
              onClick={onSelectTimed}
            >
              <span>Timed Test</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-item${activeKey === "rw" ? " active" : ""}`}
              onClick={() => onSelectSubject("reading_writing")}
            >
              <span>Reading &amp; Writing</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className={`nav-item${activeKey === "math" ? " active" : ""}`}
              onClick={() => onSelectSubject("math")}
            >
              <span>Math</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              className="nav-item nav-item-expand"
              onClick={() => setManualExpanded(!expanded)}
              aria-expanded={expanded}
            >
              <span>By Question Type</span>
              <span className={`nav-chevron${expanded ? " open" : ""}`} aria-hidden="true">
                ▾
              </span>
            </button>

            {expanded && (
              <div className="nav-submenu">
                {domainGroups.map((group) => (
                  <div className="nav-domain-group" key={`${group.subject}::${group.domain}`}>
                    <div className="nav-domain-label">{group.domain}</div>
                    {group.skills.map((skill) => {
                      const key = `skill:${group.domain}::${skill}`;
                      return (
                        <button
                          type="button"
                          key={key}
                          className={`nav-item nav-item-sub${activeKey === key ? " active" : ""}`}
                          onClick={() => onSelectSkill(group.subject, group.domain, skill)}
                        >
                          <span>{skill}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
