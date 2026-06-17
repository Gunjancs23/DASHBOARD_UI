CREATE TABLE "StudentScheduleItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "day" "Day" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "StudentScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentScheduleItem_studentId_idx" ON "StudentScheduleItem"("studentId");
CREATE INDEX "StudentScheduleItem_day_startTime_idx" ON "StudentScheduleItem"("day", "startTime");

ALTER TABLE "StudentScheduleItem" ADD CONSTRAINT "StudentScheduleItem_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
