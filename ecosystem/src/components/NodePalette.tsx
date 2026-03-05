import { PALETTE_ITEMS } from '../types/agent'
import type { AgentKind } from '../types/agent'
import './NodePalette.css'

interface NodePaletteProps {
  onDragStart: (kind: AgentKind, event: React.DragEvent) => void
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <aside className="node-palette">
      <div className="palette-title">Nodes</div>
      {PALETTE_ITEMS.map((item) => (
        <div
          key={item.kind}
          className="palette-item"
          draggable
          onDragStart={(e) => onDragStart(item.kind, e)}
          style={{ borderLeftColor: item.color }}
          title={item.description}
        >
          <span className="palette-icon">{item.icon}</span>
          <div className="palette-text">
            <div className="palette-label">{item.label}</div>
            <div className="palette-desc">{item.description}</div>
          </div>
        </div>
      ))}

      <div className="palette-hint">
        Drag nodes onto the canvas.<br />
        Connect them by dragging from a handle.<br />
        Click a node to edit its properties.
      </div>

      <div className="palette-section-title">Edge types</div>
      <div className="palette-edge-legend">
        <div className="edge-legend-item">
          <span className="edge-line edge-line-solid" />
          <span>sub_agent</span>
        </div>
        <div className="edge-legend-item">
          <span className="edge-line edge-line-dashed" />
          <span>tool</span>
        </div>
      </div>
    </aside>
  )
}
