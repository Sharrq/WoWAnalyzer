import type { JSX } from 'react';
import { useFight } from 'interface/report/context/FightContext';
import { EventType, UpdateSpellUsableEvent, UpdateSpellUsableType } from 'parser/core/Events';
import { CooldownWindow } from 'parser/ui/CooldownBar';
import { useEvents } from 'interface/guide';
import { formatDuration } from 'common/format';

export interface TimeWindow {
  /** Start time of the window in milliseconds */
  startTime: number;
  /** End time of the window in milliseconds */
  endTime: number;
}

export interface TimelineSegment {
  /** Start time of the segment in milliseconds */
  start: number;
  /** End time of the segment in milliseconds */
  end: number;
  /** Color of the segment */
  color: string;
  /** Opacity of the segment (0-1) */
  opacity?: number;
  /** Tooltip label for the segment */
  label: string;
}

export interface TimelineMarker {
  /** Timestamp of the marker in milliseconds */
  timestamp: number;
  /** Tooltip label for the marker */
  label: string;
  /** Color of the marker (default: white) */
  color?: string;
}

export interface ChargeSegment {
  start: number;
  end: number;
  /** Number of charges held during this period */
  charges: number;
}

export interface SegmentedBarProps {
  /** Optional windows to show on the timeline (defaults to full fight if not specified) */
  windows?: TimeWindow[];
  /** Segments to render on the timeline */
  segments: TimelineSegment[];
  /** Optional markers to show on the timeline */
  markers?: TimelineMarker[];
}

const EMPTY_MARKERS: TimelineMarker[] = [];

/**
 * Renders a timeline visualization with colored segments and optional markers.
 *
 * This is a generalized timeline component that can visualize any time-based data
 * across a fight or specific time windows. Common uses include:
 * - Cooldown availability
 * - Buff/debuff uptime
 * - Resource availability
 * - Phase indicators
 *
 * @param windows - Optional time windows to display (defaults to full fight)
 * @param segments - Colored segments to render on the timeline
 * @param markers - Optional markers (pins) to show on the timeline
 */
export default function SegmentedBar({
  windows,
  segments,
  markers = EMPTY_MARKERS,
}: SegmentedBarProps) {
  const fight = useFight();
  const fightStart = fight.fight.start_time;
  const fightEnd = fight.fight.end_time;
  const fightDuration = fightEnd - fightStart;
  const actualWindows = windows ?? [{ startTime: fightStart, endTime: fightEnd }];

  const ribbonHeight = 32;
  const markerOffset = 8;
  const totalHeight = ribbonHeight + markerOffset;
  const width = 100;

  return (
    <svg
      width="100%"
      height={totalHeight}
      preserveAspectRatio="none"
      viewBox={`0 0 ${width} ${totalHeight}`}
    >
      {actualWindows.map((window, winIdx) => {
        const windowStart = window.startTime;
        const windowEnd = window.endTime;
        const windowDuration = windowEnd - windowStart;

        const windowX = ((windowStart - fightStart) / fightDuration) * width;
        const windowWidth = (windowDuration / fightDuration) * width;

        const createRect = (
          start: number,
          end: number,
          key: string,
          fill: string,
          opacity: number,
          title: string,
        ): JSX.Element => {
          const x = windowX + ((start - windowStart) / windowDuration) * windowWidth;
          const rectWidth = ((end - start) / windowDuration) * windowWidth;

          return (
            <rect
              key={key}
              x={x}
              y={markerOffset}
              width={Math.max(0.1, rectWidth)}
              height={ribbonHeight}
              fill={fill}
              opacity={opacity}
              rx={0}
            >
              <title>{title}</title>
            </rect>
          );
        };

        // Filter segments that overlap with this window
        const windowSegments = segments.filter(
          (segment) => segment.start < windowEnd && segment.end > windowStart,
        );

        // Render all segments for this window
        const segmentRects = windowSegments.map((segment, idx) => {
          const segStart = Math.max(segment.start, windowStart);
          const segEnd = Math.min(segment.end, windowEnd);

          return createRect(
            segStart,
            segEnd,
            `${winIdx}-segment-${idx}`,
            segment.color,
            segment.opacity ?? 1,
            segment.label,
          );
        });

        // Filter markers that fall within this window
        const windowMarkers = markers.filter(
          (marker) => marker.timestamp >= windowStart && marker.timestamp <= windowEnd,
        );

        // Render markers (teardrop pins)
        const markerWidth = 0.5;
        const markerHeight = 9;
        const markerOffsetY = 3;

        const markerElements = windowMarkers.map((marker, idx) => {
          const markerX =
            windowX + ((marker.timestamp - windowStart) / windowDuration) * windowWidth;
          const markerColor = marker.color || '#FFF';

          // Teardrop/pin shape pointing down
          const teardropPath = `
            M ${markerX} ${markerHeight + markerOffsetY}
            Q ${markerX - markerWidth} ${markerHeight * 0.6 + markerOffsetY} ${markerX - markerWidth} ${markerHeight * 0.3 + markerOffsetY}
            A ${markerWidth} ${markerHeight * 0.3} 0 1 1 ${markerX + markerWidth} ${markerHeight * 0.3 + markerOffsetY}
            Q ${markerX + markerWidth} ${markerHeight * 0.6 + markerOffsetY} ${markerX} ${markerHeight + markerOffsetY}
            Z
          `;

          return (
            <g key={`${winIdx}-marker-${idx}`}>
              <title>{marker.label}</title>
              <path
                d={teardropPath}
                fill={markerColor}
                stroke={markerColor}
                strokeWidth={0.8}
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={markerX}
                y1={markerHeight}
                x2={markerX}
                y2={totalHeight}
                stroke={markerColor}
                strokeWidth={3}
                vectorEffect="non-scaling-stroke"
                opacity={0.9}
              />
            </g>
          );
        });

        return (
          <g key={winIdx}>
            {segmentRects}
            {markerElements}
          </g>
        );
      })}
    </svg>
  );
}

