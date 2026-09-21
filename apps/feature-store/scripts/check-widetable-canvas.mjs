/**
 * Self-check for the WideTable canvas layout + status math.
 *
 * The canvas must stay correct for any Feature Group count — production runs 19 on one
 * WideTable — so the geometry is derived rather than hand-placed. This asserts the
 * invariants that a bad derivation would break.
 *
 * Run: node scripts/check-widetable-canvas.mjs
 */
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "node_modules", ".cache-wt-check");
const outFile = join(outDir, "model.mjs");

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

mkdirSync(outDir, { recursive: true });
await build({
  configFile: false,
  logLevel: "silent",
  resolve: { alias: { "@": join(root, "src") } },
  build: {
    lib: {
      entry: join(root, "src/data/widetableCanvasModel.ts"),
      formats: ["es"],
      fileName: () => "model.mjs",
    },
    outDir,
    emptyOutDir: true,
    minify: false,
  },
});

const {
  buildSnapshot,
  canvasBounds,
  nodeHeight,
  fgGridCols,
  fgGridPosition,
  NODE_W,
} = await import(pathToFileURL(outFile).href);

const frameTable = {
  sourceType: "hive",
  dataServer: "reg_sg",
  tableSchema: "demo_db",
  tableName: "frame_table_demo",
  sql: "",
  customFilter: "",
  entityCols: [],
  eventTimeCol: "",
};

/** The production WideTable carries 19 Feature Groups. */
const MANY = Array.from({ length: 19 }, (_, i) => ({
  name: `fg_${i}`,
  columns: (i + 1) * 11,
}));

for (const [label, fgs] of [["3 feature groups", MANY.slice(0, 3)], ["19 feature groups", MANY]]) {
  console.log(`\n${label}`);
  const snap = buildSnapshot({
    fgs,
    frameTable,
    dataCleaning: { enabled: false, fillnaRows: [], vmRows: [] },
  });

  const { nodes, edges } = snap;
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const fgNodes = nodes.filter((n) => n.type === "feature");
  const source = nodes.find((n) => n.type === "source");
  const sink = nodes.find((n) => n.type === "sink");

  check("node count = fgs + 2", nodes.length === fgs.length + 2, `got ${nodes.length}`);
  check("one frame table + one sink", Boolean(source) && Boolean(sink));
  check("edge count = 2 x fgs", edges.length === fgs.length * 2, `got ${edges.length}`);
  check("every edge endpoint exists", edges.every(([a, b]) => byId.has(a) && byId.has(b)));
  check(
    "no duplicate node ids",
    new Set(nodes.map((n) => n.id)).size === nodes.length
  );

  // Bounds must enclose every node, or the canvas clips them.
  const b = canvasBounds(nodes);
  const inside = nodes.every(
    (n) =>
      n.x >= b.minX && n.y >= b.minY && n.x + n.w <= b.maxX && n.y + n.h <= b.maxY
  );
  check("bounds enclose all nodes", inside);

  // Cards must not overlap: a grid that ignores wrap would collide here.
  let overlaps = 0;
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const c = nodes[j];
      const hit =
        a.x < c.x + c.w && c.x < a.x + a.w && a.y < c.y + c.h && c.y < a.y + a.h;
      if (hit) overlaps += 1;
    }
  }
  check("no two cards overlap", overlaps === 0, `${overlaps} overlapping pair(s)`);

  // Left-to-right reading order: source < every FG < sink.
  const fgLeft = Math.min(...fgNodes.map((n) => n.x));
  const fgRight = Math.max(...fgNodes.map((n) => n.x + n.w));
  check("source sits left of the feature groups", source.x + source.w < fgLeft);
  check("feature groups sit left of the sink", fgRight < sink.x);
  check(
    "source and sink are vertically centred on the group block",
    Math.abs(source.y + source.h / 2 - (b.minY + b.h / 2)) < 1
  );

  // Node height must accommodate the parameter rows it has to draw.
  check(
    "height fits card contents",
    nodes.every((n) => n.h >= nodeHeight(n.params ?? [])),
  );
  check("card width is uniform", nodes.every((n) => n.w === NODE_W));
}

console.log(`\ngrid helpers`);
check("<=4 groups stay in one column", fgGridCols(4) === 1);
check("19 groups wrap into a grid", fgGridCols(19) === 5, `got ${fgGridCols(19)}`);
check("grid positions are distinct", (() => {
  const seen = new Set();
  for (let i = 0; i < 19; i += 1) {
    const p = fgGridPosition(i, fgGridCols(19));
    const key = `${p.x}:${p.y}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
})());

rmSync(outDir, { recursive: true, force: true });

console.log(failures === 0 ? "\nAll canvas checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
