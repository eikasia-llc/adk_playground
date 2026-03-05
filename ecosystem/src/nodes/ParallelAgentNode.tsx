import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { ParallelAgentData } from '../types/agent'
import BaseNode from './BaseNode'

export default function ParallelAgentNode({ data, selected }: NodeProps<Node<ParallelAgentData>>) {
  return (
    <BaseNode kind="ParallelAgent" name={data.name} selected={selected}>
      {data.description && <span>{data.description}</span>}
    </BaseNode>
  )
}