// ── Shared constant ────────────────────────────────────────────────────────
/** Color used for "available but not cast" segments */
export const BAD_COLOR = 'rgba(228, 20, 20, 0.97)';

// ── Helper functions ───────────────────────────────────────────────────────

/**
 * Builds TimelineSegment[] from cooldown events for use with SegmentedBar / DualBar.
 * Yellow segments = on cooldown; red segments = available but not cast.
 */
export function createCooldownSegments(
  spellId: number,
  events: ReturnType<typeof useEvents>,
  windows: CooldownWindow[],
  cooldownColor: string,
): TimelineSegment[] {
  const segments: TimelineSegment[] = [];

  windows.forEach((window) => {
    const endCooldowns: UpdateSpellUsableEvent[] = events
      .filter(
        (event): event is UpdateSpellUsableEvent =>
          event.type === EventType.UpdateSpellUsable &&
          event.ability.guid === spellId &&
          event.updateType === UpdateSpellUsableType.EndCooldown &&
          event.overallStartTimestamp < window.endTime &&
          event.timestamp > window.startTime,
      )
      .sort((a, b) => a.overallStartTimestamp - b.overallStartTimestamp);

    const beginCooldowns: UpdateSpellUsableEvent[] = events.filter(
      (event): event is UpdateSpellUsableEvent =>
        event.type === EventType.UpdateSpellUsable &&
        event.ability.guid === spellId &&
        event.updateType === UpdateSpellUsableType.BeginCooldown &&
        event.timestamp >= window.startTime &&
        event.timestamp <= window.endTime,
    );

    endCooldowns.forEach((cd) => {
      const cdStart = Math.max(cd.overallStartTimestamp, window.startTime);
      const cdEnd = Math.min(cd.timestamp, window.endTime);
      segments.push({
        start: cdStart,
        end: cdEnd,
        color: cooldownColor,
        opacity: 1,
        label: `On Cooldown: ${formatDuration(cdStart - window.startTime)} - ${formatDuration(cdEnd - window.startTime)}`,
      });
    });

    if (beginCooldowns.length > endCooldowns.length) {
      const lastBegin = beginCooldowns[beginCooldowns.length - 1];
      if (lastBegin.overallStartTimestamp < window.endTime) {
        segments.push({
          start: lastBegin.overallStartTimestamp,
          end: window.endTime,
          color: cooldownColor,
          opacity: 1,
          label: `On Cooldown: ${formatDuration(lastBegin.overallStartTimestamp - window.startTime)} - ${formatDuration(window.endTime - window.startTime)}`,
        });
      }
    }

    let lastCdEnd = window.startTime;
    endCooldowns.forEach((cd) => {
      if (cd.overallStartTimestamp > lastCdEnd) {
        segments.push({
          start: lastCdEnd,
          end: cd.overallStartTimestamp,
          color: BAD_COLOR,
          opacity: 1,
          label: `Available: ${formatDuration(lastCdEnd - window.startTime)} - ${formatDuration(cd.overallStartTimestamp - window.startTime)}`,
        });
      }
      lastCdEnd = Math.min(cd.timestamp, window.endTime);
    });

    const finalCdEnd = beginCooldowns.length > endCooldowns.length ? window.endTime : lastCdEnd;
    if (finalCdEnd < window.endTime) {
      segments.push({
        start: finalCdEnd,
        end: window.endTime,
        color: BAD_COLOR,
        opacity: 1,
        label: `Available: ${formatDuration(finalCdEnd - window.startTime)} - ${formatDuration(window.endTime - window.startTime)}`,
      });
    }
  });

  return segments;
}

