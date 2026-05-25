import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { setAttendanceStatus } from "@/lib/actions";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";

const formatDateInputValue = (date: Date) => date.toISOString().slice(0, 10);

const getSafeDateValue = (date?: string) => {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return formatDateInputValue(new Date());
};

const getOptionalDateValue = (date?: string) => {
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  return "";
};

const getPage = (page?: string) => {
  const parsedPage = page ? parseInt(page) : 1;
  return Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
};

const getDayRange = (dateValue: string) => {
  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
};

type AttendanceStudent = {
  id: string;
  username: string;
  name: string;
  surname: string;
  img: string | null;
};

type AttendanceRow = AttendanceStudent & {
  status: boolean | null;
};

type AttendanceRecordRow = {
  id: number;
  date: Date;
  present: boolean;
  student: AttendanceStudent;
  lesson: {
    subject: { name: string };
    class: { name: string };
    teacher: { name: string; surname: string };
  };
};

const getStatusStyles = (status: boolean | null) => {
  if (status === true) {
    return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  }

  if (status === false) {
    return "bg-rose-50 text-rose-600 ring-rose-100";
  }

  return "bg-slate-100 text-slate-500 ring-slate-200";
};

const getStatusLabel = (status: boolean | null) => {
  if (status === true) return "Present";
  if (status === false) return "Absent";
  return "Unmarked";
};

