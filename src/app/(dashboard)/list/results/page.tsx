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
import { Prisma } from "@prisma/client";

import { auth } from "@clerk/nextjs/server";

type ResultList = {
  id: number;
  title: string;
  studentId: string;
  studentName: string;
  studentSurname: string;
  teacherName: string;
  teacherSurname: string;
  score: number;
  className: string;
  startTime: Date;
  examId: number | null;
  assignmentId: number | null;
  assessmentId: string;
};


const ResultListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

const { userId, sessionClaims } =await auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;
const currentUserId = userId;


const columns = [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Student",
    accessor: "student",
  },
  {
    header: "Score",
    accessor: "score",
    className: "hidden md:table-cell",
  },
  {
    header: "Teacher",
    accessor: "teacher",
    className: "hidden md:table-cell",
  },
  {
    header: "Class",
    accessor: "class",
    className: "hidden md:table-cell",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  ...(role === "admin" || role === "teacher"
    ? [
        {
          header: "Actions",
          accessor: "action",
        },
      ]
    : []),
];

const renderRow = (item: ResultList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.title}</td>
    <td>{item.studentName + " " + item.studentSurname}</td>
    <td className="hidden md:table-cell">{item.score}</td>
    <td className="hidden md:table-cell">
      {item.teacherName + " " + item.teacherSurname}
    </td>
    <td className="hidden md:table-cell">{item.className}</td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US").format(item.startTime)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {(role === "admin" || role === "teacher") && (
          <>
            <FormContainer table="result" type="update" data={item} />
            <FormContainer table="result" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

  const { page, ...queryParams } = searchParams;

  const p = getPageNumber(page);

  // URL PARAMS CONDITION

  const queryAnd: Prisma.ResultWhereInput[] = [];

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "studentId":
            queryAnd.push({ studentId: value });
            break;
          case "classId": {
            const classId = getNumberParam(value);
            if (classId) {
              queryAnd.push({
                OR: [
                  { exam: { lesson: { classId } } },
                  { assignment: { lesson: { classId } } },
                ],
              });
            }
            break;
          }
          case "teacherId":
            queryAnd.push({
              OR: [
                { exam: { lesson: { teacherId: value } } },
                { assignment: { lesson: { teacherId: value } } },
              ],
            });
            break;
          case "type":
            if (value === "exam") {
              queryAnd.push({ examId: { not: null } });
            }
            if (value === "assignment") {
              queryAnd.push({ assignmentId: { not: null } });
            }
            break;
          case "search":
            queryAnd.push({
              OR: [
              { exam: { title: { contains: value, mode: "insensitive" } } },
              { assignment: { title: { contains: value, mode: "insensitive" } } },
              { student: { name: { contains: value, mode: "insensitive" } } },
              { student: { surname: { contains: value, mode: "insensitive" } } },
              { student: { username: { contains: value, mode: "insensitive" } } },
              { exam: { lesson: { subject: { name: { contains: value, mode: "insensitive" } } } } },
              { assignment: { lesson: { subject: { name: { contains: value, mode: "insensitive" } } } } },
            ],
            });
            break;
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS

  switch (role) {
    case "admin":
      break;
    case "teacher":
      queryAnd.push({
        OR: [
        { exam: { lesson: { teacherId: currentUserId! } } },
        { assignment: { lesson: { teacherId: currentUserId! } } },
      ],
      });
      break;

    case "student":
      queryAnd.push({ studentId: currentUserId! });
      break;

    case "parent":
      queryAnd.push({ student: { parentId: currentUserId! } });
      break;
    default:
      break;
  }

  const query: Prisma.ResultWhereInput = queryAnd.length
    ? { AND: queryAnd }
    : {};

  const sortDirection = searchParams.order
    ? getSortDirection(searchParams.order)
    : "desc";
  const orderByOptions: Record<string, Prisma.ResultOrderByWithRelationInput> = {
    id: { id: sortDirection },
    score: { score: sortDirection },
    student: { student: { name: sortDirection } },
  };
  const orderBy = orderByOptions[searchParams.sort || "id"] || orderByOptions.id;

  const [dataRes, count, students, classes, teachers] = await prisma.$transaction([
    prisma.result.findMany({
      where: query,
      include: {
        student: { select: { name: true, surname: true } },
        exam: {
          include: {
            lesson: {
              select: {
                class: { select: { name: true } },
                teacher: { select: { name: true, surname: true } },
              },
            },
          },
        },
        assignment: {
          include: {
            lesson: {
              select: {
                class: { select: { name: true } },
                teacher: { select: { name: true, surname: true } },
              },
            },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy,
    }),
    prisma.result.count({ where: query }),
    prisma.student.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const filterGroups = [
    {
      label: "Student",
      param: "studentId",
      options: students.map((student) => ({
        label: `${student.name} ${student.surname}`,
        value: student.id,
      })),
    },
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
      label: "Type",
      param: "type",
      options: [
        { label: "Exam", value: "exam" },
        { label: "Assignment", value: "assignment" },
      ],
    },
  ];

  const sortOptions = [
    { label: "Recent", value: "id" },
    { label: "Score", value: "score" },
    { label: "Student", value: "student" },
  ];

  const data = dataRes.map((item) => {
    const assessment = item.exam || item.assignment;

    if (!assessment) return null;

    const isExam = "startTime" in assessment;

    return {
      id: item.id,
      title: assessment.title,
      studentName: item.student.name,
      studentSurname: item.student.surname,
      teacherName: assessment.lesson.teacher.name,
      teacherSurname: assessment.lesson.teacher.surname,
      score: item.score,
      studentId: item.studentId,
      className: assessment.lesson.class.name,
      startTime: isExam ? assessment.startTime : assessment.startDate,
      examId: item.examId,
      assignmentId: item.assignmentId,
      assessmentId: item.examId
        ? `exam:${item.examId}`
        : `assignment:${item.assignmentId}`,
    };
  }).filter((item): item is ResultList => item !== null);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Results</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <TableFilter filters={filterGroups} />
            <TableSort options={sortOptions} defaultOrder="desc" />
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="result" type="create" />
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

export default ResultListPage;