/**
 * Builds ChargeSegment[] by replaying UpdateSpellUsable events to track charge count over time.
 */
export function createChargeSegments(
  spellId: number,
  events: ReturnType<typeof useEvents>,
  windows: CooldownWindow[],
  maxCharges: number,
): ChargeSegment[] {
  const segments: ChargeSegment[] = [];

  const isChargeUse = (t: UpdateSpellUsableType) =>
    t === UpdateSpellUsableType.UseCharge || t === UpdateSpellUsableType.BeginCooldown;
  const isChargeRestore = (t: UpdateSpellUsableType) =>
    t === UpdateSpellUsableType.RestoreCharge || t === UpdateSpellUsableType.EndCooldown;

  const allUpdateEvents: UpdateSpellUsableEvent[] = events
    .filter(
      (e): e is UpdateSpellUsableEvent =>
        e.type === EventType.UpdateSpellUsable && e.ability.guid === spellId,
    )
    .sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return isChargeUse(a.updateType) ? -1 : 1;
    });

  // Drop simultaneous use+restore pairs (instant recharge edge-case)
  const filteredEvents: UpdateSpellUsableEvent[] = [];
  for (let i = 0; i < allUpdateEvents.length; i++) {
    const ev = allUpdateEvents[i];
    const next = allUpdateEvents[i + 1];
    if (
      next &&
      ev.timestamp === next.timestamp &&
      isChargeUse(ev.updateType) &&
      isChargeRestore(next.updateType)
    ) {
      i++;
      continue;
    }
    filteredEvents.push(ev);
  }

  windows.forEach((window) => {
    // Replay events before window to find starting charge count
    let charges = maxCharges;
    filteredEvents.forEach((ev) => {
      if (ev.timestamp < window.startTime) {
        if (isChargeUse(ev.updateType)) charges = Math.max(0, charges - 1);
        else if (ev.updateType === UpdateSpellUsableType.RestoreCharge)
          charges = Math.min(maxCharges, charges + 1);
        else if (ev.updateType === UpdateSpellUsableType.EndCooldown) charges = maxCharges;
      }
    });

    const windowEvents = filteredEvents.filter(
      (e) => e.timestamp >= window.startTime && e.timestamp <= window.endTime,
    );

    let segStart = window.startTime;
    windowEvents.forEach((ev) => {
      if (ev.timestamp > segStart) segments.push({ start: segStart, end: ev.timestamp, charges });
      if (isChargeUse(ev.updateType)) charges = Math.max(0, charges - 1);
      else if (ev.updateType === UpdateSpellUsableType.RestoreCharge)
        charges = Math.min(maxCharges, charges + 1);
      else if (ev.updateType === UpdateSpellUsableType.EndCooldown) charges = maxCharges;
      segStart = ev.timestamp;
    });

    if (window.endTime > segStart) segments.push({ start: segStart, end: window.endTime, charges });
  });

  return segments;
}

