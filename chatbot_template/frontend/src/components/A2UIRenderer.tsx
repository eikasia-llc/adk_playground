"use client";

import type { A2UIComponent } from "@/hooks/useChat";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";

interface A2UIRendererProps {
  payload: { components: A2UIComponent[] };
  onAction?: (action: string) => void;
}

export default function A2UIRenderer({ payload, onAction }: A2UIRendererProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleValueChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const hasInputs = payload.components.some((c) =>
    ["text_input", "slider", "dropdown", "checkbox_group"].includes(c.type)
  );

  const handleSubmitAll = () => {
    const serialized = Object.entries(formData)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    onAction?.(`Submitted answers: ${serialized || "None"}`);
  };

  return (
    <div className="a2ui-container">
      {payload.components.map((comp, idx) => (
        <ComponentNode 
          key={idx} 
          component={comp} 
          onAction={onAction} 
          onValueChange={handleValueChange}
          formData={formData}
        />
      ))}
      {hasInputs && (
        <button 
          className="a2ui-button" 
          style={{ alignSelf: "flex-start", marginTop: "0.5rem" }} 
          onClick={handleSubmitAll}
        >
          Submit All ✦
        </button>
      )}
    </div>
  );
}

function ComponentNode({
  component,
  onAction,
  onValueChange,
  formData
}: {
  component: A2UIComponent;
  onAction?: (action: string) => void;
  onValueChange?: (key: string, value: any) => void;
  formData?: Record<string, any>;
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
              <ComponentNode 
                key={i} 
                component={child} 
                onAction={onAction} 
                onValueChange={onValueChange} 
                formData={formData} 
              />
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
            {component.label ?? "Chatty's choice is sealed with fairy wards! 🔒✨"}
          </span>
        </div>
      );

    case "text_input": {
      const key = component.label || component.placeholder || "input";
      return (
        <div className="a2ui-text-input">
          {component.label && <label className="input-label">{component.label}</label>}
          <input 
            type={component.input_type || "text"} 
            placeholder={component.placeholder} 
            required={component.required}
            className="text-input-field" 
            style={{ width: "100%" }}
            onChange={(e) => onValueChange?.(key, e.target.value)}
            defaultValue={component.default_value}
          />
        </div>
      );
    }

    case "slider": {
      const key = component.label || "slider";
      return (
        <div className="a2ui-slider">
          {component.label && <label className="slider-label">{component.label}</label>}
          <input 
            type="range" 
            min={component.min_value} 
            max={component.max_value} 
            step={component.step || 1} 
            defaultValue={component.default_value} 
            style={{ width: "100%" }}
            onChange={(e) => onValueChange?.(key, e.target.value)}
          />
        </div>
      );
    }

    case "dropdown": {
      const key = component.label || "dropdown";
      return (
        <div className="a2ui-dropdown">
          {component.label && <label className="dropdown-label">{component.label}</label>}
          <select 
            defaultValue={component.default_value}
            onChange={(e) => onValueChange?.(key, e.target.value)}
            className="dropdown-select"
            style={{ width: "100%" }}
          >
            {component.options.map((opt, i) => (
              <option key={i} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      );
    }

    case "checkbox_group": {
      const key = component.group_label || "checkboxes";
      const currentValues = formData?.[key] || [];
      return (
        <div className="a2ui-checkbox-group">
          {component.group_label && <label className="checkbox-group-label">{component.group_label}</label>}
          <div className="checkbox-options">
            {component.options.map((opt, i) => (
              <div key={i} className="checkbox-item">
                <input 
                  type="checkbox" 
                  defaultChecked={opt.checked} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    let newValues = [...currentValues];
                    if (checked) newValues.push(opt.value);
                    else newValues = newValues.filter((v: string) => v !== opt.value);
                    onValueChange?.(key, newValues);
                  }} 
                />
                <label>{opt.label}</label>
              </div>
            ))}
          </div>
        </div>
      );
    }

    case "chart": {
      const { chart_type, title, x_axis_label, y_axis_label, data } = component;
      const colors = ["#8b5cf6", "#06b6d4", "#fbbf24", "#f43f5e"];
      return (
        <div className="a2ui-chart" style={{ width: "100%", height: 260 }}>
          {title && <h3 className="chart-title" style={{ textAlign: "center", marginBottom: "10px" }}>{title}</h3>}
          <ResponsiveContainer width="100%" height={220}>
            {chart_type === "bar" ? (
              <BarChart data={data}>
                <XAxis dataKey="label" stroke="#94a3b8" label={{ value: x_axis_label, position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" label={{ value: y_axis_label, angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            ) : chart_type === "line" ? (
              <LineChart data={data}>
                <XAxis dataKey="label" stroke="#94a3b8" label={{ value: x_axis_label, position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
                <YAxis stroke="#94a3b8" label={{ value: y_axis_label, angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={3} dot={{ fill: '#fbbf24', r: 4 }} />
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

    case "mutation_form":
      return (
        <div className="a2ui-mutation-form a2ui-card">
          {component.title && <h3>{component.title}</h3>}
          <div className="form-fields" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {component.fields?.map((f: any, i: number) => {
              const key = f.name || f.label || `field_${i}`;
              return (
                <div key={i} className="a2ui-text-input">
                  <label className="input-label">{f.label || f.name}</label>
                  <input 
                    type={f.type || "text"} 
                    className="text-input-field" 
                    placeholder={`Enter ${f.name || f.label}...`}
                    onChange={(e) => onValueChange?.(key, e.target.value)}
                  />
                </div>
              );
            })}
          </div>
          <button 
            className="a2ui-button" 
            style={{ marginTop: "1rem" }} 
            onClick={() => {
              const fields = component.fields?.map((f: any, i: number) => {
                const key = f.name || f.label || `field_${i}`;
                return `${key}: ${formData?.[key] || ""}`;
              }).join(", ");
              onAction?.(`Submit mutation ${component.title || ""}: ${fields}`);
            }}
          >
            Submit
          </button>
        </div>
      );

    case "approval_card":
      return (
        <div className="a2ui-approval-card a2ui-card">
          <h3 style={{ color: "#ec4899" }}>⚠️ Approval Required</h3>
          <p style={{ marginBottom: "1rem" }}>{component.prompt}</p>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="a2ui-button" style={{ background: "#ec4899", color: "#fff" }} onClick={() => onAction?.("approve_mutation")}>Approve</button>
            <button className="a2ui-button" style={{ background: "#e2e8f0", color: "#333" }} onClick={() => onAction?.("reject_mutation")}>Reject</button>
          </div>
        </div>
      );

    case "filter_bar":
      return (
        <div className="a2ui-filter-bar">
          {component.filters?.map((f: any, i: number) => (
            <button key={i} className="filter-pill" onClick={() => onAction?.(`filter_updated_${f.key || f}`)}>
              {f.label || f}
            </button>
          ))}
        </div>
      );

    default:
      return null;
  }
}
