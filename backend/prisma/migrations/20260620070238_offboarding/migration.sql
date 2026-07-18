-- CreateEnum
CREATE TYPE "ExitType" AS ENUM ('RESIGNATION', 'TERMINATION', 'RETIREMENT', 'END_OF_CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ExitStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "exit_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "ExitType" NOT NULL DEFAULT 'RESIGNATION',
    "status" "ExitStatus" NOT NULL DEFAULT 'INITIATED',
    "reason" TEXT,
    "noticeDate" DATE NOT NULL,
    "lastWorkingDay" DATE NOT NULL,
    "exitInterview" TEXT,
    "rehireEligible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exit_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exit_tasks" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "exitRecordId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exit_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exit_records_companyId_status_idx" ON "exit_records"("companyId", "status");

-- CreateIndex
CREATE INDEX "exit_records_companyId_employeeId_idx" ON "exit_records"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "exit_tasks_companyId_exitRecordId_idx" ON "exit_tasks"("companyId", "exitRecordId");

-- AddForeignKey
ALTER TABLE "exit_tasks" ADD CONSTRAINT "exit_tasks_exitRecordId_fkey" FOREIGN KEY ("exitRecordId") REFERENCES "exit_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
