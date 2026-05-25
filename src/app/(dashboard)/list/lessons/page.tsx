import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableFilter from "@/components/TableFilter";
import TableSearch from "@/components/TableSearch";
import TableSort from "@/components/TableSort";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import {
  getNumberParam,
  getPageNumber,
  getSortDirection,
} from "@/lib/tableControls";
import { Class, Lesson, Prisma, Subject, Teacher } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

type LessonList = Lesson & {
  subject: Pick<Subject, "name">;
  class: Pick<Class, "name">;
  teacher: Pick<Teacher, "name" | "surname">;
};

const LessonListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;
  const { page, ...queryParams } = searchParams;

  const p = getPageNumber(page);
  const createLessonData =
    role === "admin"
      ? {
          ...(queryParams.teacherId ? { teacherId: queryParams.teacherId } : {}),
          ...(queryParams.classId ? { classId: Number(queryParams.classId) } : {}),
        }
      : undefined;

  const columns = [
    {
      header: "Subject Name",
      accessor: "name",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    },
    ...(role === "admin"
      ? [
          {
            header: "Actions",
            accessor: "action",
          },
        ]
      : []),
  ];

  const renderRow = (item: LessonList) => (
    <tr
      key={item.id}
      className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
    >
      <td className="flex items-center gap-4 p-4">{item.subject.name}</td>
      <td>{item.class.name}</td>
      <td className="hidden md:table-cell">
        {item.teacher.name + " " + item.teacher.surname}
      </td>
      {role === "admin" && (
        <td>
          <div className="flex items-center gap-2">
            <FormContainer table="lesson" type="update" data={item} />
            <FormContainer table="lesson" type="delete" id={item.id} />
          </div>
        </td>
      )}
    </tr>
  );

  // URL PARAMS CONDITION

  const query: Prisma.LessonWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            query.classId = getNumberParam(value);
            break;
          case "teacherId":
            query.teacherId = value;
            break;
          case "subjectId":
            query.subjectId = getNumberParam(value);
            break;
          case "day":
            if (
              value === "MONDAY" ||
              value === "TUESDAY" ||
              value === "WEDNESDAY" ||
              value === "THURSDAY" ||
              value === "FRIDAY"
            ) {
              query.day = value;
            }
            break;
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { subject: { name: { contains: value, mode: "insensitive" } } },
              { teacher: { name: { contains: value, mode: "insensitive" } } },
              { teacher: { surname: { contains: value, mode: "insensitive" } } },
              { class: { name: { contains: value, mode: "insensitive" } } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  if (role === "teacher") {
    query.teacherId = currentUserId!;
  }

  const sortDirection = getSortDirection(searchParams.order);
  const orderByOptions: Record<string, Prisma.LessonOrderByWithRelationInput> = {
    subject: { subject: { name: sortDirection } },
    class: { class: { name: sortDirection } },
    teacher: { teacher: { name: sortDirection } },
    day: { day: sortDirection },
    startTime: { startTime: sortDirection },
  };
  const orderBy =
    orderByOptions[searchParams.sort || "subject"] || orderByOptions.subject;

  const [data, count, classes, teachers, subjects] = await prisma.$transaction([
    prisma.lesson.findMany({
      where: query,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        teacher: { select: { name: true, surname: true } },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy,
    }),
    prisma.lesson.count({ where: query }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    }),
    prisma.subject.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const filterGroups = [
    {
      label: "Class",
      param: "classId",
      options: classes.map((classItem) => ({
        label: classItem.name,
        value: classItem.id.toString(),
      })),
    },
    {
      label: "Teacher",
      param: "teacherId",
      options: teachers.map((teacher) => ({
        label: `${teacher.name} ${teacher.surname}`,
        value: teacher.id,
      })),
    },
    {
      label: "Subject",
      param: "subjectId",
      options: subjects.map((subject) => ({
        label: subject.name,
        value: subject.id.toString(),
      })),
    },
    {
      label: "Day",
      param: "day",
      options: [
        { label: "Monday", value: "MONDAY" },
        { label: "Tuesday", value: "TUESDAY" },
        { label: "Wednesday", value: "WEDNESDAY" },
        { label: "Thursday", value: "THURSDAY" },
        { label: "Friday", value: "FRIDAY" },
      ],
    },
  ];

  const sortOptions = [
    { label: "Subject", value: "subject" },
    { label: "Class", value: "class" },
    { label: "Teacher", value: "teacher" },
    { label: "Day", value: "day" },
    { label: "Start Time", value: "startTime" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          {role === "teacher" ? "My Lessons" : "All Lessons"}
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <TableFilter filters={filterGroups} />
            <TableSort options={sortOptions} />
            {role === "admin" && (
              <FormContainer
                table="lesson"
                type="create"
                data={createLessonData}
              />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table columns={columns} renderRow={renderRow} data={data} />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default LessonListPage;
