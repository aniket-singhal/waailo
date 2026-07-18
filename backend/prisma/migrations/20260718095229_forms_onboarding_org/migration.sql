-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EmploymentType" ADD VALUE 'PROBATION';
ALTER TYPE "EmploymentType" ADD VALUE 'CONSULTANT';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "aadhaarRef" TEXT,
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "bankAccountHolder" TEXT,
ADD COLUMN     "bankBranch" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "businessUnitId" TEXT,
ADD COLUMN     "costCenterId" TEXT,
ADD COLUMN     "currentAddress" TEXT,
ADD COLUMN     "departmentHeadId" TEXT,
ADD COLUMN     "drivingLicense" TEXT,
ADD COLUMN     "drivingLicenseExpiry" TIMESTAMP(3),
ADD COLUMN     "gradeId" TEXT,
ADD COLUMN     "holidayCalendarId" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "onboardingStatus" "OnboardingStatus" NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN     "passportExpiry" TIMESTAMP(3),
ADD COLUMN     "passportNumber" TEXT,
ADD COLUMN     "payrollActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "permanentAddress" TEXT,
ADD COLUMN     "personalEmail" TEXT,
ADD COLUMN     "photoDocumentId" TEXT,
ADD COLUMN     "prevPfMember" BOOLEAN,
ADD COLUMN     "reviewingManagerId" TEXT;

-- CreateTable
CREATE TABLE "business_units" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grades" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_education" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "institution" TEXT,
    "board" TEXT,
    "yearOfPassing" INTEGER,
    "percentage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "previous_employment" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "designation" TEXT,
    "fromDate" DATE,
    "toDate" DATE,
    "lastCtc" INTEGER,
    "reasonForLeaving" TEXT,
    "managerName" TEXT,
    "managerContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "previous_employment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "contactNumber" TEXT NOT NULL,
    "alternateNumber" TEXT,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nominees" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "relationship" TEXT,
    "dateOfBirth" DATE,
    "contactNumber" TEXT,
    "sharePercent" INTEGER,
    "address" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nominees_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "business_units_companyId_idx" ON "business_units"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "business_units_companyId_name_key" ON "business_units"("companyId", "name");

-- CreateIndex
CREATE INDEX "grades_companyId_idx" ON "grades"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "grades_companyId_name_key" ON "grades"("companyId", "name");

-- CreateIndex
CREATE INDEX "cost_centers_companyId_idx" ON "cost_centers"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_companyId_code_key" ON "cost_centers"("companyId", "code");

-- CreateIndex
CREATE INDEX "employee_education_companyId_employeeId_idx" ON "employee_education"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "previous_employment_companyId_employeeId_idx" ON "previous_employment"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "emergency_contacts_companyId_employeeId_idx" ON "emergency_contacts"("companyId", "employeeId");

-- CreateIndex
CREATE INDEX "nominees_companyId_employeeId_idx" ON "nominees"("companyId", "employeeId");