/**
 * Builds TimelineMarker[] from cast events for use with SegmentedBar / DualBar.
 */
export function createCastMarkers(
  spellId: number,
  events: ReturnType<typeof useEvents>,
  windows: CooldownWindow[],
): TimelineMarker[] {
  const markers: TimelineMarker[] = [];
  windows.forEach((window) => {
    events
      .filter(
        (event) =>
          event.type === EventType.Cast &&
          event.ability.guid === spellId &&
          event.timestamp >= window.startTime &&
          event.timestamp <= window.endTime,
      )
      .forEach((cast) => {
        markers.push({
          timestamp: cast.timestamp,
          label: `Cast at ${formatDuration(cast.timestamp - window.startTime)}`,
          color: '#FFF',
        });
      });
  });
  return markers;
}

// ── ChargeTimeline ────────────────────────────────────────────────────────

export interface ChargeTimelineProps {
  /** Charge-level segments from createChargeSegments() */
  chargeSegments: ChargeSegment[];
  /** Cast timestamps for teardrop pin markers */
  castTimestamps: number[];
  /** Max charges for this spell */
  maxCharges: number;
  /** Fight start timestamp */
  fightStart: number;
  /** Fight end timestamp */
  fightEnd: number;
  /** Color when at max charges (capped) */
  cappedColor?: string;
  /** Color when spending/recharging */
  activeColor?: string;
  /** Color for cast pins */
  pinColor?: string;
}

/**
 * SVG step-function timeline showing charge count over the fight.
 * Bar height = current charges / maxCharges. Red when capped, yellow otherwise.
 * Teardrop pins mark each cast (same style as DualBar).
 */
export function ChargeTimeline({
  chargeSegments,
  castTimestamps,
  maxCharges,
  fightStart,
  fightEnd,
  cappedColor = '#ef4444',
  activeColor = '#fbbf24',
  pinColor = '#00d9ff',
}: ChargeTimelineProps) {
  const totalMs = fightEnd - fightStart;
  const MARKER_PAD = 8;
  const TRACK_H = 24;
  const SVG_H = MARKER_PAD + TRACK_H;
  const SVG_W = 100;
  const PIN_W = 0.5;
  const PIN_H = 9;
  const PIN_OFF_Y = 3;

  const toX = (ts: number) => ((ts - fightStart) / totalMs) * SVG_W;

  // Horizontal guide lines at each charge threshold
  const guideLines = Array.from({ length: maxCharges - 1 }, (_, i) => {
    const chargeLevel = i + 1;
    const y = MARKER_PAD + TRACK_H - (chargeLevel / maxCharges) * TRACK_H;
    return (
      <line
        key={i}
        x1={0}
        y1={y}
        x2={SVG_W}
        y2={y}
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={0.5}
        vectorEffect="non-scaling-stroke"
        strokeDasharray="2 2"
      />
    );
  });

  const segRects = chargeSegments.map((seg, i) => {
    if (seg.charges === 0) return null;
    const x = toX(seg.start);
    const w = Math.max(0.2, toX(seg.end) - x);
    const fillH = (seg.charges / maxCharges) * TRACK_H;
    const barY = MARKER_PAD + TRACK_H - fillH;
    const color = seg.charges === maxCharges ? cappedColor : activeColor;
    const label = `${seg.charges}/${maxCharges} charges — ${formatDuration(seg.end - seg.start)}`;
    return (
      <rect key={i} x={x} y={barY} width={w} height={fillH} fill={color}>
        <title>{label}</title>
      </rect>
    );
  });

  const pinElems = castTimestamps.map((ts, i) => {
    const mx = toX(ts);
    const teardrop = `
      M ${mx} ${PIN_H + PIN_OFF_Y}
      Q ${mx - PIN_W} ${PIN_H * 0.6 + PIN_OFF_Y} ${mx - PIN_W} ${PIN_H * 0.3 + PIN_OFF_Y}
      A ${PIN_W} ${PIN_H * 0.3} 0 1 1 ${mx + PIN_W} ${PIN_H * 0.3 + PIN_OFF_Y}
      Q ${mx + PIN_W} ${PIN_H * 0.6 + PIN_OFF_Y} ${mx} ${PIN_H + PIN_OFF_Y}
      Z
    `;
    return (
      <g key={i}>
        <title>{`Cast at ${formatDuration(ts - fightStart)}`}</title>
        <path
          d={teardrop}
          fill={pinColor}
          stroke="#006b80"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          paintOrder="stroke"
        />
        <line
          x1={mx}
          y1={PIN_H}
          x2={mx}
          y2={SVG_H}
          stroke={pinColor}
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
          opacity={1}
        />
      </g>
    );
  });

  return (
    <svg
      width="100%"
      height={SVG_H}
      preserveAspectRatio="none"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block' }}
    >
      <rect x={0} y={MARKER_PAD} width={SVG_W} height={TRACK_H} fill="rgba(255,255,255,0.06)" />
      {guideLines}
      {segRects}
      {pinElems}
    </svg>
  );
}

