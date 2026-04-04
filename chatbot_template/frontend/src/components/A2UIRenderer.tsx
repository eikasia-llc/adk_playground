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

    case "number_selector":
      return (
        <div className="a2ui-number-selector">
          {component.prompt && (
            <p className="number-selector-prompt">{component.prompt}</p>
          )}
          <div className="number-selector-grid">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className="number-selector-btn"
                onClick={() => onAction?.(`selected_number_${n}`)}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      );

    default:
      return null;
  }
}
