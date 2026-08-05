import { useEffect, useRef, useState } from "react";

// Floating Desmos graphing calculator, styled after the digital SAT's
// built-in calculator. `show` controls whether the toggle button + panel
// are usable at all (true only while the current question is Math).
//
// The Desmos instance and its DOM container are created once and kept
// mounted for the lifetime of this component (i.e. for the whole Practice
// or Timed Test session) — closing the panel only hides it via CSS, so
// anything the student has typed survives moving to the next question.
function Calculator({ show }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(null); // null = default bottom-right corner

  const panelRef = useRef(null);
  const canvasRef = useRef(null);
  const calculatorRef = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (canvasRef.current && window.Desmos && !calculatorRef.current) {
      calculatorRef.current = window.Desmos.GraphingCalculator(canvasRef.current);
    }
    return () => {
      calculatorRef.current?.destroy();
      calculatorRef.current = null;
    };
  }, []);

  // Keep the graph paper correctly sized after a manual (CSS resize-handle) drag.
  useEffect(() => {
    if (!panelRef.current || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(() => {
      calculatorRef.current?.resize();
    });
    observer.observe(panelRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isDragging) return undefined;

    function handleMouseMove(e) {
      const panelEl = panelRef.current;
      const width = panelEl?.offsetWidth ?? 500;
      const height = panelEl?.offsetHeight ?? 400;
      const maxLeft = Math.max(0, window.innerWidth - width);
      const maxTop = Math.max(0, window.innerHeight - height);
      setPosition({
        left: Math.min(maxLeft, Math.max(0, e.clientX - dragOffset.current.x)),
        top: Math.min(maxTop, Math.max(0, e.clientY - dragOffset.current.y)),
      });
    }
    function handleMouseUp() {
      setIsDragging(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  function handleHeaderMouseDown(e) {
    const rect = panelRef.current.getBoundingClientRect();
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    setIsDragging(true);
  }

  const positionStyle = position
    ? { top: position.top, left: position.left, right: "auto", bottom: "auto" }
    : undefined;

  return (
    <>
      {show && (
        <button
          type="button"
          className="calculator-toggle"
          onClick={() => setIsOpen((o) => !o)}
          aria-pressed={isOpen}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <rect
              x="3"
              y="2"
              width="14"
              height="16"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
            />
            <line x1="6" y1="6" x2="14" y2="6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="6.5" cy="10.5" r="0.9" fill="currentColor" />
            <circle cx="10" cy="10.5" r="0.9" fill="currentColor" />
            <circle cx="13.5" cy="10.5" r="0.9" fill="currentColor" />
            <circle cx="6.5" cy="14" r="0.9" fill="currentColor" />
            <circle cx="10" cy="14" r="0.9" fill="currentColor" />
            <circle cx="13.5" cy="14" r="0.9" fill="currentColor" />
          </svg>
          Calculator
        </button>
      )}

      <div
        ref={panelRef}
        className="calculator-panel"
        style={{ ...positionStyle, display: show && isOpen ? "flex" : "none" }}
      >
        <div className="calculator-panel-header" onMouseDown={handleHeaderMouseDown}>
          <span>Calculator</span>
          <button
            type="button"
            className="calculator-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close calculator"
          >
            ×
          </button>
        </div>
        <div ref={canvasRef} className="calculator-canvas" />
      </div>
    </>
  );
}

export default Calculator;
