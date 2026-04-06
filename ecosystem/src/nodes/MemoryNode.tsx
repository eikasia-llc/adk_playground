import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { MemoryData } from '../types/agent'
import BaseNode from './BaseNode'

export default function MemoryNode({ data, selected }: NodeProps<Node<MemoryData>>) {
  return (
    <BaseNode kind="Memory" name={data.name} selected={selected}>
      {data.service_type && <span>{data.service_type}</span>}
    </BaseNode>
  )
}
