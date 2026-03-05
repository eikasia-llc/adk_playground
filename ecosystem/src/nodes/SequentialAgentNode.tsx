import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { SequentialAgentData } from '../types/agent'
import BaseNode from './BaseNode'

export default function SequentialAgentNode({ data, selected }: NodeProps<Node<SequentialAgentData>>) {
  return (
    <BaseNode kind="SequentialAgent" name={data.name} selected={selected}>
      {data.description && <span>{data.description}</span>}
    </BaseNode>
  )
}
