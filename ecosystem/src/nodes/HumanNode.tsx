import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { HumanData } from '../types/agent'
import BaseNode from './BaseNode'

export default function HumanNode({ data, selected }: NodeProps<Node<HumanData>>) {
  return (
    <BaseNode kind="Human" name={data.name} selected={selected}>
      {data.prompt && <span>{data.prompt}</span>}
    </BaseNode>
  )
}
