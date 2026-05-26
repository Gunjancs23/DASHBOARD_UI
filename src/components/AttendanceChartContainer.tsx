import Image from "next/image";
import prisma from "@/lib/prisma";
import AttendanceChart from "./AttendenceChart";

const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;

type AttendanceChartRecord = {
  date: Date;
  present: boolean;
};

const getWeekStart = (date: Date) => {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);

  const dayOfWeek = weekStart.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(weekStart.getDate() - daysSinceMonday);

  return weekStart;
};

const getWeekEnd = (weekStart: Date) => {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return weekEnd;
};

const getWeeklyAttendance = async (weekStart: Date) => {
  return prisma.attendance.findMany({
    where: {
      date: {
        gte: weekStart,
        lt: getWeekEnd(weekStart),
      },
    },
    select: {
      date: true,
      present: true,
    },
  });
};

const buildChartData = (attendance: AttendanceChartRecord[]) => {
  const attendanceMap: Record<
    (typeof daysOfWeek)[number],
    { present: number; absent: number }
  > = {
    Mon: { present: 0, absent: 0 },
    Tue: { present: 0, absent: 0 },
    Wed: { present: 0, absent: 0 },
    Thu: { present: 0, absent: 0 },
    Fri: { present: 0, absent: 0 },
  };

  attendance.forEach((item) => {
    const dayOfWeek = item.date.getDay();

    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      const dayName = daysOfWeek[dayOfWeek - 1];

      if (item.present) {
        attendanceMap[dayName].present += 1;
      } else {
        attendanceMap[dayName].absent += 1;
      }
    }
  });

  return daysOfWeek.map((day) => ({
    name: day,
    present: attendanceMap[day].present,
    absent: attendanceMap[day].absent,
  }));
};

const AttendanceChartContainer = async () => {
  const currentWeekStart = getWeekStart(new Date());
  let resData = await getWeeklyAttendance(currentWeekStart);

  if (resData.length === 0) {
    const latestAttendance = await prisma.attendance.findFirst({
      select: {
        date: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    if (latestAttendance) {
      resData = await getWeeklyAttendance(getWeekStart(latestAttendance.date));
    }
  }

  const data = buildChartData(resData);

  return (
    <div className="bg-white rounded-lg p-4 h-full">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-semibold">Attendance</h1>
        <Image src="/moreDark.png" alt="" width={20} height={20} />
      </div>
      <AttendanceChart data={data} />
    </div>
  );
};

export default AttendanceChartContainer;
