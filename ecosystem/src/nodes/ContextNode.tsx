import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { ContextData } from '../types/agent'
import BaseNode from './BaseNode'

export default function ContextNode({ data, selected }: NodeProps<Node<ContextData>>) {
  return (
    <BaseNode kind="Context" name={data.name} selected={selected}>
      {data.description && <span>{data.description}</span>}
    </BaseNode>
  )
}
