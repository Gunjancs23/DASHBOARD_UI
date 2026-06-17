import BigCalendarContainer from "@/components/BigCalendarContainer";
import {
  createTeacherScheduleItem,
  deleteTeacherScheduleItem,
  updateTeacherScheduleItem,
} from "@/lib/actions";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { Day } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

const days: { label: string; value: Day }[] = [
  { label: "Monday", value: "MONDAY" },
  { label: "Tuesday", value: "TUESDAY" },
  { label: "Wednesday", value: "WEDNESDAY" },
  { label: "Thursday", value: "THURSDAY" },
  { label: "Friday", value: "FRIDAY" },
];

const dayLabels = Object.fromEntries(
  days.map((day) => [day.value, day.label])
) as Record<Day, string>;

const formatTime = (date: Date) => date.toTimeString().slice(0, 5);

const timeLabel = (date: Date) =>
  date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

const DaySelect = ({ defaultValue }: { defaultValue?: Day }) => (
  <select
    className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
    name="day"
    defaultValue={defaultValue || "MONDAY"}
  >
    {days.map((day) => (
      <option value={day.value} key={day.value}>
        {day.label}
      </option>
    ))}
  </select>
);

const SchedulePage = async ({
  params: { id },
}: {
  params: { id: string };
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin") {
    return notFound();
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      surname: true,
      schedules: {
        orderBy: [{ day: "asc" }, { startTime: "asc" }],
      },
    },
  });

  if (!teacher) {
    return notFound();
  }

  return (
    <div className="flex-1 p-4 flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link
            href={`/list/teachers/${teacher.id}`}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Back to teacher
          </Link>
          <h1 className="text-xl font-semibold">
            Manage Schedule - {teacher.name} {teacher.surname}
          </h1>
          <p className="text-sm text-gray-500">
            Weekly schedule for this teacher&apos;s login homepage
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {teacher.schedules.length} schedule items
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <div className="bg-white p-4 rounded-md h-[760px]">
          <div className="mb-4 flex items-center gap-2">
            <Image src="/calendar.png" alt="" width={20} height={20} />
            <h2 className="text-lg font-semibold">Weekly Preview</h2>
          </div>
          <BigCalendarContainer type="teacherScheduleId" id={teacher.id} />
        </div>

        <div className="bg-white p-4 rounded-md">
          <h2 className="text-lg font-semibold">Add Schedule Item</h2>
          <form
            action={createTeacherScheduleItem}
            className="mt-4 grid grid-cols-1 gap-3"
          >
            <input type="hidden" name="teacherId" value={teacher.id} />
            <input
              className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
              name="title"
              placeholder="Title"
              required
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <DaySelect />
              <input
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                name="startTime"
                type="time"
                required
              />
              <input
                className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                name="endTime"
                type="time"
                required
              />
            </div>
            <button className="rounded-md bg-lamaYellow px-4 py-2 text-sm font-medium text-gray-700 hover:brightness-95">
              Add to Schedule
            </button>
          </form>

          <div className="mt-6">
            <h2 className="text-lg font-semibold">Schedule Items</h2>
            <div className="mt-4 flex flex-col gap-3">
              {teacher.schedules.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No weekly schedule items have been added for this teacher yet.
                </p>
              ) : (
                teacher.schedules.map((item) => (
                  <div
                    className="rounded-md border border-gray-200 p-3"
                    key={item.id}
                  >
                    <div className="mb-3">
                      <h3 className="font-medium">{item.title}</h3>
                      <p className="text-sm text-gray-500">
                        {dayLabels[item.day]} &middot; {timeLabel(item.startTime)} -{" "}
                        {timeLabel(item.endTime)}
                      </p>
                    </div>

                    <form
                      action={updateTeacherScheduleItem}
                      className="grid grid-cols-1 gap-3"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="teacherId"
                        value={teacher.id}
                      />
                      <input
                        className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                        name="title"
                        defaultValue={item.title}
                        required
                      />
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <DaySelect defaultValue={item.day} />
                        <input
                          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                          name="startTime"
                          type="time"
                          defaultValue={formatTime(item.startTime)}
                          required
                        />
                        <input
                          className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm"
                          name="endTime"
                          type="time"
                          defaultValue={formatTime(item.endTime)}
                          required
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="rounded-md bg-lamaSky px-4 py-2 text-sm font-medium text-gray-700 hover:brightness-95">
                          Update
                        </button>
                        <button
                          form={`delete-teacher-schedule-item-${item.id}`}
                          className="rounded-md bg-lamaPurple px-4 py-2 text-sm font-medium text-gray-700 hover:brightness-95"
                        >
                          Delete
                        </button>
                      </div>
                    </form>
                    <form
                      id={`delete-teacher-schedule-item-${item.id}`}
                      action={deleteTeacherScheduleItem}
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <input
                        type="hidden"
                        name="teacherId"
                        value={teacher.id}
                      />
                    </form>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchedulePage;
