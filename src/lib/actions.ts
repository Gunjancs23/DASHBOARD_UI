"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import {
  AnnouncementSchema,
  AssignmentSchema,
  ClassSchema,
  ExamSchema,
  EventSchema,
  LessonSchema,
  ParentSchema,
  ResultSchema,
  StudentSchema,
  SubjectSchema,
  TeacherSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { Prisma } from "@prisma/client";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getAnnouncementAudienceWhere } from "./announcements";

type CurrentState = { success: boolean; error: boolean };

const revalidateAnnouncementViews = () => {
  revalidatePath("/list/announcements");
  revalidatePath("/admin");
  revalidatePath("/teacher");
  revalidatePath("/student");
  revalidatePath("/parent");
};

const getDayRange = (dateValue: string) => {
  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
};

const getResultAssessment = (assessmentId: string) => {
  const [type, id] = assessmentId.split(":");
  const parsedId = parseInt(id);

  return {
    examId: type === "exam" ? parsedId : null,
    assignmentId: type === "assignment" ? parsedId : null,
  };
};

const isAdminUser = async () => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  return role === "admin";
};

const shouldRequireClerkUsers = () => process.env.REQUIRE_CLERK_USERS === "true";

const deleteClerkUser = async (id: string) => {
  try {
    await (await clerkClient()).users.deleteUser(id);
  } catch {
    // Seeded local users do not always exist in Clerk.
  }
};

const createAuthUser = async ({
  username,
  password,
  name,
  surname,
  role,
}: {
  username: string;
  password?: string;
  name: string;
  surname: string;
  role: "teacher" | "student" | "parent";
}) => {
  try {
    const user = await (await clerkClient()).users.createUser({
      username,
      password,
      firstName: name,
      lastName: surname,
      publicMetadata: { role },
    });

    return user.id;
  } catch (err) {
    console.log(err);

    if (shouldRequireClerkUsers()) {
      throw err;
    }

    return `${role}_${randomUUID()}`;
  }
};

const updateAuthUser = async ({
  id,
  username,
  password,
  name,
  surname,
}: {
  id: string;
  username: string;
  password?: string;
  name: string;
  surname: string;
}) => {
  try {
    await (await clerkClient()).users.updateUser(id, {
      username,
      ...(password ? { password } : {}),
      firstName: name,
      lastName: surname,
    });
  } catch (err) {
    console.log(err);

    if (shouldRequireClerkUsers()) {
      throw err;
    }
  }
};

const deleteStudentRecord = async (id: string) => {
  await prisma.attendance.deleteMany({
    where: {
      studentId: id,
    },
  });

  await prisma.result.deleteMany({
    where: {
      studentId: id,
    },
  });

  await prisma.student.delete({
    where: {
      id,
    },
  });

  await deleteClerkUser(id);
};

const deleteLessonRecord = async (id: number) => {
  const [exams, assignments] = await Promise.all([
    prisma.exam.findMany({
      where: { lessonId: id },
      select: { id: true },
    }),
    prisma.assignment.findMany({
      where: { lessonId: id },
      select: { id: true },
    }),
  ]);

  const examIds = exams.map((exam) => exam.id);
  const assignmentIds = assignments.map((assignment) => assignment.id);

  await prisma.result.deleteMany({
    where: {
      OR: [
        { examId: { in: examIds } },
        { assignmentId: { in: assignmentIds } },
      ],
    },
  });

  await prisma.attendance.deleteMany({
    where: {
      lessonId: id,
    },
  });

  await prisma.exam.deleteMany({
    where: {
      lessonId: id,
    },
  });

  await prisma.assignment.deleteMany({
    where: {
      lessonId: id,
    },
  });

  await prisma.lesson.delete({
    where: {
      id,
    },
  });
};

