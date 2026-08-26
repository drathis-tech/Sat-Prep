import { renderMath } from "./renderMath";

// The formula sheet the digital SAT provides on both Math modules.
const REFERENCE = [
  { group: "Circle", items: ["$A = \\pi r^2$", "$C = 2\\pi r$"] },
  { group: "Rectangle", items: ["$A = \\ell w$", "$V = \\ell w h$"] },
  { group: "Triangle", items: ["$A = \\tfrac{1}{2} b h$", "$c^2 = a^2 + b^2$"] },
  {
    group: "Special right triangles",
    items: [
      "$30\\degree\\text{-}60\\degree\\text{-}90\\degree:\\ x,\\ x\\sqrt{3},\\ 2x$",
      "$45\\degree\\text{-}45\\degree\\text{-}90\\degree:\\ s,\\ s,\\ s\\sqrt{2}$",
    ],
  },
  { group: "Cylinder / Sphere", items: ["$V = \\pi r^2 h$", "$V = \\tfrac{4}{3}\\pi r^3$"] },
  { group: "Cone / Pyramid", items: ["$V = \\tfrac{1}{3}\\pi r^2 h$", "$V = \\tfrac{1}{3} \\ell w h$"] },
  {
    group: "Facts",
    items: ["Arc of a circle: $360\\degree = 2\\pi$ radians", "Angles of a triangle sum to $180\\degree$"],
  },
];

function ReferenceSheet({ onClose }) {
  return (
    <div className="pr-refsheet" role="dialog" aria-label="Reference sheet">
      <div className="pr-panel-head">
        <span className="pr-panel-title">Reference sheet</span>
        <button type="button" className="pr-panel-close" onClick={onClose} aria-label="Close reference sheet">
          ×
        </button>
      </div>
      {REFERENCE.map((g) => (
        <div className="pr-ref-group" key={g.group}>
          <span className="pr-ref-group-name">{g.group}</span>
          <div className="pr-ref-items">
            {g.items.map((item) => (
              <span key={item}>{renderMath(item)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ReferenceSheet;
