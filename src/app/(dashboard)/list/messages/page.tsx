import TableSearch from "@/components/TableSearch";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";

type MessageThread = {
  id: number;
  name: string;
  role: string;
  subject: string;
  preview: string;
  time: string;
  unread: number;
  tone: "sky" | "purple" | "yellow";
  messages: {
    author: string;
    body: string;
    mine?: boolean;
  }[];
};

const roleThreads: Record<string, MessageThread[]> = {
  admin: [
    {
      id: 1,
      name: "Teachers Staff Room",
      role: "Group",
      subject: "Morning duty updates",
      preview: "Two teachers requested schedule changes for tomorrow.",
      time: "09:15",
      unread: 2,
      tone: "sky",
      messages: [
        {
          author: "TName4",
          body: "Can my first-period duty be swapped with the science lab block?",
        },
        {
          author: "Admin",
          body: "I will review the coverage and confirm before lunch.",
          mine: true,
        },
      ],
    },
    {
      id: 2,
      name: "Parent Desk",
      role: "Parents",
      subject: "Transport query",
      preview: "A parent asked about the updated bus pickup time.",
      time: "Yesterday",
      unread: 1,
      tone: "purple",
      messages: [
        {
          author: "Parent",
          body: "Please confirm if the new pickup time starts this week.",
        },
        {
          author: "Admin",
          body: "Yes, the change starts from Monday.",
          mine: true,
        },
      ],
    },
  ],
  teacher: [
    {
      id: 1,
      name: "Class 5A Parents",
      role: "Group",
      subject: "Attendance follow-up",
      preview: "Share a quick note about today’s absent students.",
      time: "10:20",
      unread: 3,
      tone: "yellow",
      messages: [
        {
          author: "Teacher",
          body: "Please send leave notes for absent students by evening.",
          mine: true,
        },
        {
          author: "Parent",
          body: "I will upload the medical note today.",
        },
      ],
    },
    {
      id: 2,
      name: "SName12 SSurname 12",
      role: "Student",
      subject: "Assignment doubt",
      preview: "I need help with question 4 from the worksheet.",
      time: "08:45",
      unread: 1,
      tone: "sky",
      messages: [
        {
          author: "Student",
          body: "I need help with question 4 from the worksheet.",
        },
        {
          author: "Teacher",
          body: "Bring your notebook after class and we will solve it together.",
          mine: true,
        },
      ],
    },
  ],
  student: [
    {
      id: 1,
      name: "Mathematics Teacher",
      role: "Teacher",
      subject: "Homework help",
      preview: "You can submit the corrected work tomorrow morning.",
      time: "11:05",
      unread: 1,
      tone: "sky",
      messages: [
        {
          author: "Student",
          body: "Can I submit the corrected homework tomorrow?",
          mine: true,
        },
        {
          author: "Teacher",
          body: "Yes, submit it tomorrow morning before assembly.",
        },
      ],
    },
    {
      id: 2,
      name: "School Office",
      role: "Admin",
      subject: "ID card update",
      preview: "Your new ID card is ready for collection.",
      time: "Yesterday",
      unread: 0,
      tone: "purple",
      messages: [
        {
          author: "Admin",
          body: "Your new ID card is ready for collection from the office.",
        },
      ],
    },
  ],
  parent: [
    {
      id: 1,
      name: "Class Teacher",
      role: "Teacher",
      subject: "Attendance note",
      preview: "Please confirm the reason for yesterday’s absence.",
      time: "09:40",
      unread: 2,
      tone: "yellow",
      messages: [
        {
          author: "Teacher",
          body: "Please confirm the reason for yesterday’s absence.",
        },
        {
          author: "Parent",
          body: "My child had a fever. I will send the note today.",
          mine: true,
        },
      ],
    },
    {
      id: 2,
      name: "School Office",
      role: "Admin",
      subject: "Fee receipt",
      preview: "Your payment receipt has been generated.",
      time: "Monday",
      unread: 0,
      tone: "purple",
      messages: [
        {
          author: "Admin",
          body: "Your payment receipt has been generated.",
        },
      ],
    },
  ],
};

