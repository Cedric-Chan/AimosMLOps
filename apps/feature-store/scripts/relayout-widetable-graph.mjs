/**
 * Re-layout a production WideTable graph JSON into a regular matrix.
 *
 * Production graph dumps (`chartConfig.nodes`) carry hand-dragged canvas coordinates, so
 * after nodes are added or removed the graph keeps the gaps and ragged rows of the old
 * arrangement. This rewrites positions into an even grid and re-centres the viewport.
 *
 * Layer order is preserved: from-table on the left, Feature Groups in the middle as a
 * matrix, data-ingestion sink on the right, both vertically centred on the group block.
 *
 * Usage:
 *   node scripts/relayout-widetable-graph.mjs <in.json> [out.json] [--cols N]
 *   node scripts/relayout-widetable-graph.mjs graph.json --in-place
 *
 * With no out.json and no --in-place it prints the result and writes nothing.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Column pitch matches the production canvas (~330px), which reads as a 4-wide matrix.
const GAP_X = 86;
const GAP_Y = 44;
/** Breathing room between the Feature Group block and the run's bookend nodes. */
const GAP_BOOKEND = 170;

const FG_TYPE = "wideTableFeatureGroup";

function parseArgs(argv) {
  const files = [];
  let cols = null;
  let inPlace = false;
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--in-place") inPlace = true;
    else if (a === "--cols") cols = Number(argv[++i]);
    else files.push(a);
  }
  return { input: files[0], output: files[1] ?? null, cols, inPlace };
}

const { input, output, cols: colsArg, inPlace } = parseArgs(process.argv.slice(2));
if (!input) {
  console.error("usage: relayout-widetable-graph.mjs <in.json> [out.json] [--cols N] [--in-place]");
  process.exit(2);
}

const inPath = resolve(input);
const doc = JSON.parse(readFileSync(inPath, "utf8"));
const chart = doc?.chartConfig;
if (!chart?.nodes?.length) {
  console.error(`no chartConfig.nodes found in ${inPath}`);
  process.exit(2);
}

const { nodes } = chart;
const fgNodes = nodes.filter((n) => n.data?.nodeType === FG_TYPE);
const sourceNodes = nodes.filter((n) => n.data?.nodeType === "dataIngestion");
const sinkNodes = nodes.filter((n) => n.data?.nodeType === "wideTableDataCleaning");
const otherNodes = nodes.filter(
  (n) => ![FG_TYPE, "dataIngestion", "wideTableDataCleaning"].includes(n.data?.nodeType)
);

if (fgNodes.length === 0) {
  console.error("no Feature Group nodes to lay out");
  process.exit(2);
}

/** Original extents — captured before anything moves, for the viewport anchor below. */
const boundsOf = (list) => {
  const xs = list.flatMap((n) => [n.position.x, n.position.x + n.width]);
  const ys = list.flatMap((n) => [n.position.y, n.position.y + n.height]);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
};
const beforeBounds = boundsOf(nodes);

/**
 * Recover reading order from the incoming positions. Hand-dragged canvases never line rows
 * up exactly (a 5px drift is normal), so rows are clustered by vertical gap instead of
 * compared on raw y — otherwise one node jumps a row and scrambles the family grouping.
 */
const ROW_TOLERANCE = 60;
function readingOrder(list) {
  const byY = [...list].sort((a, b) => a.position.y - b.position.y);
  const rows = [];
  for (const node of byY) {
    const row = rows[rows.length - 1];
    if (row && node.position.y - row.y <= ROW_TOLERANCE) row.items.push(node);
    else rows.push({ y: node.position.y, items: [node] });
  }
  return rows.flatMap((r) => r.items.sort((a, b) => a.position.x - b.position.x));
}

const ordered = readingOrder(fgNodes);

/** Same rule the prototype canvas uses: one column up to four, then a near-square grid. */
const cols = colsArg ?? (fgNodes.length <= 4 ? 1 : Math.ceil(Math.sqrt(fgNodes.length)));
const rows = Math.ceil(fgNodes.length / cols);

const unitW = Math.max(...fgNodes.map((n) => n.width));
const unitH = Math.max(...fgNodes.map((n) => n.height));
const pitchX = unitW + GAP_X;
const pitchY = unitH + GAP_Y;

const ORIGIN_X = Math.round(Math.min(...fgNodes.map((n) => n.position.x)));
const ORIGIN_Y = Math.round(Math.min(...fgNodes.map((n) => n.position.y)));

/** Top-left corner of slot `index`, laid out row-major. */
const slot = (index) => ({
  x: ORIGIN_X + (index % cols) * pitchX,
  y: ORIGIN_Y + Math.floor(index / cols) * pitchY,
});

