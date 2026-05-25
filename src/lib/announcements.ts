import { Prisma } from "@prisma/client";

export const getAnnouncementAudienceWhere = (
  role?: string,
  userId?: string | null
): Prisma.AnnouncementWhereInput => {
  if (role === "admin") {
    return {};
  }

  const roleConditions = {
    teacher: { lessons: { some: { teacherId: userId! } } },
    student: { students: { some: { id: userId! } } },
    parent: { students: { some: { parentId: userId! } } },
  };

  return {
    OR: [
      { classId: null },
      {
        class: roleConditions[role as keyof typeof roleConditions] || {},
      },
    ],
  };
};

export const getUnreadAnnouncementCount = async ({
  prisma,
  announcementIds,
  userId,
}: {
  prisma: any;
  announcementIds: number[];
  userId?: string | null;
}) => {
  if (!userId || announcementIds.length === 0) {
    return 0;
  }

  const readRows: { announcementId: number }[] = await prisma.$queryRaw`
    SELECT "announcementId"
    FROM "AnnouncementRead"
    WHERE "userId" = ${userId}
      AND "announcementId" IN (${Prisma.join(announcementIds)})
  `;

  return announcementIds.length - readRows.length;
};

export const getReadAnnouncementIds = async ({
  prisma,
  announcementIds,
  userId,
}: {
  prisma: any;
  announcementIds: number[];
  userId?: string | null;
}) => {
  if (!userId || announcementIds.length === 0) {
    return new Set<number>();
  }

  const readRows: { announcementId: number }[] = await prisma.$queryRaw`
    SELECT "announcementId"
    FROM "AnnouncementRead"
    WHERE "userId" = ${userId}
      AND "announcementId" IN (${Prisma.join(announcementIds)})
  `;

  return new Set(readRows.map((row) => row.announcementId));
};
