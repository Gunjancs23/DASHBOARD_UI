CREATE TABLE "TeacherScheduleItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "day" "Day" NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "TeacherScheduleItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TeacherScheduleItem_teacherId_idx" ON "TeacherScheduleItem"("teacherId");
CREATE INDEX "TeacherScheduleItem_day_startTime_idx" ON "TeacherScheduleItem"("day", "startTime");

ALTER TABLE "TeacherScheduleItem" ADD CONSTRAINT "TeacherScheduleItem_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
