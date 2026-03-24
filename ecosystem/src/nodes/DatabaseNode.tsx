import type { NodeProps } from '@xyflow/react'
import type { Node } from '@xyflow/react'
import type { DatabaseData } from '../types/agent'
import BaseNode from './BaseNode'

export default function DatabaseNode({ data, selected }: NodeProps<Node<DatabaseData>>) {
  return (
    <BaseNode kind="Database" name={data.name} selected={selected}>
      {data.db_type && <span>{data.db_type}</span>}
    </BaseNode>
  )
}