const toneClasses = {
  sky: "bg-lamaSky",
  purple: "bg-lamaPurple",
  yellow: "bg-lamaYellow",
};

const emptyThread: MessageThread = {
  id: 0,
  name: "Messages",
  role: "Inbox",
  subject: "No messages yet",
  preview: "New conversations will appear here.",
  time: "",
  unread: 0,
  tone: "sky",
  messages: [
    {
      author: "System",
      body: "New conversations will appear here.",
    },
  ],
};

const MessagesPage = async ({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) => {
  const { sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role || "student";
  const search = searchParams.search?.trim().toLowerCase() || "";
  const allThreads = roleThreads[role] || roleThreads.student;
  const threads = search
    ? allThreads.filter((thread) =>
        `${thread.name} ${thread.role} ${thread.subject} ${thread.preview}`
          .toLowerCase()
          .includes(search)
      )
    : allThreads;
  const selectedThread = threads[0] || emptyThread;
  const unreadCount = threads.reduce((sum, thread) => sum + thread.unread, 0);

  const headline =
    role === "admin"
      ? "School Messages"
      : role === "teacher"
      ? "Class Messages"
      : role === "parent"
      ? "Family Messages"
      : "My Messages";

  return (
    <div className="m-4 mt-0 flex flex-1 flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Unread</span>
          <div className="mt-2 text-2xl font-semibold">{unreadCount}</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Conversations</span>
          <div className="mt-2 text-2xl font-semibold">{threads.length}</div>
        </div>
        <div className="rounded-md bg-white p-4">
          <span className="text-xs font-medium text-gray-400">Access</span>
          <div className="mt-2 text-2xl font-semibold capitalize">{role}</div>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[360px_1fr]">
        <div className="rounded-md bg-white p-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-semibold">{headline}</h1>
              <p className="text-sm text-gray-500">Role-based inbox</p>
            </div>
            {(role === "admin" || role === "teacher") && (
              <button className="h-9 rounded-md bg-lamaYellow px-4 text-sm font-semibold">
                Compose
              </button>
            )}
          </div>

          <TableSearch />

          <div className="mt-4 flex flex-col gap-3">
            {threads.length > 0 ? (
              threads.map((thread) => (
                <button
                  type="button"
                  key={thread.id}
                  className={`flex w-full items-start gap-3 rounded-md p-3 text-left ${
                    thread.id === selectedThread.id
                      ? "bg-lamaSkyLight"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${toneClasses[thread.tone]}`}
                  >
                    {thread.name.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {thread.name}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {thread.time}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium text-gray-500">
                      {thread.subject}
                    </span>
                    <span className="mt-1 block truncate text-xs text-gray-400">
                      {thread.preview}
                    </span>
                  </span>
                  {thread.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-500 px-1 text-xs text-white">
                      {thread.unread}
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="rounded-md bg-slate-50 p-4 text-center text-sm text-gray-500">
                No messages found.
              </div>
            )}
          </div>
        </div>

        <div className="flex min-h-[520px] flex-col rounded-md bg-white p-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${toneClasses[selectedThread.tone]}`}
              >
                {selectedThread.name.charAt(0)}
              </span>
              <div>
                <h2 className="font-semibold">{selectedThread.name}</h2>
                <p className="text-xs text-gray-500">
                  {selectedThread.role} - {selectedThread.subject}
                </p>
              </div>
            </div>
            <Image src="/moreDark.png" alt="" width={20} height={20} />
          </div>

          <div className="flex flex-1 flex-col gap-3 py-4">
            {selectedThread.messages.map((message, index) => (
              <div
                key={`${message.author}-${index}`}
                className={`flex ${message.mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[78%] rounded-md px-4 py-3 text-sm ${
                    message.mine
                      ? "bg-lamaPurpleLight"
                      : "bg-lamaSkyLight"
                  }`}
                >
                  <p className="mb-1 text-xs font-semibold text-gray-500">
                    {message.author}
                  </p>
                  <p>{message.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
            <input
              type="text"
              placeholder="Type a reply..."
              className="h-10 flex-1 rounded-md border border-gray-200 px-3 text-sm outline-none"
            />
            <button className="h-10 rounded-md bg-lamaYellow px-5 text-sm font-semibold">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
