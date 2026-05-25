import { UserButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import prisma from "@/lib/prisma";
import NavbarSearch from "./NavbarSearch";
import {
  getAnnouncementAudienceWhere,
  getUnreadAnnouncementCount,
} from "@/lib/announcements";

const Navbar = async () => {
  const user = await currentUser();
  const role = (user?.publicMetadata?.role as string) || "student";
  const currentUserId = user?.id;
  const unreadMessages: { [key: string]: number } = {
    admin: 3,
    teacher: 4,
    student: 1,
    parent: 2,
  };
  const unreadCount = unreadMessages[role] || 0;
  const visibleAnnouncements = currentUserId
    ? await prisma.announcement.findMany({
        where: getAnnouncementAudienceWhere(role, currentUserId),
        select: {
          id: true,
        },
      })
    : [];

  const announcementCount = await getUnreadAnnouncementCount({
    prisma,
    announcementIds: visibleAnnouncements.map((announcement) => announcement.id),
    userId: currentUserId,
  });

  return (
    <div className="flex items-center justify-between p-4">
      <NavbarSearch role={role} />
      {/* ICONS AND USER */}
      <div className="flex items-center gap-6 justify-end w-full">
        <Link
          href="/list/messages"
          aria-label="Open messages"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative hover:bg-lamaSkyLight"
        >
          <Image src="/message.png" alt="" width={20} height={20} />
          {unreadCount > 0 && (
            <div className="absolute -top-3 -right-3 w-5 h-5 flex items-center justify-center bg-lamaPurple text-white rounded-full text-xs">
              {unreadCount}
            </div>
          )}
        </Link>
        <Link
          href="/list/announcements"
          aria-label="Open announcements"
          className="bg-white rounded-full w-7 h-7 flex items-center justify-center cursor-pointer relative hover:bg-lamaSkyLight"
        >
          <Image src="/announcement.png" alt="" width={20} height={20} />
          {announcementCount > 0 && (
            <div className="absolute -top-3 -right-3 min-w-5 h-5 px-1 flex items-center justify-center bg-purple-500 text-white rounded-full text-xs">
              {announcementCount > 9 ? "9+" : announcementCount}
            </div>
          )}
        </Link>
        <div className="flex flex-col">
          <span className="text-xs leading-3 font-medium"></span>
          <span className="text-[10px] text-gray-500 text-right">
            {role}
          </span>
        </div>
        {/* <Image src="/avatar.png" alt="" width={36} height={36} className="rounded-full"/> */}
        <UserButton />
      </div>
    </div>
  );
};

export default Navbar;