// ── CastDelayBar ─────────────────────────────────────────────────────

export interface CastDelay {
  /** Timestamp of the cast */
  castTimestamp: number;
  /** When the charge/spell became available before this cast */
  availableAt: number;
}

export interface CastDelayBarProps {
  /** Per-cast delay data */
  castDelays: CastDelay[];
  /** Capped segments for the sub-bar (red when at max charges) */
  cappedSegments: TimelineSegment[];
  /** Fight start timestamp */
  fightStart: number;
  /** Fight end timestamp */
  fightEnd: number;
}

function castDelayColor(delayMs: number): string {
  if (delayMs < 2000) return '#22c55e';
  if (delayMs < 5000) return '#fbbf24';
  return '#ef4444';
}

/**
 * Timeline bar showing per-cast delay for charge-based spells.
 * Each cast is rendered as a colored band from when the charge became available
 * to when it was actually cast. Green = immediate, yellow = slight delay, red = poor.
 * Sub-bar shows capped periods in red.
 */
export function CastDelayBar({
  castDelays,
  cappedSegments,
  fightStart,
  fightEnd,
}: CastDelayBarProps) {
  const totalMs = fightEnd - fightStart;
  const MAIN_H = 24;
  const SUB_H = 8;
  const SVG_H = MAIN_H + SUB_H;
  const SVG_W = 100;

  const toX = (ts: number) => ((ts - fightStart) / totalMs) * SVG_W;

  const delayBands = castDelays.map((cd, i) => {
    const delayMs = Math.max(0, cd.castTimestamp - cd.availableAt);
    const color = castDelayColor(delayMs);
    const x = toX(cd.availableAt);
    const castX = toX(cd.castTimestamp);
    const w = Math.max(0.5, castX - x);
    const label = `Cast at ${formatDuration(cd.castTimestamp - fightStart)} — delay: ${
      delayMs < 1000 ? '<1s' : formatDuration(delayMs)
    }`;
    return (
      <g key={i}>
        <rect x={x} y={0} width={w} height={MAIN_H} fill={color} opacity={0.8}>
          <title>{label}</title>
        </rect>
        <line
          x1={castX}
          y1={0}
          x2={castX}
          y2={MAIN_H}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
        />
      </g>
    );
  });

  const subBars = cappedSegments.map((seg, i) => {
    const x = toX(seg.start);
    const w = Math.max(0.2, toX(seg.end) - x);
    return (
      <rect key={i} x={x} y={MAIN_H} width={w} height={SUB_H} fill="#ef4444">
        <title>{seg.label}</title>
      </rect>
    );
  });

  return (
    <svg
      width="100%"
      height={SVG_H}
      preserveAspectRatio="none"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block' }}
    >
      <rect x={0} y={0} width={SVG_W} height={MAIN_H} fill="rgba(255,255,255,0.06)" />
      <rect x={0} y={MAIN_H} width={SVG_W} height={SUB_H} fill="rgba(255,255,255,0.04)" />
      {subBars}
      {delayBands}
    </svg>
  );
}
// ── ThermalChargeBar ────────────────────────────────────────────────────

