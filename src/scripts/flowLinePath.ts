// Pure geometry for the page-wide flowing connector line — no DOM access at
// all, so it's trivial to reason about independent of measurement/scroll
// concerns (those live in flowLine.ts). Turns an ordered list of waypoints
// into a rounded-corner SVG path using the circular-fillet technique (the
// same math `CanvasRenderingContext2D.arcTo` performs internally): at each
// interior waypoint, back off a tangent distance along each adjacent edge,
// draw a straight line to that tangent point, then an arc through the
// corner. Every segment's own analytic length is tracked as it's built, so
// cumulative path length is exact with no getTotalLength()/getPointAtLength()
// DOM calls needed anywhere.

export interface Point {
  x: number;
  y: number;
}

interface LineSegment {
  type: 'line';
  from: Point;
  to: Point;
  length: number;
}

interface ArcSegment {
  type: 'arc';
  center: Point;
  radius: number;
  startAngle: number;
  endAngle: number;
  sweep: 0 | 1;
  length: number;
}

type Segment = LineSegment | ArcSegment;

export interface BuiltPath {
  segments: Segment[];
  // cumulativeLengths[i] = total path length from the start up to input waypoint i.
  cumulativeLengths: number[];
  totalLength: number;
}

const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

function fillet(prev: Point, corner: Point, next: Point, radius: number) {
  const v1x = prev.x - corner.x;
  const v1y = prev.y - corner.y;
  const v2x = next.x - corner.x;
  const v2y = next.y - corner.y;
  const len1 = Math.hypot(v1x, v1y);
  const len2 = Math.hypot(v2x, v2y);
  if (len1 < 1e-6 || len2 < 1e-6 || radius < 1e-6) return null;

  const u1x = v1x / len1;
  const u1y = v1y / len1;
  const u2x = v2x / len2;
  const u2y = v2y / len2;

  const dot = Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y));
  const theta = Math.acos(dot);
  // Straight-through (no turn) or a full reversal — no arc makes sense.
  if (theta < 1e-4 || Math.PI - theta < 1e-4) return null;

  let tangentDist = radius / Math.tan(theta / 2);
  // Clamp so the fillet never eats more than half of either adjacent edge —
  // prevents overlapping fillets when waypoints sit close together (e.g. the
  // Timeline's four dots).
  const maxDist = Math.min(len1, len2) / 2;
  if (tangentDist > maxDist) tangentDist = maxDist;
  const effRadius = tangentDist * Math.tan(theta / 2);

  const A: Point = { x: corner.x + u1x * tangentDist, y: corner.y + u1y * tangentDist };
  const B: Point = { x: corner.x + u2x * tangentDist, y: corner.y + u2y * tangentDist };

  // Turn direction from the cross product of the two edge directions.
  const cross = v1x * v2y - v1y * v2x;
  const sweep: 0 | 1 = cross > 0 ? 0 : 1;

  // Arc center lies along the angle bisector, at distance
  // effRadius / sin(theta/2) from the corner.
  const bisX = u1x + u2x;
  const bisY = u1y + u2y;
  const bisLen = Math.hypot(bisX, bisY) || 1;
  const centerDist = effRadius / Math.sin(theta / 2);
  const center: Point = {
    x: corner.x + (bisX / bisLen) * centerDist,
    y: corner.y + (bisY / bisLen) * centerDist,
  };

  const startAngle = Math.atan2(A.y - center.y, A.x - center.x);
  const endAngle = Math.atan2(B.y - center.y, B.x - center.x);

  return { A, B, center, radius: effRadius, startAngle, endAngle, sweep };
}

/**
 * Converts an arbitrary polyline into an axis-aligned (Manhattan) one by
 * inserting one corner point between any two consecutive input points that
 * differ in BOTH x and y — every segment then fed to buildRoundedPath ends
 * up purely horizontal or vertical, so every turn is a clean 90°. Each
 * inserted corner continues in the prior point's direction of travel first
 * (matching its x, the next point's y) before turning — i.e. "down the
 * rail, then jog across" — which is the idiom used throughout this design
 * (e.g. "goes down to the level of X, then turns and crosses to Y").
 *
 * Returns the expanded point list plus `indexMap`, where `indexMap[i]` is
 * the index into the expanded list corresponding to original point i — the
 * only way callers can still refer to "milestone i" once synthetic corners
 * have shifted every later index.
 */
export function toOrthogonal(points: Point[]): { points: Point[]; indexMap: number[] } {
  if (points.length === 0) return { points: [], indexMap: [] };
  const out: Point[] = [points[0]];
  const indexMap: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    if (Math.abs(prev.x - curr.x) > 0.5 && Math.abs(prev.y - curr.y) > 0.5) {
      out.push({ x: prev.x, y: curr.y });
    }
    out.push(curr);
    indexMap.push(out.length - 1);
  }
  return { points: out, indexMap };
}

