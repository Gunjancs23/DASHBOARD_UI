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
import { Parent, Prisma, Student } from "@prisma/client";

import { auth } from "@clerk/nextjs/server";

type ParentList = Parent & { students: Student[] };

const ParentListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {

const { sessionClaims } = await auth();
const role = (sessionClaims?.metadata as { role?: string })?.role;


const columns = [
  {
    header: "Info",
    accessor: "info",
  },
  {
    header: "Student Names",
    accessor: "students",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
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

const renderRow = (item: ParentList) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 even:bg-slate-50 text-sm hover:bg-lamaPurpleLight"
  >
    <td className="flex items-center gap-4 p-4">
      <div className="flex flex-col">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-xs text-gray-500">{item?.email}</p>
      </div>
    </td>
    <td className="hidden md:table-cell">
      {item.students.map((student) => student.name).join(",")}
    </td>
    <td className="hidden md:table-cell">{item.phone}</td>
    <td className="hidden md:table-cell">{item.address}</td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="parent" type="update" data={item} />
            <FormContainer table="parent" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

  const { page, ...queryParams } = searchParams;

  const p = getPageNumber(page);

  // URL PARAMS CONDITION

  const queryAnd: Prisma.ParentWhereInput[] = [];

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId": {
            const classId = getNumberParam(value);
            if (classId) {
              queryAnd.push({
                students: {
                  some: {
                    classId,
                  },
                },
              });
            }
            break;
          }
          case "gradeId": {
            const gradeId = getNumberParam(value);
            if (gradeId) {
              queryAnd.push({
                students: {
                  some: {
                    gradeId,
                  },
                },
              });
            }
            break;
          }
          case "search":
            queryAnd.push({
              OR: [
              { name: { contains: value, mode: "insensitive" } },
              { username: { contains: value, mode: "insensitive" } },
              { email: { contains: value, mode: "insensitive" } },
              { phone: { contains: value, mode: "insensitive" } },
              { address: { contains: value, mode: "insensitive" } },
              { students: { some: { name: { contains: value, mode: "insensitive" } } } },
              { students: { some: { surname: { contains: value, mode: "insensitive" } } } },
            ],
            });
            break;
          default:
            break;
        }
      }
    }
  }

  const query: Prisma.ParentWhereInput = queryAnd.length
    ? { AND: queryAnd }
    : {};

  const sortDirection = getSortDirection(searchParams.order);
  const orderByOptions: Record<string, Prisma.ParentOrderByWithRelationInput> = {
    name: { name: sortDirection },
    parentId: { username: sortDirection },
    createdAt: { createdAt: sortDirection },
  };
  const orderBy = orderByOptions[searchParams.sort || "name"] || orderByOptions.name;

  const [data, count, classes, grades] = await prisma.$transaction([
    prisma.parent.findMany({
      where: query,
      include: {
        students: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy,
    }),
    prisma.parent.count({ where: query }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.grade.findMany({
      select: { id: true, level: true },
      orderBy: { level: "asc" },
    }),
  ]);

  const filterGroups = [
    {
      label: "Student Class",
      param: "classId",
      options: classes.map((classItem) => ({
        label: classItem.name,
        value: classItem.id.toString(),
      })),
    },
    {
      label: "Student Grade",
      param: "gradeId",
      options: grades.map((grade) => ({
        label: `Grade ${grade.level}`,
        value: grade.id.toString(),
      })),
    },
  ];

  const sortOptions = [
    { label: "Name", value: "name" },
    { label: "Parent ID", value: "parentId" },
    { label: "Newest", value: "createdAt" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">All Parents</h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <TableFilter filters={filterGroups} />
            <TableSort options={sortOptions} />
            {role === "admin" && <FormContainer table="parent" type="create" />}
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

export default ParentListPage;
