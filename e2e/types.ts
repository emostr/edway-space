/** Ответ /api/assignments/:id/sheets — ровно то, из чего печатается бланк. */
export interface SheetCell {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetRow {
  questionId: string;
  number: number;
  type: string;
  points: number;
  hint: string;
  y: number;
  cells: SheetCell[];
}

export interface EssayBlock {
  questionId: string;
  number: number;
  points: number;
  guideline: string;
  y: number;
  height: number;
  rules: number[];
}

export interface SheetPage {
  index: number;
  kind: 'answers' | 'essay';
  header: boolean;
  rows: SheetRow[];
  blocks: EssayBlock[];
}

export interface SheetLayout {
  pages: SheetPage[];
  extended: { questionId: string; number: number; points: number }[];
  variant: number;
}

export interface SheetsResponse {
  assignmentId: string;
  testTitle: string;
  className: string;
  date: string;
  variantCount: number;
  layouts: Record<string, SheetLayout>;
  works: { id: string; code: string; variant: number; studentName: string }[];
}