function normalizeSweptAngle(start: number, end: number, sweep: 0 | 1): number {
  let delta = end - start;
  if (sweep === 1) {
    // positive/CW sweep
    while (delta <= 0) delta += Math.PI * 2;
  } else {
    while (delta >= 0) delta -= Math.PI * 2;
  }
  return Math.abs(delta);
}

export function buildRoundedPath(points: Point[], radius: number): BuiltPath {
  const segments: Segment[] = [];
  const cumulativeLengths: number[] = new Array(points.length).fill(0);

  if (points.length < 2) {
    return { segments, cumulativeLengths, totalLength: 0 };
  }

  let cursor: Point = points[0];
  let running = 0;
  cumulativeLengths[0] = 0;

  for (let i = 1; i < points.length; i++) {
    const isLast = i === points.length - 1;
    const corner = points[i];
    const next = isLast ? null : points[i + 1];

    const f = next ? fillet(cursor, corner, next, radius) : null;

    if (f) {
      const lineLen = dist(cursor, f.A);
      segments.push({ type: 'line', from: cursor, to: f.A, length: lineLen });
      running += lineLen;

      const swept = normalizeSweptAngle(f.startAngle, f.endAngle, f.sweep);
      const arcLen = f.radius * swept;
      segments.push({
        type: 'arc',
        center: f.center,
        radius: f.radius,
        startAngle: f.startAngle,
        endAngle: f.endAngle,
        sweep: f.sweep,
        length: arcLen,
      });
      running += arcLen;

      cursor = f.B;
      // The waypoint itself is "reached" partway through the fillet (at the
      // corner's closest approach) — approximate with the arc's midpoint for
      // scroll-progress purposes.
      cumulativeLengths[i] = running - arcLen / 2;
    } else {
      const lineLen = dist(cursor, corner);
      segments.push({ type: 'line', from: cursor, to: corner, length: lineLen });
      running += lineLen;
      cursor = corner;
      cumulativeLengths[i] = running;
    }
  }

  return { segments, cumulativeLengths, totalLength: running };
}

function pointOnSegment(seg: Segment, localLen: number): Point {
  if (seg.type === 'line') {
    const t = seg.length < 1e-6 ? 0 : localLen / seg.length;
    return { x: seg.from.x + (seg.to.x - seg.from.x) * t, y: seg.from.y + (seg.to.y - seg.from.y) * t };
  }
  const t = seg.length < 1e-6 ? 0 : localLen / seg.length;
  const swept = normalizeSweptAngle(seg.startAngle, seg.endAngle, seg.sweep) * t;
  const a = seg.startAngle + (seg.sweep === 1 ? swept : -swept);
  return { x: seg.center.x + Math.cos(a) * seg.radius, y: seg.center.y + Math.sin(a) * seg.radius };
}

function segmentD(seg: Segment, upToLen: number): string {
  const end = pointOnSegment(seg, Math.min(upToLen, seg.length));
  if (seg.type === 'line') {
    return `L ${end.x} ${end.y}`;
  }
  const largeArc = 0; // fillet arcs are always the minor (<180°) arc
  return `A ${seg.radius} ${seg.radius} 0 ${largeArc} ${seg.sweep} ${end.x} ${end.y}`;
}

/** Truncated "d" string covering the path from its start up to `targetLength`. */
export function partialD(built: BuiltPath, targetLength: number): string {
  if (built.segments.length === 0) return '';
  const clamped = Math.max(0, Math.min(targetLength, built.totalLength));
  const first = built.segments[0];
  const start = first.type === 'line' ? first.from : pointOnSegment(first, 0);
  let d = `M ${start.x} ${start.y}`;
  let consumed = 0;

  for (const seg of built.segments) {
    if (consumed >= clamped) break;
    const remaining = clamped - consumed;
    d += ' ' + segmentD(seg, remaining);
    consumed += seg.length;
  }

  return d;
}

/** Returns the (x, y) coordinates on the path at a specific length. */
export function pointAtLength(built: BuiltPath, targetLength: number): Point | null {
  if (built.segments.length === 0) return null;
  const clamped = Math.max(0, Math.min(targetLength, built.totalLength));
  let consumed = 0;
  for (const seg of built.segments) {
    if (consumed + seg.length >= clamped) {
      const remaining = clamped - consumed;
      return pointOnSegment(seg, remaining);
    }
    consumed += seg.length;
  }
  const last = built.segments[built.segments.length - 1];
  return last.type === 'line' ? last.to : pointOnSegment(last, last.length);
}

/** Convenience: the full, untruncated path. */
export function fullD(built: BuiltPath): string {
  return partialD(built, built.totalLength);
}

