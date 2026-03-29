import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'

/**
 * Custom edge that renders animated particles moving along the path to
 * visualise information flow. Observation-set edges opt out of particles
 * (flagged via data.isObservation) and render as plain edges.
 *
 * data.speed  — seconds a particle takes to traverse the full path (default 2.5)
 */
export default function FlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const isObservation = !!(data?.isObservation)
  const isReturn = !!(data?.isReturn)
  const color = (style?.stroke as string) ?? '#94a3b8'
  const speed = (data?.speed as number) ?? (isReturn ? 3.5 : 2.5)
  const particleRadius = isReturn ? 2 : 3.5
  const particleOpacity = isReturn ? 0.5 : 0.85
  const particleGlow = isReturn ? 2 : 4

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />

      {!isObservation && [0, 1 / 3, 2 / 3].map((offset, i) => (
        <circle
          key={i}
          r={particleRadius}
          fill={color}
          opacity={particleOpacity}
          style={{ filter: `drop-shadow(0 0 ${particleGlow}px ${color})` }}
        >
          <animateMotion
            dur={`${speed}s`}
            repeatCount="indefinite"
            begin={`${-(offset * speed)}s`}
          >
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      ))}
    </>
  )
}
