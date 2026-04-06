import type { Node, Edge } from '@xyflow/react'
import type { NodeData, AgentKind } from '../types/agent'

export interface PresetMeta {
  name: string
  description?: string
  source_repo?: string
  created?: string
}

/** Generate a Python variable name from a display name */
function pyVar(name: string): string {
  return name.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'agent'
}

/** Topological sort — returns node IDs leaves-first */
function topoSort(nodes: Node<NodeData>[], subAgentEdges: Edge[]): string[] {
  const children: Record<string, string[]> = {}
  const parents: Record<string, string[]> = {}
  for (const n of nodes) {
    children[n.id] = []
    parents[n.id] = []
  }
  for (const e of subAgentEdges) {
    children[e.source].push(e.target)
    parents[e.target].push(e.source)
  }
  const visited = new Set<string>()
  const order: string[] = []
  function visit(id: string) {
    if (visited.has(id)) return
    visited.add(id)
    for (const child of children[id]) visit(child)
    order.push(id)
  }
  for (const n of nodes) visit(n.id)
  // order is reverse-topological (roots first) — we want leaves first
  return order.reverse()
}

export function generatePythonCode(nodes: Node<NodeData>[], edges: Edge[], meta?: PresetMeta | null): string {
  if (nodes.length === 0) return '# Empty design — add some nodes first\n'

  const subAgentEdges = edges.filter((e) => e.data?.kind === 'sub_agent' || !e.data?.kind)
  const toolEdges = edges.filter((e) => e.data?.kind === 'tool')
  const responseEdges = edges.filter((e) => e.data?.kind === 'response')

  // Information edges: any node ↔ an info-set node
  const INFO_SET_KINDS: AgentKind[] = ['Database', 'ArtifactStore', 'Context', 'SessionState', 'Memory']
  const infoEdges = edges.filter((e) => {
    const sk = nodes.find((n) => n.id === e.source)?.data.kind
    const tk = nodes.find((n) => n.id === e.target)?.data.kind
    return (sk && INFO_SET_KINDS.includes(sk)) || (tk && INFO_SET_KINDS.includes(tk))
  })

  // Map: agentId → [Context node ids] (context injects content into agent instruction)
  // An edge from Context → agent means "inject this context into that agent"
  const agentContexts: Record<string, string[]> = {}
  for (const e of infoEdges) {
    const sourceNode = nodes.find((n) => n.id === e.source)
    const targetNode = nodes.find((n) => n.id === e.target)
    if (sourceNode?.data.kind === 'Context' && targetNode && !INFO_SET_KINDS.includes(targetNode.data.kind)) {
      if (!agentContexts[e.target]) agentContexts[e.target] = []
      agentContexts[e.target].push(e.source)
    }
    if (targetNode?.data.kind === 'Context' && sourceNode && !INFO_SET_KINDS.includes(sourceNode.data.kind)) {
      if (!agentContexts[e.source]) agentContexts[e.source] = []
      agentContexts[e.source].push(e.target)
    }
  }

  // Map: agentId → A2UIResponse node id
  const agentA2UI: Record<string, string> = {}
  for (const e of responseEdges) {
    const target = nodes.find((n) => n.id === e.target)
    if (target?.data.kind === 'A2UIResponse') {
      agentA2UI[e.source] = e.target
    }
  }

  // Map: agentId → [toolId, ...]
  const agentTools: Record<string, string[]> = {}
  for (const e of toolEdges) {
    if (!agentTools[e.source]) agentTools[e.source] = []
    agentTools[e.source].push(e.target)
  }

  // Map: parentId → [childId, ...]
  const subAgentChildren: Record<string, string[]> = {}
  for (const e of subAgentEdges) {
    if (!subAgentChildren[e.source]) subAgentChildren[e.source] = []
    subAgentChildren[e.source].push(e.target)
  }

  // Identify root: workflow agent with no incoming sub_agent edges
  const childIds = new Set(subAgentEdges.map((e) => e.target))
  const workflowKinds: AgentKind[] = ['SequentialAgent', 'ParallelAgent', 'LoopAgent', 'LlmAgent']
  // A2UIResponse nodes are not agents — exclude from root computation
  const roots = nodes.filter(
    (n) => workflowKinds.includes(n.data.kind) && !childIds.has(n.id),
  )

  const nodeById: Record<string, Node<NodeData>> = {}
  for (const n of nodes) nodeById[n.id] = n

  // Sort: leaves first so every variable is defined before it's referenced
  const sortedIds = topoSort(nodes, subAgentEdges)

  // Collect which ADK kinds are actually used
  const usedKinds = new Set(nodes.map((n) => n.data.kind))
  const hasTool = usedKinds.has('Tool') || usedKinds.has('Database')
  const hasMcp = usedKinds.has('McpToolset')
  const hasScript = usedKinds.has('Script')
  const hasMemory = usedKinds.has('Memory')
  const hasArtifactStore = usedKinds.has('ArtifactStore')
  const hasSessionState = usedKinds.has('SessionState')
  const hasDatabase = usedKinds.has('Database')

  const lines: string[] = []

  // ── Module docstring from _meta ───────────────────────────────────────────
  if (meta?.name) {
    const today = new Date().toISOString().slice(0, 10)
    const sep = '=' .repeat(meta.name.length)
    lines.push('"""')
    lines.push(meta.name)
    lines.push(sep)
    if (meta.description) lines.push(meta.description)
    if (meta.source_repo) lines.push('')
    if (meta.source_repo) lines.push(`Source: ${meta.source_repo}`)
    lines.push(`Generated: ${meta.created ?? today} by ADK Agent Designer`)
    lines.push('"""')
  } else {
    lines.push('# Generated by ADK Agent Designer')
  }
  lines.push('')

  // ── Imports ───────────────────────────────────────────────────────────────
  if (usedKinds.has('LlmAgent')) {
    lines.push('from google.adk.agents.llm_agent import LlmAgent')
  }
  if (usedKinds.has('SequentialAgent')) {
    lines.push('from google.adk.agents.sequential_agent import SequentialAgent')
  }
  if (usedKinds.has('ParallelAgent')) {
    lines.push('from google.adk.agents.parallel_agent import ParallelAgent')
  }
  if (usedKinds.has('LoopAgent')) {
    lines.push('from google.adk.agents.loop_agent import LoopAgent')
  }
  if (hasMcp) {
    lines.push('from google.adk.tools.mcp_tool import McpToolset')
    lines.push(
      'from google.adk.tools.mcp_tool.mcp_session_manager import StdioConnectionParams',
    )
    lines.push('from mcp import StdioServerParameters')
  }
  if (hasTool) {
    lines.push('from google.adk.tools import ToolContext  # noqa: F401 — available if needed')
  }
  if (hasMemory) {
    const memNodes = nodes.filter((n) => n.data.kind === 'Memory')
    const needsVertexRag = memNodes.some((n) => n.data.service_type === 'VertexAiRag')
    if (needsVertexRag) {
      lines.push('from google.adk.memory import VertexAiRagMemoryService')
    } else {
      lines.push('from google.adk.memory import InMemoryMemoryService')
    }
  }
  if (hasArtifactStore) {
    const artNodes = nodes.filter((n) => n.data.kind === 'ArtifactStore')
    const needsGcs = artNodes.some((n) => n.data.service_type === 'GCS')
    if (needsGcs) {
      lines.push('from google.adk.artifacts import GcsArtifactService')
    } else {
      lines.push('from google.adk.artifacts import InMemoryArtifactService')
    }
  }
  lines.push('')

  // ── Session State documentation ───────────────────────────────────────────
  if (hasSessionState) {
    for (const n of nodes) {
      if (n.data.kind !== 'SessionState') continue
      const d = n.data
      const keys = d.keys.split(',').map((k: string) => k.trim()).filter(Boolean)
      if (keys.length > 0) {
        lines.push(`# Session State keys used in this pipeline (${d.name}):`)
        const maxLen = Math.max(...keys.map((k: string) => k.length))
        for (const key of keys) {
          lines.push(`#   ${key.padEnd(maxLen)}  – (set via output_key; read via {${key}} in instructions)`)
        }
        if (d.schema) {
          lines.push('#')
          lines.push(`#   Schema: ${d.schema}`)
        }
        lines.push('')
      }
    }
  }

  // ── Memory service instantiation ─────────────────────────────────────────
  if (hasMemory) {
    for (const n of nodes) {
      if (n.data.kind !== 'Memory') continue
      const d = n.data
      const varName = pyVar(d.name) + '_service'
      if (d.service_type === 'VertexAiRag') {
        lines.push(`${varName} = VertexAiRagMemoryService(`)
        if (d.collection) lines.push(`    corpus_resource_name='${d.collection}',`)
        lines.push(')')
      } else {
        lines.push(`${varName} = InMemoryMemoryService()`)
      }
      lines.push(`# Pass to Runner: Runner(..., memory_service=${varName})`)
      lines.push('')
    }
  }

  // ── Artifact service instantiation ───────────────────────────────────────
  if (hasArtifactStore) {
    for (const n of nodes) {
      if (n.data.kind !== 'ArtifactStore') continue
      const d = n.data
      const varName = pyVar(d.name) + '_service'
      if (d.service_type === 'GCS') {
        lines.push(`${varName} = GcsArtifactService(`)
        if (d.bucket) lines.push(`    bucket_name='${d.bucket}',`)
        lines.push(')')
      } else {
        lines.push(`${varName} = InMemoryArtifactService()`)
      }
      lines.push(`# Pass to Runner: Runner(..., artifact_service=${varName})`)
      lines.push('')
    }
  }

  // ── Database tool stubs ───────────────────────────────────────────────────
  if (hasDatabase) {
    for (const n of nodes) {
      if (n.data.kind !== 'Database') continue
      const d = n.data
      const varName = pyVar(d.name)
      lines.push(`def query_${varName}(query: str) -> str:`)
      lines.push(`    """Query the ${d.name} (${d.db_type || 'database'}).`)
      if (d.description) lines.push(`    ${d.description}`)
      if (d.connection) lines.push(`    Connection: ${d.connection}`)
      lines.push(`    """`)
      lines.push(`    # TODO: implement database query`)
      lines.push(`    raise NotImplementedError`)
      lines.push('')
    }
  }

  // ── Standalone scripts (not ADK classes — emit as subprocess stubs) ────────
  if (hasScript) {
    lines.push('import subprocess')
    lines.push('')
    for (const id of sortedIds) {
      const node = nodeById[id]
      if (!node || node.data.kind !== 'Script') continue
      const d = node.data
      const varName = pyVar(d.name)
      lines.push(`def run_${varName}():`)
      lines.push(`    """${d.description || d.name}`)
      lines.push(`    Invoked via: ${d.command}`)
      lines.push(`    """`)
      lines.push(`    subprocess.run(['${d.command.replace(/'/g, "\\'")}'], check=True)`)
      lines.push('')
    }
  }

  // ── Tool function definitions ─────────────────────────────────────────────
  for (const id of sortedIds) {
    const node = nodeById[id]
    if (!node || node.data.kind !== 'Tool') continue
    const d = node.data
    const varName = pyVar(d.name)
    lines.push(`def ${varName}() -> dict:`)
    lines.push(`    """${d.description || d.name}"""`)
    for (const codeLine of d.code.split('\n')) {
      lines.push(codeLine)
    }
    lines.push('')
  }

  // ── MCP Toolset factories ─────────────────────────────────────────────────
  for (const id of sortedIds) {
    const node = nodeById[id]
    if (!node || node.data.kind !== 'McpToolset') continue
    const d = node.data
    const varName = pyVar(d.name)
    const args = d.args.trim() ? `[${d.args.split(' ').map((a) => `'${a}'`).join(', ')}]` : '[]'
    const filterLine = d.tool_filter.trim()
      ? `,\n    tool_filter=[${d.tool_filter.split(',').map((t) => `'${t.trim()}'`).join(', ')}],`
      : ''
    lines.push(`${varName} = McpToolset(`)
    lines.push(`    connection_params=StdioConnectionParams(`)
    lines.push(`        server_params=StdioServerParameters(`)
    lines.push(`            command='${d.command}',`)
    lines.push(`            args=${args},`)
    lines.push(`        ),`)
    lines.push(`    )${filterLine}`)
    lines.push(`)`)
    lines.push('')
  }

  // ── Agent definitions ─────────────────────────────────────────────────────
  for (const id of sortedIds) {
    const node = nodeById[id]
    if (!node) continue
    const { kind } = node.data
    if (kind === 'Tool' || kind === 'McpToolset' || kind === 'Script' || kind === 'A2UIResponse'
        || kind === 'Database' || kind === 'ArtifactStore' || kind === 'Context'
        || kind === 'SessionState' || kind === 'Memory' || kind === 'Human') continue

    const isRoot = roots.length === 1 && roots[0].id === id
    const varName = isRoot ? 'root_agent' : pyVar(node.data.name)

    if (kind === 'LlmAgent') {
      const d = node.data
      const toolsList = (agentTools[id] ?? [])
        .map((tid) => pyVar(nodeById[tid]?.data.name ?? tid))
        .join(', ')

      // Build instruction — append Context content and A2UI block if connected
      let instruction = d.instruction
      // Inject Context nodes connected to this agent
      for (const ctxId of (agentContexts[id] ?? [])) {
        const ctxNode = nodeById[ctxId]
        if (ctxNode?.data.kind === 'Context' && ctxNode.data.content) {
          instruction = instruction + `\n\n# [context: ${ctxNode.data.name}]\n${ctxNode.data.content}`
        }
      }
      const a2uiNodeId = agentA2UI[id]
      if (a2uiNodeId) {
        const a2uiNode = nodeById[a2uiNodeId]
        if (a2uiNode?.data.kind === 'A2UIResponse') {
          const components = a2uiNode.data.components
            .split(',')
            .map((c: string) => c.trim())
            .filter(Boolean)
          const componentLines = components.map((c: string) => {
            const schemas: Record<string, string> = {
              text:         '{ "type": "text", "value": "<string>" }',
              button:       '{ "type": "button", "label": "<string>", "action": "<string>" }',
              card:         '{ "type": "card", "title": "<string>", "subtitle": "<string>", "body": [...] }',
              list:         '{ "type": "list", "items": ["<string>", ...] }',
              rps_selector: '{ "type": "rps_selector", "prompt": "<string>" }',
              sealed_box:   '{ "type": "sealed_box", "label": "<string>" }',
            }
            return `  ${c.padEnd(14)} → ${schemas[c] ?? `{ "type": "${c}" }`}`
          })
          const a2uiBlock = [
            '',
            'When your response contains structured data or requires user input, return a',
            'JSON object with a top-level \'components\' array. Supported types:',
            '',
            ...componentLines,
            '',
            'For plain conversational replies, respond in normal text — NOT JSON.',
          ].join('\n')
          instruction = instruction + a2uiBlock
        }
      }

      lines.push(`${varName} = LlmAgent(`)
      lines.push(`    model='${d.model}',`)
      lines.push(`    name='${d.name}',`)
      if (d.description) lines.push(`    description='${d.description}',`)
      if (d.output_key) lines.push(`    output_key='${d.output_key}',`)
      if (toolsList) lines.push(`    tools=[${toolsList}],`)
      lines.push(`    instruction=(`)
      for (const instrLine of instruction.split('\n')) {
        lines.push(`        '${instrLine.replace(/'/g, "\\'")}'`)
      }
      lines.push(`    ),`)
      lines.push(`)`)
      lines.push('')
    } else if (kind === 'SequentialAgent') {
      const d = node.data
      const children = (subAgentChildren[id] ?? [])
        .map((cid) => {
          const isChildRoot = roots.length === 1 && roots[0].id === cid
          return isChildRoot ? 'root_agent' : pyVar(nodeById[cid]?.data.name ?? cid)
        })
        .join(', ')
      lines.push(`${varName} = SequentialAgent(`)
      lines.push(`    name='${d.name}',`)
      if (d.description) lines.push(`    description='${d.description}',`)
      lines.push(`    sub_agents=[${children}],`)
      lines.push(`)`)
      lines.push('')
    } else if (kind === 'ParallelAgent') {
      const d = node.data
      const children = (subAgentChildren[id] ?? [])
        .map((cid) => pyVar(nodeById[cid]?.data.name ?? cid))
        .join(', ')
      lines.push(`${varName} = ParallelAgent(`)
      lines.push(`    name='${d.name}',`)
      if (d.description) lines.push(`    description='${d.description}',`)
      lines.push(`    sub_agents=[${children}],`)
      lines.push(`)`)
      lines.push('')
    } else if (kind === 'LoopAgent') {
      const d = node.data
      const children = (subAgentChildren[id] ?? [])
        .map((cid) => pyVar(nodeById[cid]?.data.name ?? cid))
        .join(', ')
      lines.push(`${varName} = LoopAgent(`)
      lines.push(`    name='${d.name}',`)
      if (d.description) lines.push(`    description='${d.description}',`)
      lines.push(`    sub_agents=[${children}],`)
      lines.push(`    max_iterations=${d.max_iterations},`)
      lines.push(`)`)
      lines.push('')
    }
  }

  // If multiple roots, comment them all as candidates
  if (roots.length !== 1) {
    lines.push(
      '# WARNING: Could not determine a single root agent.',
    )
    lines.push(
      '# Candidates: ' + roots.map((r) => pyVar(r.data.name)).join(', '),
    )
    if (roots.length > 0) {
      lines.push(`root_agent = ${pyVar(roots[0].data.name)}  # ← pick the correct root`)
    }
  }

  return lines.join('\n')
}
