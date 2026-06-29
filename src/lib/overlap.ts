import { minutesOfDay } from "./time";
import type { CalendarEvent } from "../types";

/** An event placed into a lane within its overlap cluster (§6.2). */
export type PositionedEvent = {
  event: CalendarEvent;
  startMin: number;
  endMin: number;
  /** 0-based column within the cluster. */
  lane: number;
  /** Total number of lanes (columns) in this event's cluster. */
  lanes: number;
};

type Span = { event: CalendarEvent; startMin: number; endMin: number };

/**
 * §6.2 — Lane splitting (Google-Calendar side-by-side behaviour).
 *
 * 1. Group events into clusters of transitively-overlapping events.
 * 2. Within a cluster, assign each event to the first lane with no time conflict.
 * 3. Caller renders width = 100% / lanes, left = lane * width.
 */
export function layoutDayEvents(events: CalendarEvent[]): PositionedEvent[] {
  const spans: Span[] = events
    .map((event) => ({
      event,
      startMin: minutesOfDay(event.startTime),
      endMin: minutesOfDay(event.endTime),
    }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const result: PositionedEvent[] = [];
  let cluster: Span[] = [];
  let clusterEnd = -1;

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = []; // end-minute of the last event in each lane
    const assignments: Array<{ span: Span; lane: number }> = [];

    for (const span of cluster) {
      // First lane whose last event ends at/before this one starts (no conflict).
      let lane = laneEnds.findIndex((end) => end <= span.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(span.endMin);
      } else {
        laneEnds[lane] = span.endMin;
      }
      assignments.push({ span, lane });
    }

    const lanes = laneEnds.length;
    for (const { span, lane } of assignments) {
      result.push({
        event: span.event,
        startMin: span.startMin,
        endMin: span.endMin,
        lane,
        lanes,
      });
    }

    cluster = [];
    clusterEnd = -1;
  };

  for (const span of spans) {
    if (cluster.length > 0 && span.startMin < clusterEnd) {
      // Transitively overlaps the running cluster.
      cluster.push(span);
      clusterEnd = Math.max(clusterEnd, span.endMin);
    } else {
      flushCluster();
      cluster = [span];
      clusterEnd = span.endMin;
    }
  }
  flushCluster();

  return result;
}
