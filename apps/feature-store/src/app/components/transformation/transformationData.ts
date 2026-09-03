export type TransformationStatus = "DRAFT" | "ENABLED" | "DISABLED" | "PENDING";

export interface TfParam {
  name: string;
  dataType: string;
}

export interface TransformationVersionRow {
  id: string;
  name: string;
  version: string;
  type: string;
  language: string;
  status: TransformationStatus;
  regions: string[];
  owner: string;
  createTime: string;
  description: string;
  script: string;
  inputParams: TfParam[];
  outputParams: TfParam[];
}

export interface TfTestHistoryRecord {
  id: string;
  region: string;
  createTime: string;
  operator: string;
  status: "Success" | "Failed";
  input: Record<string, string>;
  output: Record<string, string>;
}

/** Flat rows; sort by name then version for rowspan grouping */
export const INITIAL_TRANSFORMATION_ROWS: TransformationVersionRow[] = [
  {
    id: "tp-v2",
    name: "Test_prosc",
    version: "V2",
    type: "Aggregator",
    language: "Groovy",
    status: "ENABLED",
    regions: ["SG", "PH"],
    owner: "cedric.chencan@seamoney.com",
    createTime: "2026-02-20 14:30:00",
    description: "Prosc aggregation transformer v2.",
    script: "// Test_prosc V2\ndef run(ctx) { return ctx }",
    inputParams: [{ name: "scenario_id", dataType: "String" }],
    outputParams: [
      { name: "indexs", dataType: "List" },
      { name: "values", dataType: "List" },
    ],
  },
  {
    id: "tp-v1",
    name: "Test_prosc",
    version: "V1",
    type: "Aggregator",
    language: "Groovy",
    status: "DRAFT",
    regions: ["TH"],
    owner: "cedric.chencan@seamoney.com",
    createTime: "2026-02-18 10:00:00",
    description: "Prosc aggregation transformer v1 draft.",
    script: "// Test_prosc V1",
    inputParams: [{ name: "scenario_id", dataType: "String" }],
    outputParams: [{ name: "indexs", dataType: "List" }],
  },
  {
    id: "tt-v2",
    name: "Test_trans",
    version: "V2",
    type: "Aggregator",
    language: "Python",
    status: "ENABLED",
    regions: ["SG"],
    owner: "huangwei@shopee.com",
    createTime: "2026-02-19 09:15:00",
    description: "Trans v2 python.",
    script: "# Test_trans V2",
    inputParams: [{ name: "user_id", dataType: "String" }],
    outputParams: [{ name: "score", dataType: "int" }],
  },
  {
    id: "tt-v1",
    name: "Test_trans",
    version: "V1",
    type: "Aggregator",
    language: "Groovy",
    status: "DISABLED",
    regions: ["PH", "TH"],
    owner: "huangwei@shopee.com",
    createTime: "2026-02-10 16:45:00",
    description: "Trans v1 groovy offline.",
    script: "// Test_trans V1",
    inputParams: [{ name: "user_id", dataType: "String" }],
    outputParams: [{ name: "score", dataType: "int" }],
  },
  {
    id: "tpy-v1",
    name: "Test_py",
    version: "V1",
    type: "Aggregator",
    language: "Python",
    status: "DRAFT",
    regions: ["SG"],
    owner: "cedric.chencan@seamoney.com",
    createTime: "2026-02-22 11:20:00",
    description: "Python-only test op.",
    script: "# Test_py",
    inputParams: [],
    outputParams: [{ name: "result", dataType: "String" }],
  },
];

export const TF_FILTER_REGIONS = [
  "",
  "SG",
  "PH",
  "TH",
  "ID",
  "MX",
  "VN",
  "SHOPEE_SG",
  "BR",
];

export const TF_TYPES = ["", "Scalar", "Aggregator"];
export const TF_LANGUAGES = ["", "Groovy", "Python"];

export const MOCK_TF_TEST_HISTORY: Record<string, TfTestHistoryRecord[]> = {
  "tp-v2": [
    {
      id: "h1",
      region: "SG",
      createTime: "2026-02-21 15:30:10.000",
      operator: "cedric.chencan@seamoney.com",
      status: "Success",
      input: { scenario_id: "s1" },
      output: { indexs: "[0,1]", values: "[1.0,2.0]" },
    },
  ],
  "tp-v1": [],
  "tt-v2": [],
  "tt-v1": [],
  "tpy-v1": [],
};

export function sortRowsForTable(rows: TransformationVersionRow[]): TransformationVersionRow[] {
  return [...rows].sort((a, b) => {
    const n = a.name.localeCompare(b.name);
    if (n !== 0) return n;
    return b.version.localeCompare(a.version, undefined, { numeric: true });
  });
}

export function computeNameRowspans(sorted: TransformationVersionRow[]): Map<string, number> {
  const map = new Map<string, number>();
  let i = 0;
  while (i < sorted.length) {
    const name = sorted[i].name;
    let j = i + 1;
    while (j < sorted.length && sorted[j].name === name) j += 1;
    map.set(sorted[i].id, j - i);
    for (let k = i + 1; k < j; k++) map.set(sorted[k].id, 0);
    i = j;
  }
  return map;
}
