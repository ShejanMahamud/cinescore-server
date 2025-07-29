-- CreateTable
CREATE TABLE "failedJob" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "jobData" JSONB,
    "error" TEXT NOT NULL,
    "attempts" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failedJob_pkey" PRIMARY KEY ("id")
);
