import { getAnnouncementAudienceWhere, getReadAnnouncementIds } from "@/lib/announcements";
import prisma from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

const Announcements = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  const data = await prisma.announcement.findMany({
    take: 3,
    orderBy: { date: "desc" },
    where: getAnnouncementAudienceWhere(role, userId),
  });

  const readIds = await getReadAnnouncementIds({
    prisma,
    announcementIds: data.map((announcement) => announcement.id),
    userId,
  });

  return (
    <div className="bg-white p-4 rounded-md">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Announcements</h1>
        <Link
          href="/list/announcements"
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          View All
        </Link>
      </div>
      <div className="flex flex-col gap-4 mt-4">
        {data[0] && (
          <div className="bg-lamaSkyLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {data[0].title}
                {!readIds.has(data[0].id) && (
                  <span className="ml-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] text-white">
                    New
                  </span>
                )}
              </h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[0].date)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{data[0].description}</p>
          </div>
        )}
        {data[1] && (
          <div className="bg-lamaPurpleLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {data[1].title}
                {!readIds.has(data[1].id) && (
                  <span className="ml-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] text-white">
                    New
                  </span>
                )}
              </h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[1].date)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{data[1].description}</p>
          </div>
        )}
        {data[2] && (
          <div className="bg-lamaYellowLight rounded-md p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">
                {data[2].title}
                {!readIds.has(data[2].id) && (
                  <span className="ml-2 rounded-full bg-purple-500 px-2 py-0.5 text-[10px] text-white">
                    New
                  </span>
                )}
              </h2>
              <span className="text-xs text-gray-400 bg-white rounded-md px-1 py-1">
                {new Intl.DateTimeFormat("en-GB").format(data[2].date)}
              </span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{data[2].description}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
