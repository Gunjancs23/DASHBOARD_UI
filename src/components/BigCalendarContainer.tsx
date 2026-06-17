import prisma from "@/lib/prisma";
import BigCalendar from "./BigCalender";
import { adjustScheduleToCurrentWeek } from "@/lib/utils";

const BigCalendarContainer = async ({
  type,
  id,
}: {
  type: "teacherId" | "classId" | "studentId" | "teacherScheduleId";
  id: string | number;
}) => {
  if (type === "teacherScheduleId") {
    const dataRes = await prisma.teacherScheduleItem.findMany({
      where: {
        teacherId: id as string,
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    const data = dataRes.map((item) => ({
      title: item.title,
      day: item.day,
      start: item.startTime,
      end: item.endTime,
    }));

    return (
      <div className="">
        <BigCalendar data={adjustScheduleToCurrentWeek(data)} />
      </div>
    );
  }

  if (type === "studentId") {
    const dataRes = await prisma.studentScheduleItem.findMany({
      where: {
        studentId: id as string,
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });

    const data = dataRes.map((item) => ({
      title: item.title,
      day: item.day,
      start: item.startTime,
      end: item.endTime,
    }));

    return (
      <div className="">
        <BigCalendar data={adjustScheduleToCurrentWeek(data)} />
      </div>
    );
  }

  const dataRes = await prisma.lesson.findMany({
    where: {
      ...(type === "teacherId"
        ? { teacherId: id as string }
        : { classId: id as number }),
    },
    include: {
      subject: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });

  const data = dataRes.map((lesson) => ({
    title: lesson.subject.name,
    day: lesson.day,
    start: lesson.startTime,
    end: lesson.endTime,
  }));

  const schedule = adjustScheduleToCurrentWeek(data);

  return (
    <div className="">
      <BigCalendar data={schedule} />
    </div>
  );
};

export default BigCalendarContainer;
