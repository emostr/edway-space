-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'SHORT_ANSWER', 'EXTENDED');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('PENDING', 'RECOGNIZED', 'NEEDS_REVIEW', 'CHECKED');

-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "ip" TEXT NOT NULL DEFAULT '',
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolClass" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "letter" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archiveKey" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "SchoolClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "searchKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "instructions" TEXT NOT NULL DEFAULT '',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "gradeScale" JSONB NOT NULL DEFAULT '{"5":85,"4":70,"3":50}',

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "points" INTEGER NOT NULL DEFAULT 1,
    "options" JSONB NOT NULL DEFAULT '[]',
    "answerKey" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestShare" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "canEdit" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "snapshot" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL,
    "status" "WorkStatus" NOT NULL DEFAULT 'PENDING',
    "answers" JSONB NOT NULL DEFAULT '[]',
    "autoScore" INTEGER NOT NULL DEFAULT 0,
    "manualScore" INTEGER NOT NULL DEFAULT 0,
    "maxScore" INTEGER NOT NULL DEFAULT 0,
    "grade" INTEGER,
    "percent" INTEGER NOT NULL DEFAULT 0,
    "scannedAt" TIMESTAMP(3),
    "checkedAt" TIMESTAMP(3),
    "checkedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanPage" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "index" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFile" (
    "id" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "mime" TEXT NOT NULL DEFAULT 'image/webp',
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "size" INTEGER NOT NULL DEFAULT 0,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_login_key" ON "Teacher"("login");

-- CreateIndex
CREATE INDEX "Teacher_deletedAt_idx" ON "Teacher"("deletedAt");

-- CreateIndex
CREATE INDEX "AuthSession_teacherId_idx" ON "AuthSession"("teacherId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE INDEX "SchoolClass_number_idx" ON "SchoolClass"("number");

-- CreateIndex
CREATE INDEX "SchoolClass_archivedAt_idx" ON "SchoolClass"("archivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolClass_number_letter_archiveKey_key" ON "SchoolClass"("number", "letter", "archiveKey");

-- CreateIndex
CREATE INDEX "Student_classId_searchKey_idx" ON "Student"("classId", "searchKey");

-- CreateIndex
CREATE INDEX "Student_archivedAt_idx" ON "Student"("archivedAt");

-- CreateIndex
CREATE INDEX "Test_ownerId_idx" ON "Test"("ownerId");

-- CreateIndex
CREATE INDEX "Test_deletedAt_idx" ON "Test"("deletedAt");

-- CreateIndex
CREATE INDEX "Question_testId_order_idx" ON "Question"("testId", "order");

-- CreateIndex
CREATE INDEX "TestShare_teacherId_idx" ON "TestShare"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "TestShare_testId_teacherId_key" ON "TestShare"("testId", "teacherId");

-- CreateIndex
CREATE INDEX "Assignment_classId_date_idx" ON "Assignment"("classId", "date");

-- CreateIndex
CREATE INDEX "Assignment_date_idx" ON "Assignment"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Assignment_testId_classId_date_key" ON "Assignment"("testId", "classId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Work_code_key" ON "Work"("code");

-- CreateIndex
CREATE INDEX "Work_assignmentId_status_idx" ON "Work"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "Work_studentId_idx" ON "Work"("studentId");

-- CreateIndex
CREATE INDEX "ScanPage_workId_index_idx" ON "ScanPage"("workId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFile_file_key" ON "MediaFile"("file");

-- CreateIndex
CREATE INDEX "MediaFile_ownerId_idx" ON "MediaFile"("ownerId");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolClass" ADD CONSTRAINT "SchoolClass_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestShare" ADD CONSTRAINT "TestShare_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestShare" ADD CONSTRAINT "TestShare_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestShare" ADD CONSTRAINT "TestShare_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "SchoolClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScanPage" ADD CONSTRAINT "ScanPage_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFile" ADD CONSTRAINT "MediaFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
