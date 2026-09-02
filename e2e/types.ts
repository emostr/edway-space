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

export interface SheetsResponse {
  assignmentId: string;
  testTitle: string;
  className: string;
  date: string;
  layout: {
    pages: { index: number; header: boolean; rows: SheetRow[] }[];
    extended: { questionId: string; number: number; points: number }[];
  };
  works: { id: string; code: string; studentName: string }[];
}
