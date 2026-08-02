"use client";

import type { A2UIComponent } from "@/hooks/useChat";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

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

    case "text_input":
      return (
        <div className="a2ui-text-input">
          {component.label && <label className="input-label">{component.label}</label>}
          <input 
            type={component.input_type || "text"} 
            placeholder={component.placeholder} 
            required={component.required}
            className="text-input-field" 
            onBlur={(e) => onAction?.(`input_${e.target.value}`)}
          />
        </div>
      );

    case "slider":
      return (
        <div className="a2ui-slider">
          {component.label && <label className="slider-label">{component.label}</label>}
          <input 
            type="range" 
            min={component.min_value} 
            max={component.max_value} 
            step={component.step || 1} 
            defaultValue={component.default_value} 
            onChange={(e) => onAction?.(`slider_${e.target.value}`)}
          />
        </div>
      );

    case "dropdown":
      return (
        <div className="a2ui-dropdown">
          {component.label && <label className="dropdown-label">{component.label}</label>}
          <select 
            defaultValue={component.default_value}
            onChange={(e) => onAction?.(`selected_${e.target.value}`)}
            className="dropdown-select"
          >
            {component.options.map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );

    case "checkbox_group":
      return (
        <div className="a2ui-checkbox-group">
          {component.group_label && <label className="checkbox-group-label">{component.group_label}</label>}
          <div className="checkbox-options">
            {component.options.map((opt, i) => (
              <div key={i} className="checkbox-item">
                <input 
                  type="checkbox" 
                  defaultChecked={opt.checked} 
                  onChange={(e) => onAction?.(`toggled_${opt.value}_${e.target.checked}`)} 
                />
                <label>{opt.label}</label>
              </div>
            ))}
          </div>
        </div>
      );

    case "chart": {
      const { chart_type, title, x_axis_label, y_axis_label, data } = component;
      const colors = ["#0070f3", "#00b4d8", "#90e0ef", "#caf0f8"];
      return (
        <div className="a2ui-chart" style={{ width: "100%", height: 260 }}>
          {title && <h3 className="chart-title" style={{ textAlign: "center", marginBottom: "10px" }}>{title}</h3>}
          <ResponsiveContainer width="100%" height={220}>
            {chart_type === "bar" ? (
              <BarChart data={data}>
                <XAxis dataKey="label" label={{ value: x_axis_label, position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: y_axis_label, angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0070f3" radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : chart_type === "line" ? (
              <LineChart data={data}>
                <XAxis dataKey="label" label={{ value: x_axis_label, position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: y_axis_label, angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0070f3" strokeWidth={2} dot={true} />
              </LineChart>
            ) : (
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      );
    }

    default:
      return null;
  }
}