export interface ThermalChargeBarProps {
  chargeSegments: ChargeSegment[];
  maxCharges: number;
  castTimestamps: number[];
  fightStart: number;
  fightEnd: number;
}

/** Returns a fill color + opacity for a given charge level. */
function thermalColor(charges: number, maxCharges: number): { color: string; opacity: number } {
  if (charges === 0) return { color: '#ffffff', opacity: 0 };
  if (charges === maxCharges) return { color: '#ef4444', opacity: 1 };
  // Gradient: faint yellow (1 charge) → bright yellow (just below cap)
  const opacity = 0.3 + 0.7 * ((charges - 1) / Math.max(1, maxCharges - 2));
  return { color: '#fbbf24', opacity: Math.min(1, opacity) };
}

/**
 * Single-track bar where fill color encodes charge level as a heat gradient.
 * Dark = 0 charges (recharging), dim→bright yellow = 1→N-1 charges held,
 * fully saturated red = capped at max charges.
 * Cast ticks shown as a separate 4px strip below the main bar.
 */
export function ThermalChargeBar({
  chargeSegments,
  maxCharges,
  castTimestamps,
  fightStart,
  fightEnd,
}: ThermalChargeBarProps) {
  const totalMs = fightEnd - fightStart;
  const MAIN_H = 24;
  const GAP = 2;
  const TICK_H = 4;
  const TICK_OVERLAP = 4;
  const SVG_H = MAIN_H + GAP + TICK_H;
  const SVG_W = 100;

  const toX = (ts: number) => ((ts - fightStart) / totalMs) * SVG_W;

  // Thermal: full-height rects, color/opacity from thermalColor()
  const segRects = chargeSegments.map((seg, i) => {
    const { color, opacity } = thermalColor(seg.charges, maxCharges);
    if (opacity === 0) return null;
    const x = toX(seg.start);
    const w = Math.max(0.2, toX(seg.end) - x);
    const label = `${seg.charges}/${maxCharges} charges — ${formatDuration(seg.end - seg.start)}`;
    return (
      <rect key={i} x={x} y={0} width={w} height={MAIN_H} fill={color} opacity={opacity}>
        <title>{label}</title>
      </rect>
    );
  });

  const tickElems = castTimestamps.map((ts, i) => {
    const cx = toX(ts);
    return (
      <line
        key={i}
        x1={cx}
        y1={MAIN_H + GAP - TICK_OVERLAP}
        x2={cx}
        y2={MAIN_H + GAP + TICK_H}
        stroke="#00d9ff"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        opacity={0.8}
      >
        <title>{`Cast at ${formatDuration(ts - fightStart)}`}</title>
      </line>
    );
  });

  return (
    <svg
      width="100%"
      height={SVG_H}
      preserveAspectRatio="none"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block' }}
    >
      <rect x={0} y={0} width={SVG_W} height={MAIN_H} fill="rgba(255,255,255,0.08)" />
      <rect x={0} y={MAIN_H + GAP} width={SVG_W} height={TICK_H} fill="rgba(255,255,255,0.04)" />
      {segRects}
      {tickElems}
    </svg>
  );
}
// ── ChargeLevelBar ─────────────────────────────────────────────────────

export interface ChargeLevelBarProps {
  /** Charge-level segments from createChargeSegments() */
  chargeSegments: ChargeSegment[];
  /** Max charges for this spell */
  maxCharges: number;
  /** Cast timestamps for vertical cast lines */
  castTimestamps: number[];
  /** Fight start timestamp */
  fightStart: number;
  /** Fight end timestamp */
  fightEnd: number;
}

/**
 * Stacked row visualization for charge-based spells.
 * One row per charge slot (bottom = charge 1, top = charge N).
 * Row is dark while recharging, yellow when available, red when fully capped.
 * Thin white lines mark each cast across all rows.
 */
