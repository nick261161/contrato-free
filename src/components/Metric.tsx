import { Tilt } from './Tilt'
import type { Metric as MetricData } from '../types'

export function Metric({ label, value, hint }: MetricData) {
  return (
    <Tilt as="article" className="metric">
      <span className="metric__label">{label}</span>
      <strong className="metric__value">{value}</strong>
      <span className="metric__hint">{hint}</span>
    </Tilt>
  )
}
