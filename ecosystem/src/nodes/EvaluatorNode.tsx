import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { EvaluatorData } from '../types/agent'
import BaseNode from './BaseNode'

export default function EvaluatorNode({ data, selected }: NodeProps<Node<EvaluatorData>>) {
  return (
    <BaseNode kind="Evaluator" name={data.name} selected={selected}>
      {data.success_condition && <span>{data.success_condition}</span>}
    </BaseNode>
  )
}