const getOrCreateGrade = async (level: number) => {
  return prisma.grade.upsert({
    where: {
      level,
    },
    update: {},
    create: {
      level,
    },
  });
};

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.create({
      data: {
        name: data.name,
        teachers: {
          connect: (data.teachers ?? []).map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema
) => {
  try {
    await prisma.subject.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        teachers: {
          set: (data.teachers ?? []).map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        subjectId: parseInt(id),
      },
      select: {
        id: true,
      },
    });

    for (const lesson of lessons) {
      await deleteLessonRecord(lesson.id);
    }

    await prisma.subject.update({
      where: {
        id: parseInt(id),
      },
      data: {
        teachers: {
          set: [],
        },
      },
    });

    await prisma.subject.delete({
      where: {
        id: parseInt(id),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  try {
    const grade = await getOrCreateGrade(data.gradeLevel);

    await prisma.class.create({
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: grade.id,
        supervisorId: data.supervisorId || null,
      },
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    const grade = await getOrCreateGrade(data.gradeLevel);

    await prisma.class.update({
      where: {
        id: data.id,
      },
      data: {
        name: data.name,
        capacity: data.capacity,
        gradeId: grade.id,
        supervisorId: data.supervisorId || null,
      },
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const classId = parseInt(id);

    const lessons = await prisma.lesson.findMany({
      where: {
        classId,
      },
      select: {
        id: true,
      },
    });

    for (const lesson of lessons) {
      await deleteLessonRecord(lesson.id);
    }

    const students = await prisma.student.findMany({
      where: {
        classId,
      },
      select: {
        id: true,
      },
    });

    for (const student of students) {
      await deleteStudentRecord(student.id);
    }

    await prisma.event.deleteMany({
      where: {
        classId,
      },
    });

    await prisma.announcement.deleteMany({
      where: {
        classId,
      },
    });

    await prisma.class.delete({
      where: {
        id: classId,
      },
    });

    // revalidatePath("/list/class");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  try {
    const userId = await createAuthUser({
      role: "teacher",
      username: data.username,
      password: data.password,
      name: data.name,
      surname: data.surname,
    });

    await prisma.teacher.create({
      data: {
        id: userId,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          connect: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });

    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    await updateAuthUser({
      id: data.id,
      username: data.username,
      password: data.password,
      name: data.name,
      surname: data.surname,
    });

    await prisma.teacher.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        ...(data.img ? { img: data.img } : {}),
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        subjects: {
          set: data.subjects?.map((subjectId: string) => ({
            id: parseInt(subjectId),
          })),
        },
      },
    });
    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        teacherId: id,
      },
      select: {
        id: true,
      },
    });

    for (const lesson of lessons) {
      await deleteLessonRecord(lesson.id);
    }

    await prisma.class.updateMany({
      where: {
        supervisorId: id,
      },
      data: {
        supervisorId: null,
      },
    });

    await prisma.teacher.update({
      where: {
        id,
      },
      data: {
        subjects: {
          set: [],
        },
        classes: {
          set: [],
        },
      },
    });

    await prisma.teacher.delete({
      where: {
        id: id,
      },
    });

    await deleteClerkUser(id);

    // revalidatePath("/list/teachers");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  try {
    const classItem = await prisma.class.findUnique({
      where: { id: data.classId },
      include: { _count: { select: { students: true } } },
    });

    if (classItem && classItem.capacity === classItem._count.students) {
      return { success: false, error: true };
    }

    const grade = await getOrCreateGrade(data.gradeLevel);

    const userId = await createAuthUser({
      role: "student",
      username: data.username,
      password: data.password,
      name: data.name,
      surname: data.surname,
    });

    await prisma.student.create({
      data: {
        id: userId,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        img: data.img || null,
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: grade.id,
        classId: data.classId,
        parentId: data.parentId,
      },
    });

    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateStudent = async (
  currentState: CurrentState,
  data: StudentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }
  try {
    const grade = await getOrCreateGrade(data.gradeLevel);

    await updateAuthUser({
      id: data.id,
      username: data.username,
      password: data.password,
      name: data.name,
      surname: data.surname,
    });

    await prisma.student.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address,
        ...(data.img ? { img: data.img } : {}),
        bloodType: data.bloodType,
        sex: data.sex,
        birthday: data.birthday,
        gradeId: grade.id,
        classId: data.classId,
        parentId: data.parentId,
      },
    });
    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteStudent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  try {
    await deleteStudentRecord(id);

    // revalidatePath("/list/students");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.create({
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema
) => {
  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    // if (role === "teacher") {
    //   const teacherLesson = await prisma.lesson.findFirst({
    //     where: {
    //       teacherId: userId!,
    //       id: data.lessonId,
    //     },
    //   });

    //   if (!teacherLesson) {
    //     return { success: false, error: true };
    //   }
    // }

    await prisma.exam.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        startTime: data.startTime,
        endTime: data.endTime,
        lessonId: data.lessonId,
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  // const { userId, sessionClaims } = auth();
  // const role = (sessionClaims?.metadata as { role?: string })?.role;

  try {
    await prisma.result.deleteMany({
      where: {
        examId: parseInt(id),
      },
    });

    await prisma.exam.delete({
      where: {
        id: parseInt(id),
        // ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
    });

    // revalidatePath("/list/subjects");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  try {
    const userId = await createAuthUser({
      role: "parent",
      username: data.username,
      password: data.password,
      name: data.name,
      surname: data.surname,
    });

    await prisma.parent.create({
      data: {
        id: userId,
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await updateAuthUser({
      id: data.id,
      username: data.username,
      password: data.password,
      name: data.name,
      surname: data.surname,
    });

    await prisma.parent.update({
      where: {
        id: data.id,
      },
      data: {
        username: data.username,
        name: data.name,
        surname: data.surname,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
      },
    });

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    const students = await prisma.student.findMany({
      where: {
        parentId: id,
      },
      select: {
        id: true,
      },
    });

    for (const student of students) {
      await deleteStudentRecord(student.id);
    }

    await prisma.parent.delete({
      where: {
        id,
      },
    });

    await deleteClerkUser(id);

    revalidatePath("/list/parents");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  if (!(await isAdminUser())) {
    return { success: false, error: true };
  }

  try {
    await prisma.lesson.create({
      data,
    });

    revalidatePath("/list/lessons");
    revalidatePath(`/list/teachers/${data.teacherId}`);
    revalidatePath("/teacher");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateLesson = async (
  currentState: CurrentState,
  data: LessonSchema
) => {
  if (!data.id || !(await isAdminUser())) {
    return { success: false, error: true };
  }

  try {
    const existingLesson = await prisma.lesson.findUnique({
      where: {
        id: data.id,
      },
      select: {
        teacherId: true,
      },
    });

    if (!existingLesson) {
      return { success: false, error: true };
    }

    await prisma.lesson.update({
      where: {
        id: data.id,
      },
      data,
    });

    revalidatePath("/list/lessons");
    revalidatePath(`/list/teachers/${data.teacherId}`);
    if (existingLesson.teacherId !== data.teacherId) {
      revalidatePath(`/list/teachers/${existingLesson.teacherId}`);
    }
    revalidatePath("/teacher");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteLesson = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  if (!(await isAdminUser())) {
    return { success: false, error: true };
  }

  try {
    const lesson = await prisma.lesson.findUnique({
      where: {
        id: parseInt(id),
      },
      select: {
        teacherId: true,
      },
    });

    if (!lesson) {
      return { success: false, error: true };
    }

    await deleteLessonRecord(parseInt(id));

    revalidatePath("/list/lessons");
    revalidatePath(`/list/teachers/${lesson.teacherId}`);
    revalidatePath("/teacher");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true };
  }

  try {
    await prisma.assignment.create({
      data,
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await prisma.assignment.update({
      where: {
        id: data.id,
      },
      data,
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true };
  }

  try {
    await prisma.result.deleteMany({
      where: {
        assignmentId: parseInt(id),
      },
    });

    await prisma.assignment.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/assignments");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  const assessment = getResultAssessment(data.assessmentId);

  if (!assessment.examId && !assessment.assignmentId) {
    return { success: false, error: true };
  }

  try {
    await prisma.result.create({
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: assessment.examId,
        assignmentId: assessment.assignmentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateResult = async (
  currentState: CurrentState,
  data: ResultSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  const assessment = getResultAssessment(data.assessmentId);

  if (!assessment.examId && !assessment.assignmentId) {
    return { success: false, error: true };
  }

  try {
    await prisma.result.update({
      where: {
        id: data.id,
      },
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: assessment.examId,
        assignmentId: assessment.assignmentId,
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.result.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/results");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  try {
    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await prisma.event.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        classId: data.classId || null,
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.event.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidatePath("/list/events");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  try {
    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId || null,
      },
    });

    revalidateAnnouncementViews();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema
) => {
  if (!data.id) {
    return { success: false, error: true };
  }

  try {
    await prisma.announcement.update({
      where: {
        id: data.id,
      },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classId: data.classId || null,
      },
    });

    revalidateAnnouncementViews();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData
) => {
  const id = data.get("id") as string;

  try {
    await prisma.announcement.delete({
      where: {
        id: parseInt(id),
      },
    });

    revalidateAnnouncementViews();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const markAnnouncementAsRead = async (data: FormData) => {
  const announcementId = Number(data.get("announcementId"));
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !announcementId) {
    return { success: false, error: true };
  }

  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      ...getAnnouncementAudienceWhere(role, userId),
    },
    select: {
      id: true,
    },
  });

  if (!announcement) {
    return { success: false, error: true };
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO "AnnouncementRead" ("userId", "announcementId")
      VALUES (${userId}, ${announcementId})
      ON CONFLICT ("userId", "announcementId") DO UPDATE
      SET "readAt" = CURRENT_TIMESTAMP
    `;

    revalidateAnnouncementViews();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const markAllAnnouncementsAsRead = async () => {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId) {
    return { success: false, error: true };
  }

  const announcements = await prisma.announcement.findMany({
    where: getAnnouncementAudienceWhere(role, userId),
    select: {
      id: true,
    },
  });

  if (announcements.length === 0) {
    return { success: true, error: false };
  }

  try {
    await prisma.$executeRaw`
      INSERT INTO "AnnouncementRead" ("userId", "announcementId")
      SELECT ${userId}, id
      FROM "Announcement"
      WHERE id IN (${Prisma.join(
        announcements.map((announcement) => announcement.id)
      )})
      ON CONFLICT ("userId", "announcementId") DO UPDATE
      SET "readAt" = CURRENT_TIMESTAMP
    `;

    revalidateAnnouncementViews();
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};

export const setAttendanceStatus = async (data: FormData) => {
  const studentId = data.get("studentId") as string;
  const lessonId = Number(data.get("lessonId"));
  const dateValue = data.get("date") as string;
  const present = data.get("present") === "true";

  if (!studentId || !lessonId || !dateValue) {
    return { success: false, error: true };
  }

  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true };
  }

  const lesson = await prisma.lesson.findFirst({
    where: {
      id: lessonId,
      ...(role === "teacher" ? { teacherId: userId! } : {}),
      class: {
        students: {
          some: {
            id: studentId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!lesson) {
    return { success: false, error: true };
  }

  const { start, end } = getDayRange(dateValue);

  try {
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId,
        lessonId,
        date: {
          gte: start,
          lt: end,
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    if (existingAttendance) {
      await prisma.attendance.update({
        where: {
          id: existingAttendance.id,
        },
        data: {
          present,
          date: start,
        },
      });
    } else {
      await prisma.attendance.create({
        data: {
          studentId,
          lessonId,
          present,
          date: start,
        },
      });
    }

    revalidatePath("/list/attendance");
    return { success: true, error: false };
  } catch (err) {
    console.log(err);
    return { success: false, error: true };
  }
};
