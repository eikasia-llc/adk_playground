import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { ScriptData } from '../types/agent'
import BaseNode from './BaseNode'

export default function ScriptNode({ data, selected }: NodeProps<Node<ScriptData>>) {
  return (
    <BaseNode kind="Script" name={data.name} selected={selected}>
      {data.command && <span style={{ fontFamily: 'monospace', fontSize: 10 }}>{data.command}</span>}
      {data.description && <span>{data.description}</span>}
    </BaseNode>
  )
}
