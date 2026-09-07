export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'EXTENDED';

export type WorkStatus = 'PENDING' | 'RECOGNIZED' | 'NEEDS_REVIEW' | 'CHECKED';

export type AccountRole = 'PLATFORM_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER';

export type SchoolStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED' | 'BLOCKED';

export type SetupStep = 'password' | 'totp' | 'done';

export interface SchoolBrief {
  id: string;
  name: string;
  slug: string;
  status: SchoolStatus;
  paidUntil: string;
  daysLeft: number;
}

export interface Profile {
  id: string;
  login: string;
  fullName: string;
  subject: string;
  role: AccountRole;
  mustChangePassword: boolean;
  totpEnabled: boolean;
  setupStep: SetupStep;
  unusedBackupCodes: number;
  school: SchoolBrief | null;
  createdAt: string;
}

export interface SchoolDetail {
  id: string;
  name: string;
  slug: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  status: SchoolStatus;
  paidUntil: string;
  daysLeft: number;
  createdAt: string;
  counts: { accounts: number; classes: number; tests: number; assignments: number };
  payments: { id: string; amount: number; months: number; succeededAt: string | null; description: string }[];
}

export interface StaffRow {
  id: string;
  login: string;
  fullName: string;
  subject: string;
  role: AccountRole;
  totpEnabled: boolean;
  mustChangePassword: boolean;
  tempPassword: string | null;
  activeSessions: number;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Plan {
  code: string;
  months: number;
  amount: number;
  amountLabel: string;
  title: string;
  description: string;
  /** false — касса в учебном режиме: платёж не списывает деньги. */
  live: boolean;
}

export interface CheckoutResult {
  paymentId: string;
  confirmationUrl: string | null;
  amount: number;
  amountLabel: string;
  months: number;
  live: boolean;
  schoolId?: string;
}

export interface PaymentResult {
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED';
  amountLabel: string;
  months: number;
  school: { name: string; paidUntil: string };
  credentials: { login: string; temporaryPassword: string } | null;
}

export interface PaymentRow {
  id: string;
  externalId: string;
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED';
  amount: number;
  amountLabel: string;
  months: number;
  description: string;
  createdAt: string;
  succeededAt: string | null;
}

export interface SchoolCredentials {
  schoolId: string;
  schoolName: string;
  login: string;
  temporaryPassword: string;
  paidUntil: string;
  trialDays: number;
}

/** Сводка панели платформы. */
export interface PlatformOverview {
  schools: {
    total: number;
    trial: number;
    active: number;
    expired: number;
    blocked: number;
    newThisMonth: number;
    expiringSoon: number;
  };
  money: {
    total: number;
    totalLabel: string;
    month: number;
    monthLabel: string;
    payments: number;
  };
}

export interface PlatformSchoolRow {
  id: string;
  name: string;
  slug: string;
  city: string;
  contactEmail: string;
  contactPhone: string;
  status: SchoolStatus;
  paidUntil: string;
  daysLeft: number;
  note: string;
  createdAt: string;
  counts: { accounts: number; classes: number; assignments: number };
  paid: number;
}

export interface PlatformPaymentRow extends PaymentRow {
  schoolId: string;
  schoolName: string;
  payerEmail: string;
}

export interface Colleague {
  id: string;
  fullName: string;
  login: string;
  subject: string;
}

export interface SchoolClass {
  id: string;
  number: number;
  letter: string;
  name: string;
  studentCount: number;
  assignmentCount: number;
  archivedAt: string | null;
  createdAt: string;
}

export interface Student {
  id: string;
  lastName: string;
  firstName: string;
  fullName: string;
}

export interface ClassDetail {
  id: string;
  number: number;
  letter: string;
  name: string;
  archivedAt: string | null;
  students: Student[];
}

export interface AnswerKey {
  correct?: string[];
  partial?: boolean;
  accepted?: string[];
  caseSensitive?: boolean;
  numeric?: boolean;
  tolerance?: number;
  guideline?: string;
}

export interface QuestionOption {
  id: string;
  content: string;
}

export interface Question {
  id: string;
  order: number;
  /** 0 — задание во всех вариантах, 1..N — только в своём. */
  variant: number;
  type: QuestionType;
  content: string;
  points: number;
  options: QuestionOption[];
  answerKey: AnswerKey;
}

export interface TestSummary {
  id: string;
  title: string;
  description: string;
  isPublished: boolean;
  variantCount: number;
  questionCount: number;
  maxScore: number;
  assignmentCount: number;
  ownerId: string;
  ownerName: string;
  mine: boolean;
  canEdit: boolean;
  sharedWith: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestShareRow {
  teacherId: string;
  fullName: string;
  login: string;
  subject: string;
  canEdit: boolean;
}

export interface TestDetail extends Omit<TestSummary, 'questionCount' | 'maxScore' | 'sharedWith'> {
  instructions: string;
  gradeScale: Record<string, number>;
  questions: Question[];
  shares: TestShareRow[];
}

export interface AssignmentRow {
  id: string;
  date: string;
  note: string;
  testId: string;
  testTitle: string;
  classId: string;
  className: string;
  createdByName: string;
  closedAt: string | null;
  total: number;
  checked: number;
  pending: number;
  maxScore: number;
  variantCount: number;
}

export interface SnapshotOption {
  id: string;
  content: string;
  letter: string;
}

export interface SnapshotQuestion {
  id: string;
  order: number;
  variant: number;
  type: QuestionType;
  content: string;
  points: number;
  options: SnapshotOption[];
  answerKey: AnswerKey;
  cells: number;
}

export interface TestSnapshot {
  testId: string;
  title: string;
  description: string;
  instructions: string;
  gradeScale: Record<string, number>;
  variantCount: number;
  questions: SnapshotQuestion[];
  maxScore: number;
}

export interface WorkRow {
  id: string;
  code: string;
  status: WorkStatus;
  variant: number;
  studentId: string | null;
  studentName: string;
  autoScore: number;
  manualScore: number;
  maxScore: number;
  percent: number;
  grade: number | null;
  pages: number;
  scannedAt: string | null;
  checkedAt: string | null;
}

export interface AssignmentDetail {
  id: string;
  date: string;
  note: string;
  testId: string;
  testTitle: string;
  classId: string;
  className: string;
  createdByName: string;
  closedAt: string | null;
  snapshot: TestSnapshot;
  works: WorkRow[];
}

export interface CellBox {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SheetRow {
  questionId: string;
  number: number;
  type: QuestionType;
  points: number;
  hint: string;
  y: number;
  cells: CellBox[];
}

/** Место под развёрнутый ответ: заголовок задания и разлинованное поле. */
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

export interface SheetGeometry {
  width: number;
  height: number;
  markerSize: number;
  markerInset: number;
  left: number;
  right: number;
  firstRowY: number;
  contRowY: number;
  lastRowY: number;
  rowHeight: number;
  numberWidth: number;
  cellWidth: number;
  cellHeight: number;
  cellGap: number;
  code: { x: number; y: number; width: number; height: number };
}

export interface SheetLayout {
  pages: SheetPage[];
  extended: { questionId: string; number: number; points: number }[];
  variant: number;
  sheet: SheetGeometry;
}

export interface SheetsResponse {
  assignmentId: string;
  testTitle: string;
  className: string;
  date: string;
  instructions: string;
  snapshot: TestSnapshot;
  variantCount: number;
  /** Разметка каждого варианта: у бланков разные наборы заданий. */
  layouts: Record<string, SheetLayout>;
  works: { id: string; code: string; variant: number; studentName: string }[];
}

export interface WorkAnswer {
  questionId: string;
  number: number;
  type: QuestionType;
  raw: string;
  correct: boolean | null;
  score: number;
  maxScore: number;
  auto: boolean;
  comment: string;
  confidence: number;
}

export interface WorkDetail {
  id: string;
  code: string;
  status: WorkStatus;
  variant: number;
  variantCount: number;
  studentId: string | null;
  studentName: string;
  assignmentId: string;
  testTitle: string;
  className: string;
  date: string;
  autoScore: number;
  manualScore: number;
  maxScore: number;
  percent: number;
  grade: number | null;
  gradeScale: Record<string, number>;
  scannedAt: string | null;
  checkedAt: string | null;
  pages: { id: string; index: number; url: string; width: number; height: number }[];
  questions: SnapshotQuestion[];
  answers: WorkAnswer[];
}

export interface UploadOutcome {
  matched: { workId: string; code: string; studentName: string; pageIndex: number }[];
  unmatched: { file: string; url: string; reason: string }[];
}

export interface GradeRow {
  workId: string;
  assignmentId: string;
  date: string;
  className: string;
  classId: string;
  testTitle: string;
  testId: string;
  studentId: string | null;
  studentName: string;
  score: number;
  maxScore: number;
  percent: number;
  grade: number | null;
  status: WorkStatus;
  checkedAt: string | null;
}

export interface GradeSummary {
  total: number;
  graded: number;
  distribution: Record<string, number>;
  average: number;
  percent: number;
  quality: number;
  success: number;
}

export interface Overview {
  tiles: {
    tests: number;
    classes: number;
    assignments: number;
    works: number;
    checked: number;
    pending: number;
    average: number;
    checkedLast30: number;
  };
  distribution: Record<string, number>;
  activity: { date: string; checked: number }[];
  recent: {
    id: string;
    date: string;
    testTitle: string;
    className: string;
    total: number;
    checked: number;
    closedAt: string | null;
  }[];
}

export interface AssignmentReport {
  assignmentId: string;
  testTitle: string;
  className: string;
  date: string;
  checked: number;
  questions: {
    questionId: string;
    number: number;
    answered: number;
    correct: number;
    successPercent: number;
    averageScore: number;
    maxScore: number;
  }[];
}
