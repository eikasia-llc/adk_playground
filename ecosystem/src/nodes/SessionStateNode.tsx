import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { SessionStateData } from '../types/agent'
import BaseNode from './BaseNode'

export default function SessionStateNode({ data, selected }: NodeProps<Node<SessionStateData>>) {
  return (
    <BaseNode kind="SessionState" name={data.name} selected={selected}>
      {data.keys && <span>{data.keys}</span>}
    </BaseNode>
  )
}