export function ChargeLevelBar({
  chargeSegments,
  maxCharges,
  castTimestamps,
  fightStart,
  fightEnd,
}: ChargeLevelBarProps) {
  const totalMs = fightEnd - fightStart;
  const ROW_H = Math.floor(24 / maxCharges);
  const GAP = maxCharges > 1 ? 1 : 0;
  const TOTAL_ROWS_H = maxCharges * ROW_H + (maxCharges - 1) * GAP;
  const SVG_H = TOTAL_ROWS_H;
  const SVG_W = 100;

  const toX = (ts: number) => ((ts - fightStart) / totalMs) * SVG_W;

  // Row i (0 = top = highest charge slot)
  const rowY = (i: number) => i * (ROW_H + GAP);
  // Row slot level: row 0 = maxCharges, row maxCharges-1 = charge 1
  const rowLevel = (i: number) => maxCharges - i;

  const rowRects = chargeSegments.flatMap((seg) => {
    const x = toX(seg.start);
    const w = Math.max(0.2, toX(seg.end) - x);
    const isCapped = seg.charges === maxCharges;
    return Array.from({ length: maxCharges }, (_, i) => {
      const level = rowLevel(i);
      const lit = seg.charges >= level;
      if (!lit) return null;
      const color = isCapped ? '#ef4444' : '#fbbf24';
      const label = `${seg.charges}/${maxCharges} charges — ${formatDuration(seg.end - seg.start)}`;
      return (
        <rect key={`${seg.start}-${i}`} x={x} y={rowY(i)} width={w} height={ROW_H} fill={color}>
          <title>{label}</title>
        </rect>
      );
    });
  });

  const castLines = castTimestamps.map((ts, i) => {
    const cx = toX(ts);
    return (
      <line
        key={i}
        x1={cx}
        y1={0}
        x2={cx}
        y2={SVG_H}
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      >
        <title>{`Cast at ${formatDuration(ts - fightStart)}`}</title>
      </line>
    );
  });

  const bgRows = Array.from({ length: maxCharges }, (_, i) => (
    <rect key={i} x={0} y={rowY(i)} width={SVG_W} height={ROW_H} fill="rgba(255,255,255,0.06)" />
  ));

  return (
    <svg
      width="100%"
      height={SVG_H}
      preserveAspectRatio="none"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block' }}
    >
      {bgRows}
      {rowRects}
      {castLines}
    </svg>
  );
}

// ── ChargeBar ──────────────────────────────────────────────────────────────

export interface ChargeBarProps {
  /** Number of actual casts used */
  actualCasts: number;
  /** Total possible casts */
  possibleCasts: number;
  /** Color for the used portion (default: '#fbbf24') */
  fillColor?: string;
  /** Color for the missed portion (default: '#ef4444') */
  missedColor?: string;
}

/**
 * A simple proportion bar for charge-based spells.
 * Main bar shows casts used; sub-bar shows missed casts.
 */
