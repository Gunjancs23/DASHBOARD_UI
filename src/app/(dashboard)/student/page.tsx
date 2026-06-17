import Announcements from "@/components/Announcements";
import BigCalendarContainer from "@/components/BigCalendarContainer";
import EventCalendar from "@/components/EventCalendar";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

const StudentPage = async () => {
  const { userId } = await auth();

  const student = await prisma.student.findUnique({
    where: {
      id: userId!,
    },
    select: {
      id: true,
      class: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          schedules: true,
        },
      },
    },
  });

  return (
    <div className="p-4 flex gap-4 flex-col xl:flex-row">
      {/* LEFT */}
      <div className="w-full xl:w-2/3">
        <div
          className={`bg-white p-4 rounded-md ${
            student && student._count.schedules > 0 ? "h-[760px]" : "h-full"
          }`}
        >
          <h1 className="text-xl font-semibold">
            My Weekly Schedule{student?.class ? ` (${student.class.name})` : ""}
          </h1>
          {student ? (
            student._count.schedules > 0 ? (
              <BigCalendarContainer type="studentId" id={student.id} />
            ) : (
              <p className="mt-4 text-sm text-gray-400">
                Your weekly schedule has not been added yet.
              </p>
            )
          ) : (
            <p className="mt-4 text-sm text-gray-400">
              No student profile is linked to this login account yet.
            </p>
          )}
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full xl:w-1/3 flex flex-col gap-8">
        <EventCalendar />
        <Announcements />
      </div>
    </div>
  );
};

export default StudentPage;
