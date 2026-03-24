import type { Node } from '@xyflow/react'
import type { NodeData } from '../types/agent'
import { kindColor, kindIcon } from '../types/agent'
import './PropertyPanel.css'

interface PropertyPanelProps {
  node: Node<NodeData> | null
  onChange: (id: string, data: Partial<NodeData>) => void
  onDelete: (id: string) => void
}

export default function PropertyPanel({ node, onChange, onDelete }: PropertyPanelProps) {
  if (!node) {
    return (
      <aside className="property-panel property-panel-empty">
        <p>Select a node to edit its properties.</p>
      </aside>
    )
  }

  const activeNode = node  // capture after null guard — TypeScript narrows in closures via const
  const { data } = activeNode
  const color = kindColor(data.kind)
  const icon = kindIcon(data.kind)

  function update(patch: Partial<NodeData>) {
    onChange(activeNode.id, patch)
  }

  return (
    <aside className="property-panel">
      <div className="pp-header" style={{ borderLeftColor: color }}>
        <span className="pp-icon">{icon}</span>
        <div>
          <div className="pp-kind">{data.kind}</div>
          <div className="pp-name">{data.name}</div>
        </div>
      </div>

      <div className="pp-fields">
        {/* ── Common name / label field ── */}
        <Field label="Name">
          <input
            value={data.name}
            onChange={(e) => update({ name: e.target.value } as Partial<NodeData>)}
          />
        </Field>

        {/* ── LlmAgent ── */}
        {data.kind === 'LlmAgent' && (
          <>
            <Field label="Model">
              <select
                value={data.model}
                onChange={(e) => update({ model: e.target.value } as Partial<NodeData>)}
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              </select>
            </Field>
            <Field label="Description">
              <input
                value={data.description}
                onChange={(e) => update({ description: e.target.value } as Partial<NodeData>)}
                placeholder="Short description"
              />
            </Field>
            <Field label="Output key">
              <input
                value={data.output_key}
                onChange={(e) => update({ output_key: e.target.value } as Partial<NodeData>)}
                placeholder="e.g. overview"
              />
            </Field>
            <Field label="Instruction">
              <textarea
                value={data.instruction}
                onChange={(e) => update({ instruction: e.target.value } as Partial<NodeData>)}
                rows={6}
                placeholder="System prompt / instruction for this agent…"
              />
            </Field>
          </>
        )}

        {/* ── SequentialAgent / ParallelAgent ── */}
        {(data.kind === 'SequentialAgent' || data.kind === 'ParallelAgent') && (
          <Field label="Description">
            <input
              value={data.description}
              onChange={(e) => update({ description: e.target.value } as Partial<NodeData>)}
              placeholder="Short description"
            />
          </Field>
        )}

        {/* ── LoopAgent ── */}
        {data.kind === 'LoopAgent' && (
          <>
            <Field label="Description">
              <input
                value={data.description}
                onChange={(e) => update({ description: e.target.value } as Partial<NodeData>)}
                placeholder="Short description"
              />
            </Field>
            <Field label="Max iterations">
              <input
                type="number"
                min={1}
                max={20}
                value={data.max_iterations}
                onChange={(e) =>
                  update({ max_iterations: parseInt(e.target.value) || 1 } as Partial<NodeData>)
                }
              />
            </Field>
          </>
        )}

        {/* ── Tool ── */}
        {data.kind === 'Tool' && (
          <>
            <Field label="Description">
              <input
                value={data.description}
                onChange={(e) => update({ description: e.target.value } as Partial<NodeData>)}
                placeholder="What does this tool do?"
              />
            </Field>
            <Field label="Function body">
              <textarea
                value={data.code}
                onChange={(e) => update({ code: e.target.value } as Partial<NodeData>)}
                rows={8}
                placeholder="    # Python code inside the def block"
                className="pp-code"
              />
            </Field>
          </>
        )}

        {/* ── McpToolset ── */}
        {data.kind === 'McpToolset' && (
          <>
            <Field label="Command">
              <input
                value={data.command}
                onChange={(e) => update({ command: e.target.value } as Partial<NodeData>)}
                placeholder="e.g. mcp-server-fetch"
              />
            </Field>
            <Field label="Args (space-separated)">
              <input
                value={data.args}
                onChange={(e) => update({ args: e.target.value } as Partial<NodeData>)}
                placeholder="e.g. --port 8080"
              />
            </Field>
            <Field label="Tool filter (comma-separated)">
              <input
                value={data.tool_filter}
                onChange={(e) => update({ tool_filter: e.target.value } as Partial<NodeData>)}
                placeholder="e.g. fetch, search (empty = all)"
              />
            </Field>
          </>
        )}

        {/* ── Human ── */}
        {data.kind === 'Human' && (
          <>
            <Field label="Description">
              <input
                value={data.description}
                onChange={(e) => update({ description: e.target.value } as Partial<NodeData>)}
                placeholder="Short description"
              />
            </Field>
            <Field label="Prompt">
              <textarea
                value={data.prompt}
                onChange={(e) => update({ prompt: e.target.value } as Partial<NodeData>)}
                rows={3}
                placeholder="Prompt shown to the human operator…"
              />
            </Field>
          </>
        )}

        {/* ── Evaluator ── */}
        {data.kind === 'Evaluator' && (
          <>
            <Field label="Model">
              <select
                value={data.model}
                onChange={(e) => update({ model: e.target.value } as Partial<NodeData>)}
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-1.5-pro">gemini-1.5-pro</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
              </select>
            </Field>
            <Field label="Success condition">
              <textarea
                value={data.success_condition}
                onChange={(e) => update({ success_condition: e.target.value } as Partial<NodeData>)}
                rows={5}
                placeholder="Natural-language rubric the LLM checks the output against…"
              />
            </Field>
            <p style={{ fontSize: 11, color: '#475569', lineHeight: 1.5, marginTop: 4 }}>
              Place this node as the last sub-agent inside a Loop. It will call <code>exit_loop</code> when the success condition is met, or let the loop continue up to max iterations.
            </p>
          </>
        )}

        {/* ── Database ── */}
        {data.kind === 'Database' && (
          <>
            <Field label="Description">
              <input
                value={data.description}
                onChange={(e) => update({ description: e.target.value } as Partial<NodeData>)}
                placeholder="What data does this store?"
              />
            </Field>
            <Field label="DB type">
              <input
                value={data.db_type}
                onChange={(e) => update({ db_type: e.target.value } as Partial<NodeData>)}
                placeholder="e.g. PostgreSQL, Firestore, Pinecone"
              />
            </Field>
            <Field label="Connection">
              <input
                value={data.connection}
                onChange={(e) => update({ connection: e.target.value } as Partial<NodeData>)}
                placeholder="Connection string or resource ID"
              />
            </Field>
          </>
        )}

        {/* ── Context ── */}
        {data.kind === 'Context' && (
          <>
            <Field label="Description">
              <input
                value={data.description}
                onChange={(e) => update({ description: e.target.value } as Partial<NodeData>)}
                placeholder="What kind of knowledge is this?"
              />
            </Field>
            <Field label="Content">
              <textarea
                value={data.content}
                onChange={(e) => update({ content: e.target.value } as Partial<NodeData>)}
                rows={6}
                placeholder="Static text, instructions, or reference data injected into the pipeline…"
              />
            </Field>
          </>
        )}
      </div>

      <div className="pp-footer">
        <button className="pp-delete-btn" onClick={() => onDelete(node.id)}>
          Delete node
        </button>
      </div>
    </aside>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="pp-field">
      <label className="pp-field-label">{label}</label>
      {children}
    </div>
  )
}
