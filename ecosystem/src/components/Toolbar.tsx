import type { Node, Edge } from '@xyflow/react'
import type { NodeData } from '../types/agent'
import { generatePythonCode } from '../utils/codeGenerator'
import './Toolbar.css'

interface ToolbarProps {
  nodes: Node<NodeData>[]
  edges: Edge[]
  onNew: () => void
  onSave: () => void
  onLoad: () => void
}

export default function Toolbar({ nodes, edges, onNew, onSave, onLoad }: ToolbarProps) {
  function handleExport() {
    const code = generatePythonCode(nodes, edges)
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'agent.py'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <header className="toolbar">
      <div className="toolbar-brand">
        <span className="toolbar-logo">⬡</span>
        <span className="toolbar-title">ADK Agent Designer</span>
      </div>
      <div className="toolbar-actions">
        <button className="toolbar-btn" onClick={onNew} title="Clear canvas">
          New
        </button>
        <button className="toolbar-btn" onClick={onSave} title="Save to browser storage">
          Save
        </button>
        <button className="toolbar-btn" onClick={onLoad} title="Load from browser storage">
          Load
        </button>
        <button className="toolbar-btn toolbar-btn-primary" onClick={handleExport} title="Export agent.py">
          Export Python
        </button>
      </div>
    </header>
  )
}
