import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const TeacherPage = async () => {
  const { userId } = await auth();

  const teacher = await prisma.teacher.findUnique({
    where: {
      id: userId!,
    },
    select: {
      id: true,
      _count: {
        select: {
          schedules: true,
        },
      },
    },
  });

  return (
    <div className="flex-1 p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div
          className={`bg-white p-4 rounded-md ${
            teacher && teacher._count.schedules > 0 ? "h-[760px]" : "h-full"
          }`}
        >
          <h1 className="text-xl font-semibold">My Weekly Schedule</h1>
          {teacher ? (
            teacher._count.schedules > 0 ? (
              <BigCalendarContainer type="teacherScheduleId" id={teacher.id} />
            ) : (
              <p className="mt-4 text-sm text-gray-400">
                Your weekly schedule has not been added yet.
              </p>
            )
          ) : (
            <p className="mt-4 text-sm text-gray-400">
              No teacher profile is linked to this login account yet.
            </p>
          )}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <Announcements />
      </div>
    </div>
  );
};

export default TeacherPage;
