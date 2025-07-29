/*
  Warnings:

  - You are about to drop the `failedJob` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "failedJob";

-- CreateTable
CREATE TABLE "failed_jobs" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "error" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "failed_jobs_pkey" PRIMARY KEY ("id")
);
