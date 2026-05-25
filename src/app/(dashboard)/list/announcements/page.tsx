import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableFilter from "@/components/TableFilter";
import TableSearch from "@/components/TableSearch";
import TableSort from "@/components/TableSort";
import {
  markAllAnnouncementsAsRead,
  markAnnouncementAsRead,
} from "@/lib/actions";
import {
  getAnnouncementAudienceWhere,
  getReadAnnouncementIds,
  getUnreadAnnouncementCount,
} from "@/lib/announcements";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import {
  getNumberParam,
  getPageNumber,
  getSortDirection,
} from "@/lib/tableControls";
import { Announcement, Class, Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";


type AnnouncementList = Announcement & { class: Class | null; isRead: boolean };
const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;
  const currentUserId = userId;
  
  const columns = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Class",
      accessor: "class",
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
    {
      header: "Actions",
      accessor: "action",
    },
  ];
  
  const renderRow = (item: AnnouncementList) => (
    <tr
      key={item.id}
      className={`border-b border-gray-200 text-sm hover:bg-lamaPurpleLight ${
        item.isRead ? "even:bg-slate-50" : "bg-lamaSkyLight"
      }`}
    >
      <td className="flex items-center gap-4 p-4">
        <div className="flex flex-col">
          <span className="font-semibold">{item.title}</span>
          <span className="text-xs text-gray-500">{item.description}</span>
        </div>
      </td>
      <td>{item.class?.name || "-"}</td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.date)}
      </td>
      <td>
        <span
          className={`inline-flex h-8 min-w-20 items-center justify-center rounded-full px-3 text-xs font-semibold ring-1 ${
            item.isRead
              ? "bg-slate-100 text-slate-500 ring-slate-200"
              : "bg-purple-50 text-purple-600 ring-purple-100"
          }`}
        >
          {item.isRead ? "Read" : "Unread"}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-2">
          {!item.isRead && (
            <form action={markAnnouncementAsRead}>
              <input type="hidden" name="announcementId" value={item.id} />
              <button className="h-7 rounded-md bg-lamaSky px-3 text-xs font-semibold">
                Mark read
              </button>
            </form>
          )}
          {role === "admin" && (
            <>
              <FormContainer table="announcement" type="update" data={item} />
              <FormContainer table="announcement" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
  const { page, ...queryParams } = searchParams;

  const p = getPageNumber(page);

  // URL PARAMS CONDITION

  const queryAnd: Prisma.AnnouncementWhereInput[] = [
    getAnnouncementAudienceWhere(role, currentUserId),
  ];

  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        switch (key) {
          case "classId":
            if (value === "global") {
              queryAnd.push({ classId: null });
            } else {
              const classId = getNumberParam(value);
              if (classId) {
                queryAnd.push({ classId });
              }
            }
            break;
          case "status":
            if (currentUserId && value === "read") {
              queryAnd.push({
                reads: {
                  some: {
                    userId: currentUserId,
                  },
                },
              });
            }
            if (currentUserId && value === "unread") {
              queryAnd.push({
                reads: {
                  none: {
                    userId: currentUserId,
                  },
                },
              });
            }
            break;
          case "search":
            queryAnd.push({
              OR: [
                { title: { contains: value, mode: "insensitive" } },
                { description: { contains: value, mode: "insensitive" } },
              ],
            });
            break;
          default:
            break;
        }
      }
    }
  }

  const query: Prisma.AnnouncementWhereInput = {
    AND: queryAnd,
  };

  const sortDirection = searchParams.order
    ? getSortDirection(searchParams.order)
    : "desc";
  const orderByOptions: Record<string, Prisma.AnnouncementOrderByWithRelationInput> =
    {
      date: { date: sortDirection },
      title: { title: sortDirection },
    };
  const orderBy =
    orderByOptions[searchParams.sort || "date"] || orderByOptions.date;

  const [dataRes, count, visibleAnnouncementIds, classes] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: query,
      include: {
        class: true,
      },
      take: ITEM_PER_PAGE,
      skip: ITEM_PER_PAGE * (p - 1),
      orderBy,
    }),
    prisma.announcement.count({ where: query }),
    prisma.announcement.findMany({
      where: getAnnouncementAudienceWhere(role, currentUserId),
      select: {
        id: true,
      },
    }),
    prisma.class.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const readIds = await getReadAnnouncementIds({
    prisma,
    announcementIds: dataRes.map((announcement) => announcement.id),
    userId: currentUserId,
  });

  const unreadCount = await getUnreadAnnouncementCount({
    prisma,
    announcementIds: visibleAnnouncementIds.map((announcement) => announcement.id),
    userId: currentUserId,
  });

  const data = dataRes.map((announcement) => ({
    ...announcement,
    isRead: readIds.has(announcement.id),
  }));

  const filterGroups = [
    {
      label: "Status",
      param: "status",
      options: [
        { label: "Unread", value: "unread" },
        { label: "Read", value: "read" },
      ],
    },
    {
      label: "Class",
      param: "classId",
      options: [
        { label: "School-wide", value: "global" },
        ...classes.map((classItem) => ({
          label: classItem.name,
          value: classItem.id.toString(),
        })),
      ],
    },
  ];

  const sortOptions = [
    { label: "Date", value: "date" },
    { label: "Title", value: "title" },
  ];

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      {/* TOP */}
      <div className="flex items-center justify-between">
        <h1 className="hidden md:block text-lg font-semibold">
          All Announcements
        </h1>
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {unreadCount > 0 && (
            <form action={markAllAnnouncementsAsRead}>
              <button className="h-8 rounded-md bg-lamaPurple px-4 text-xs font-semibold">
                Mark all read ({unreadCount})
              </button>
            </form>
          )}
          <TableSearch />
          <div className="flex items-center gap-4 self-end">
            <TableFilter filters={filterGroups} />
            <TableSort options={sortOptions} defaultOrder="desc" />
            {role === "admin" && (
              <FormContainer table="announcement" type="create" />
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

export default AnnouncementListPage;