const gridW = (cols - 1) * pitchX + unitW;
const gridH = (rows - 1) * pitchY + unitH;
const centreY = ORIGIN_Y + gridH / 2;

function place(node, x, y) {
  const nx = Math.round(x * 100) / 100;
  const ny = Math.round(y * 100) / 100;
  node.position = { x: nx, y: ny };
  // The renderer reads positionAbsolute; keep the two in step.
  if (node.positionAbsolute) node.positionAbsolute = { x: nx, y: ny };
}

const moved = [];
ordered.forEach((node, i) => {
  const { x, y } = slot(i);
  moved.push({ node, from: { ...node.position }, to: { x, y } });
  place(node, x, y);
});

// Bookend nodes sit on the vertical centre of the group block.
sourceNodes.forEach((n) => place(n, ORIGIN_X - GAP_BOOKEND - n.width, centreY - n.height / 2));
sinkNodes.forEach((n) => place(n, ORIGIN_X + gridW + GAP_BOOKEND, centreY - n.height / 2));
otherNodes.forEach((n) => place(n, ORIGIN_X + gridW + GAP_BOOKEND, centreY - n.height / 2));

// ── Viewport: keep the graph on the same on-screen point, at the existing zoom ──
// Positions are world coordinates, so moving them without touching the viewport would
// scroll the graph out of frame. `beforeBounds` was captured before any node moved; the
// new centre is placed where the old centre used to appear.
const viewport = chart.viewport ?? { x: 0, y: 0, zoom: 1 };
const screenAnchor = {
  x: ((beforeBounds.minX + beforeBounds.maxX) / 2) * viewport.zoom + viewport.x,
  y: ((beforeBounds.minY + beforeBounds.maxY) / 2) * viewport.zoom + viewport.y,
};

const afterBounds = boundsOf(nodes);
chart.viewport = {
  zoom: viewport.zoom,
  x: Math.round((screenAnchor.x - ((afterBounds.minX + afterBounds.maxX) / 2) * viewport.zoom) * 100) / 100,
  y: Math.round((screenAnchor.y - ((afterBounds.minY + afterBounds.maxY) / 2) * viewport.zoom) * 100) / 100,
};

// ── Verify the matrix is a matrix: even pitches and no overlap ──
const problems = [];
const xs = [...new Set(ordered.map((n) => n.position.x))].sort((a, b) => a - b);
const ys = [...new Set(ordered.map((n) => n.position.y))].sort((a, b) => a - b);
if (xs.length !== cols) problems.push(`expected ${cols} distinct column x-values, found ${xs.length}`);
if (ys.length !== rows) problems.push(`expected ${rows} distinct row y-values, found ${ys.length}`);

for (let i = 0; i < nodes.length; i += 1) {
  for (let j = i + 1; j < nodes.length; j += 1) {
    const a = nodes[i];
    const b = nodes[j];
    const hit =
      a.position.x < b.position.x + b.width &&
      b.position.x < a.position.x + a.width &&
      a.position.y < b.position.y + b.height &&
      b.position.y < a.position.y + a.height;
    if (hit) {
      problems.push(
        `overlap: ${a.data?.featureGroupName ?? a.id} <-> ${b.data?.featureGroupName ?? b.id}`
      );
    }
  }
}

console.log(`${inPath}`);
console.log(`  grid      : ${cols} cols x ${rows} rows  (${fgNodes.length} feature groups)`);
console.log(`  cell      : ${unitW}x${unitH}  pitch ${pitchX}x${pitchY}`);
console.log(`  block     : ${Math.round(gridW)}x${Math.round(gridH)}`);
console.log(`  bounds    : ${Math.round(afterBounds.maxX - afterBounds.minX)}x${Math.round(afterBounds.maxY - afterBounds.minY)}`);
console.log(`  viewport  : zoom ${chart.viewport.zoom.toFixed(4)} @ (${chart.viewport.x}, ${chart.viewport.y})`);
console.log("\n  matrix:");
for (let r = 0; r < rows; r += 1) {
  const row = ordered.slice(r * cols, (r + 1) * cols);
  console.log(
    `    r${r}  ` +
      row
        .map((n) => (n.data?.featureGroupName ?? n.id).padEnd(Math.max(24, unitW / 6)).slice(0, 34))
        .join(" | ")
  );
}

if (problems.length) {
  console.error(`\n  ${problems.length} layout problem(s):`);
  problems.forEach((p) => console.error(`    - ${p}`));
  process.exit(1);
}
console.log("\n  ok: even grid, no overlapping cards");

const target = inPlace ? inPath : output ? resolve(output) : null;
if (target) {
  writeFileSync(target, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
  console.log(`  wrote ${target}`);
} else {
  console.log("  (dry run — pass an out.json or --in-place to write)");
}