export function ChargeBar({
  actualCasts,
  possibleCasts,
  fillColor = '#fbbf24',
  missedColor = '#ef4444',
}: ChargeBarProps) {
  const chargeEffPct = possibleCasts > 0 ? actualCasts / possibleCasts : 0;
  const chargeMissPct = 1 - chargeEffPct;
  return (
    <div style={{ display: 'block', width: '100%' }}>
      <div
        style={{
          position: 'relative',
          height: 24,
          background: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
        title={`${actualCasts} of ${possibleCasts} possible casts`}
      >
        {chargeEffPct > 0 && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: `${chargeEffPct * 100}%`,
              height: '100%',
              background: fillColor,
            }}
          />
        )}
      </div>
      <div
        style={{
          position: 'relative',
          height: 8,
          background: 'rgba(255,255,255,0.05)',
          overflow: 'hidden',
        }}
        title={
          possibleCasts - actualCasts > 0
            ? `${possibleCasts - actualCasts} missed cast${possibleCasts - actualCasts !== 1 ? 's' : ''}`
            : 'No missed casts'
        }
      >
        {chargeMissPct > 0 && (
          <div
            style={{
              position: 'absolute',
              left: `${chargeEffPct * 100}%`,
              top: 0,
              width: `${chargeMissPct * 100}%`,
              height: '100%',
              background: missedColor,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── DualBar ────────────────────────────────────────────────────────────────

export interface DualBarProps {
  /** On-cooldown segments (rendered on the main bar) */
  cooldownSegments: TimelineSegment[];
  /** Available-but-not-cast segments (rendered on the sub bar) */
  availableSegments: TimelineSegment[];
  /** Cast timestamps for teardrop pin markers */
  castTimestamps: number[];
  /** Fight start timestamp */
  fightStart: number;
  /** Fight end timestamp */
  fightEnd: number;
  /** Color for cooldown segments (default: '#fbbf24') */
  cooldownColor?: string;
  /** Color for available segments (default: '#ef4444') */
  availableColor?: string;
  /** Color for cast pins (default: '#00d9ff') */
  pinColor?: string;
}

/**
 * Dual-bar SVG visualization for cooldown-based spells.
 * Main bar (tall, yellow) shows on-cooldown time; sub-bar (thin, red) shows wasted availability.
 * Teardrop pins mark each cast.
 */
export function DualBar({
  cooldownSegments,
  availableSegments,
  castTimestamps,
  fightStart,
  fightEnd,
  cooldownColor = '#fbbf24',
  availableColor = '#ef4444',
  pinColor = '#00d9ff',
}: DualBarProps) {
  const totalMs = fightEnd - fightStart;
  const MARKER_PAD = 8;
  const MAIN_H = 24;
  const SUB_H = 8;
  const SVG_H = MARKER_PAD + MAIN_H + SUB_H;
  const MAIN_TOP = MARKER_PAD;
  const SUB_TOP = MARKER_PAD + MAIN_H;
  const SVG_W = 100;
  const PIN_W = 0.5;
  const PIN_H = 9;
  const PIN_OFF_Y = 3;

  const toX = (ts: number) => ((ts - fightStart) / totalMs) * SVG_W;

  const renderSegs = (segs: TimelineSegment[], barY: number, barH: number, color: string) =>
    segs.map((seg, i) => {
      const x = toX(seg.start);
      const w = Math.max(0.2, toX(seg.end) - x);
      return (
        <rect key={i} x={x} y={barY} width={w} height={barH} fill={color}>
          <title>{seg.label ?? ''}</title>
        </rect>
      );
    });

  const pinElems = castTimestamps.map((ts, i) => {
    const mx = toX(ts);
    const teardrop = `
      M ${mx} ${PIN_H + PIN_OFF_Y}
      Q ${mx - PIN_W} ${PIN_H * 0.6 + PIN_OFF_Y} ${mx - PIN_W} ${PIN_H * 0.3 + PIN_OFF_Y}
      A ${PIN_W} ${PIN_H * 0.3} 0 1 1 ${mx + PIN_W} ${PIN_H * 0.3 + PIN_OFF_Y}
      Q ${mx + PIN_W} ${PIN_H * 0.6 + PIN_OFF_Y} ${mx} ${PIN_H + PIN_OFF_Y}
      Z
    `;
    return (
      <g key={i}>
        <title>{`Cast at ${formatDuration(ts - fightStart)}`}</title>
        <path
          d={teardrop}
          fill={pinColor}
          stroke="#006b80"
          strokeWidth={1.2}
          vectorEffect="non-scaling-stroke"
          paintOrder="stroke"
        />
        <line
          x1={mx}
          y1={PIN_H}
          x2={mx}
          y2={SVG_H}
          stroke={pinColor}
          strokeWidth={2.5}
          vectorEffect="non-scaling-stroke"
          opacity={1}
        />
      </g>
    );
  });

  return (
    <svg
      width="100%"
      height={SVG_H}
      preserveAspectRatio="none"
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      style={{ display: 'block' }}
    >
      <rect x={0} y={MAIN_TOP} width={SVG_W} height={MAIN_H} fill="rgba(255,255,255,0.08)" />
      <rect x={0} y={SUB_TOP} width={SVG_W} height={SUB_H} fill="rgba(255,255,255,0.05)" />
      {renderSegs(cooldownSegments, MAIN_TOP, MAIN_H, cooldownColor)}
      {renderSegs(availableSegments, SUB_TOP, SUB_H, availableColor)}
      {pinElems}
    </svg>
  );
}
