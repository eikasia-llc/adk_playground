"use client";

import type { A2UIComponent } from "@/hooks/useChat";

interface A2UIRendererProps {
  payload: { components: A2UIComponent[] };
  onAction?: (action: string) => void;
}

export default function A2UIRenderer({ payload, onAction }: A2UIRendererProps) {
  return (
    <div className="a2ui-container">
      {payload.components.map((comp, idx) => (
        <ComponentNode key={idx} component={comp} onAction={onAction} />
      ))}
    </div>
  );
}

function ComponentNode({
  component,
  onAction,
}: {
  component: A2UIComponent;
  onAction?: (action: string) => void;
}) {
  switch (component.type) {
    case "text":
      return <p>{component.value}</p>;

    case "button":
      return (
        <button
          className="a2ui-button"
          onClick={() => onAction?.(component.action)}
        >
          {component.label}
        </button>
      );

    case "card":
      return (
        <div className="a2ui-card">
          <h3>{component.title}</h3>
          {component.subtitle && (
            <p className="subtitle">{component.subtitle}</p>
          )}
          <div className="card-body">
            {component.body.map((child, i) => (
              <ComponentNode key={i} component={child} onAction={onAction} />
            ))}
          </div>
        </div>
      );

    case "list":
      return (
        <ul className="a2ui-list">
          {component.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );

    case "rps_selector": {
      const options = [
        { label: "🪨 Rock",     action: "selected_rps_rock" },
        { label: "📄 Paper",    action: "selected_rps_paper" },
        { label: "✂️ Scissors", action: "selected_rps_scissors" },
      ];
      return (
        <div className="a2ui-rps-selector">
          {component.prompt && (
            <p className="rps-selector-prompt">{component.prompt}</p>
          )}
          <div className="rps-selector-grid">
            {options.map((opt) => (
              <button
                key={opt.action}
                className="rps-btn"
                onClick={() => onAction?.(opt.action)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "sealed_box":
      return (
        <div className="a2ui-sealed-box">
          <span className="sealed-box-icon">🔒</span>
          <span className="sealed-box-label">
            {component.label ?? "Rocky's choice is sealed!"}
          </span>
        </div>
      );

    default:
      return null;
  }
}
