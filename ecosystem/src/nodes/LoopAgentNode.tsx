import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { LoopAgentData } from '../types/agent'
import BaseNode from './BaseNode'

export default function LoopAgentNode({ data, selected }: NodeProps<Node<LoopAgentData>>) {
  return (
    <BaseNode kind="LoopAgent" name={data.name} selected={selected}>
      <span>max iterations: {data.max_iterations}</span>
    </BaseNode>
  )
}