const StaffAttendancePage = async ({
  searchParams,
  userId,
  role,
}: {
  searchParams: { [key: string]: string | undefined };
  userId: string;
  role: string;
}) => {
  const dateValue = getSafeDateValue(searchParams.date);
  const selectedLessonId = searchParams.lessonId
    ? Number(searchParams.lessonId)
    : undefined;
  const search = searchParams.search?.trim().toLowerCase() || "";
  const p = getPage(searchParams.page);

  const lessonWhere = role === "teacher" ? { teacherId: userId } : {};

  const lessons = await prisma.lesson.findMany({
    where: lessonWhere,
    include: {
      subject: { select: { name: true } },
      teacher: { select: { name: true, surname: true } },
      class: {
        select: {
          id: true,
          name: true,
          students: {
            select: {
              id: true,
              username: true,
              name: true,
              surname: true,
              img: true,
            },
            orderBy: [{ name: "asc" }, { surname: "asc" }],
          },
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const activeLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) || lessons[0];

  const { start, end } = getDayRange(dateValue);

  const attendanceRecords = activeLesson
    ? await prisma.attendance.findMany({
        where: {
          lessonId: activeLesson.id,
          date: {
            gte: start,
            lt: end,
          },
        },
        orderBy: {
          id: "asc",
        },
      })
    : [];

  const attendanceByStudent = new Map(
    attendanceRecords.map((record) => [record.studentId, record.present])
  );

  const classStudents = activeLesson?.class.students || [];

  const rows: AttendanceRow[] = classStudents
    .filter((student) => {
      if (!search) return true;

      const searchable =
        `${student.name} ${student.surname} ${student.username}`.toLowerCase();
      return searchable.includes(search);
    })
    .map((student) => ({
      ...student,
      status: attendanceByStudent.has(student.id)
        ? attendanceByStudent.get(student.id)!
        : null,
    }));
  const paginatedRows = rows.slice(ITEM_PER_PAGE * (p - 1), ITEM_PER_PAGE * p);

  const presentCount = classStudents.filter(
    (student) => attendanceByStudent.get(student.id) === true
  ).length;
  const absentCount = classStudents.filter(
    (student) => attendanceByStudent.get(student.id) === false
  ).length;
  const unmarkedCount = classStudents.length - presentCount - absentCount;
  const attendanceRate = classStudents.length
    ? Math.round((presentCount / classStudents.length) * 100)
    : 0;

  const columns = [
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Student ID",
      accessor: "studentId",
      className: "hidden md:table-cell",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
    },
    {
      header: "Mark Attendance",
      accessor: "action",
    },
  ];

  const buildLessonHref = (lessonId: number) => {
    const params = new URLSearchParams();
    params.set("lessonId", lessonId.toString());
    params.set("date", dateValue);
    if (searchParams.search) params.set("search", searchParams.search);

    return `/list/attendance?${params.toString()}`;
  };

  const renderRow = (item: AttendanceRow) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.img || "/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">{`${item.name} ${item.surname}`}</h3>
          <p className="text-xs text-gray-500">
            {activeLesson
              ? `${activeLesson.subject.name} - ${activeLesson.teacher.name} ${activeLesson.teacher.surname}`
              : "No lesson"}
          </p>
        </div>
      </td>
      <td className="hidden md:table-cell">{item.username}</td>
      <td className="hidden md:table-cell">{activeLesson?.class.name}</td>
      <td>
        <span
          className={`inline-flex h-8 min-w-24 items-center justify-center rounded-full px-3 text-xs font-semibold ring-1 ${getStatusStyles(
            item.status
          )}`}
        >
          {getStatusLabel(item.status)}
        </span>
      </td>
      <td>
        {activeLesson && (
          <form action={setAttendanceStatus} className="flex items-center gap-2">
            <input type="hidden" name="studentId" value={item.id} />
            <input type="hidden" name="lessonId" value={activeLesson.id} />
            <input type="hidden" name="date" value={dateValue} />
            <button
              type="submit"
              name="present"
              value="true"
              className={`h-8 w-20 rounded-md text-xs font-semibold ${
                item.status === true
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Present
            </button>
            <button
              type="submit"
              name="present"
              value="false"
              className={`h-8 w-20 rounded-md text-xs font-semibold ${
                item.status === false
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-600 hover:bg-rose-100"
              }`}
            >
              Absent
            </button>
          </form>
        )}
      </td>
    </tr>
  );

  return (
    <div className="m-4 mt-0 flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Present</span>
          <div className="mt-2 text-2xl font-semibold">{presentCount}</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Absent</span>
          <div className="mt-2 text-2xl font-semibold">{absentCount}</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Unmarked</span>
          <div className="mt-2 text-2xl font-semibold">{unmarkedCount}</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Rate</span>
          <div className="mt-2 text-2xl font-semibold">{attendanceRate}%</div>
        </div>
      </div>

      <div className="rounded-md bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {role === "teacher" ? "My Student Attendance" : "Student Attendance"}
            </h1>
            <p className="text-sm text-gray-500">
              {activeLesson
                ? `${activeLesson.class.name} - ${activeLesson.subject.name} - ${dateValue}`
                : "No lessons available"}
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <TableSearch />
            <form method="GET" className="flex flex-wrap items-center gap-2">
              <select
                name="lessonId"
                defaultValue={activeLesson?.id}
                className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 text-sm outline-none md:w-56"
              >
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.class.name} - {lesson.subject.name}
                  </option>
                ))}
              </select>
              <input
                type="date"
                name="date"
                defaultValue={dateValue}
                className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none"
              />
              {searchParams.search && (
                <input type="hidden" name="search" value={searchParams.search} />
              )}
              <button className="h-9 rounded-md bg-lamaYellow px-4 text-sm font-semibold">
                Apply
              </button>
            </form>
          </div>
        </div>

        {lessons.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {lessons.slice(0, 8).map((lesson) => (
              <Link
                href={buildLessonHref(lesson.id)}
                key={lesson.id}
                className={`flex h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium ${
                  lesson.id === activeLesson?.id
                    ? "bg-lamaPurple text-black"
                    : "bg-lamaSkyLight text-gray-600 hover:bg-lamaSky"
                }`}
              >
                {lesson.class.name} {lesson.subject.name}
              </Link>
            ))}
          </div>
        )}

        {activeLesson ? (
          <>
            <Table columns={columns} renderRow={renderRow} data={paginatedRows} />
            <Pagination page={p} count={rows.length} />
          </>
        ) : (
          <div className="mt-6 rounded-md bg-slate-50 p-6 text-center text-sm text-gray-500">
            No attendance roster found.
          </div>
        )}
      </div>
    </div>
  );
};

const ViewerAttendancePage = async ({
  searchParams,
  userId,
  role,
}: {
  searchParams: { [key: string]: string | undefined };
  userId: string;
  role: string;
}) => {
  const dateValue = getOptionalDateValue(searchParams.date);
  const search = searchParams.search?.trim() || "";
  const p = getPage(searchParams.page);

  const baseQuery: Prisma.AttendanceWhereInput =
    role === "student"
      ? { studentId: userId }
      : { student: { parentId: userId } };

  if (dateValue) {
    const { start, end } = getDayRange(dateValue);
    baseQuery.date = {
      gte: start,
      lt: end,
    };
  }

  const query: Prisma.AttendanceWhereInput = { ...baseQuery };

  if (search) {
    query.OR = [
      { student: { name: { contains: search, mode: "insensitive" } } },
      { student: { surname: { contains: search, mode: "insensitive" } } },
      { student: { username: { contains: search, mode: "insensitive" } } },
      { lesson: { subject: { name: { contains: search, mode: "insensitive" } } } },
      { lesson: { class: { name: { contains: search, mode: "insensitive" } } } },
      { lesson: { teacher: { name: { contains: search, mode: "insensitive" } } } },
      { lesson: { teacher: { surname: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [data, count, presentCount, absentCount, childCount] =
    await prisma.$transaction([
      prisma.attendance.findMany({
        where: query,
        include: {
          student: {
            select: {
              id: true,
              username: true,
              name: true,
              surname: true,
              img: true,
            },
          },
          lesson: {
            select: {
              subject: { select: { name: true } },
              class: { select: { name: true } },
              teacher: { select: { name: true, surname: true } },
            },
          },
        },
        take: ITEM_PER_PAGE,
        skip: ITEM_PER_PAGE * (p - 1),
        orderBy: {
          date: "desc",
        },
      }),
      prisma.attendance.count({ where: query }),
      prisma.attendance.count({ where: { ...baseQuery, present: true } }),
      prisma.attendance.count({ where: { ...baseQuery, present: false } }),
      role === "parent"
        ? prisma.student.count({ where: { parentId: userId } })
        : prisma.student.count({ where: { id: userId } }),
    ]);

  const totalForRate = presentCount + absentCount;
  const attendanceRate = totalForRate
    ? Math.round((presentCount / totalForRate) * 100)
    : 0;

  const clearDateParams = new URLSearchParams();
  if (searchParams.search) clearDateParams.set("search", searchParams.search);
  const clearDateHref = `/list/attendance${
    clearDateParams.toString() ? `?${clearDateParams.toString()}` : ""
  }`;

  const columns = [
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Subject",
      accessor: "subject",
    },
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden lg:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Status",
      accessor: "status",
    },
  ];

  const renderRow = (item: AttendanceRecordRow) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">
        <Image
          src={item.student.img || "/noAvatar.png"}
          alt=""
          width={40}
          height={40}
          className="md:hidden xl:block w-10 h-10 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold">
            {item.student.name} {item.student.surname}
          </h3>
          <p className="text-xs text-gray-500">{item.student.username}</p>
        </div>
      </td>
      <td>{item.lesson.subject.name}</td>
      <td className="hidden md:table-cell">{item.lesson.class.name}</td>
      <td className="hidden lg:table-cell">
        {item.lesson.teacher.name} {item.lesson.teacher.surname}
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.date)}
      </td>
      <td>
        <span
          className={`inline-flex h-8 min-w-24 items-center justify-center rounded-full px-3 text-xs font-semibold ring-1 ${getStatusStyles(
            item.present
          )}`}
        >
          {getStatusLabel(item.present)}
        </span>
      </td>
    </tr>
  );

  return (
    <div className="m-4 mt-0 flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Present</span>
          <div className="mt-2 text-2xl font-semibold">{presentCount}</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Absent</span>
          <div className="mt-2 text-2xl font-semibold">{absentCount}</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Rate</span>
          <div className="mt-2 text-2xl font-semibold">{attendanceRate}%</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">
            {role === "parent" ? "Children" : "Records"}
          </span>
          <div className="mt-2 text-2xl font-semibold">
            {role === "parent" ? childCount : count}
          </div>
        </div>
      </div>

      <div className="rounded-md bg-white p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h1 className="text-lg font-semibold">
              {role === "parent" ? "Children Attendance" : "My Attendance"}
            </h1>
            <p className="text-sm text-gray-500">
              {dateValue ? `Filtered by ${dateValue}` : "All attendance records"}
            </p>
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <TableSearch />
            <form method="GET" className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                name="date"
                defaultValue={dateValue}
                className="h-9 rounded-md border border-gray-200 px-3 text-sm outline-none"
              />
              {searchParams.search && (
                <input type="hidden" name="search" value={searchParams.search} />
              )}
              <button className="h-9 rounded-md bg-lamaYellow px-4 text-sm font-semibold">
                Apply
              </button>
              {dateValue && (
                <Link
                  href={clearDateHref}
                  className="flex h-9 items-center rounded-md bg-slate-100 px-4 text-sm font-semibold text-gray-600"
                >
                  Clear
                </Link>
              )}
            </form>
          </div>
        </div>

        {data.length > 0 ? (
          <>
            <Table
              columns={columns}
              renderRow={renderRow}
              data={data as AttendanceRecordRow[]}
            />
            <Pagination page={p} count={count} />
          </>
        ) : (
          <div className="mt-6 rounded-md bg-slate-50 p-6 text-center text-sm text-gray-500">
            No attendance records found.
          </div>
        )}
      </div>
    </div>
  );
};

const AttendanceListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !role) {
    return null;
  }

  if (role === "student" || role === "parent") {
    return (
      <ViewerAttendancePage
        searchParams={searchParams}
        userId={userId}
        role={role}
      />
    );
  }

  return (
    <StaffAttendancePage searchParams={searchParams} userId={userId} role={role} />
  );
};

export default AttendanceListPage;
