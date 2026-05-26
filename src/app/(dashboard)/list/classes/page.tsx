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
import { Class, Grade, Prisma, Teacher } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";

type ClassList = Class & { supervisor: Teacher | null; grade: Grade };

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

const { sessionClaims } = await auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;


const columns = [
  {
    header: "Class Name",
    accessor: "name",
  },
  {
    header: "Capacity",
    accessor: "capacity",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Supervisor",
    accessor: "supervisor",
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

const renderRow = (item: ClassList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">{item.name}</td>
    <td className="hidden md:table-cell">{item.capacity}</td>
    <td className="hidden md:table-cell">{item.grade.level}</td>
    <td className="hidden md:table-cell">
      {item.supervisor
        ? item.supervisor.name + " " + item.supervisor.surname
        : "N/A"}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="class" type="update" data={item} />
            <FormContainer table="class" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

  const { page, ...queryParams } = searchParams;

  const p = getPageNumber(page);

  const query: Prisma.ClassWhereInput = {};

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "supervisorId":
            query.supervisorId = value;
            break;
          case "gradeId":
            query.gradeId = getNumberParam(value);
            break;
          case "search":
            query.OR = [
              { name: { contains: value, mode: "insensitive" } },
              { supervisor: { name: { contains: value, mode: "insensitive" } } },
              { supervisor: { surname: { contains: value, mode: "insensitive" } } },
            ];
            break;
          default:
            break;
        }
      }
    }
  }

  const sortDirection = getSortDirection(searchParams.order);
  const orderByOptions: Record<string, Prisma.ClassOrderByWithRelationInput> = {
    name: { name: sortDirection },
    capacity: { capacity: sortDirection },
    grade: { grade: { level: sortDirection } },
  };
  const orderBy = orderByOptions[searchParams.sort || "name"] || orderByOptions.name;

  const [data, count, teachers, grades] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      include: {
        supervisor: true,
        grade: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy,
    }),
    prisma.class.count({ where: query }),
    prisma.teacher.findMany({
      select: { id: true, name: true, surname: true },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
  ]);

  const filterGroups = [
    {
      label: "Supervisor",
      param: "supervisorId",
      options: teachers.map((teacher) => ({
        label: `${teacher.name} ${teacher.surname}`,
        value: teacher.id,
      })),
    },
    {
      label: "Grade",
      param: "gradeId",
      options: grades.map((grade) => ({
        label: `Grade ${grade.level}`,
        value: grade.id.toString(),
      })),
    },
  ];

  const sortOptions = [
    { label: "Name", value: "name" },
    { label: "Capacity", value: "capacity" },
    { label: "Grade", value: "grade" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Classes</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <TableFilter filters={filterGroups} />
            <TableSort options={sortOptions} />
            {role === "admin" && <FormContainer table="class" type="create" />}
          </div>
        </div>
      </div>
      <Table columns={columns} renderRow={renderRow} data={data} />
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ClassListPage;
