"use client";

import { Calendar, momentLocalizer, View, Views } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { useState } from "react";

const localizer = momentLocalizer(moment);

type CalendarLesson = {
  title: string;
  start: Date;
  end: Date;
};

const eventColorClasses = [
  "calendar-event-color-sky",
  "calendar-event-color-yellow",
  "calendar-event-color-purple",
  "calendar-event-color-pink",
];

const getEventColorClass = (title: string) => {
  const colorIndex = title
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);

  return eventColorClasses[colorIndex % eventColorClasses.length];
};

const formatEventTime = (event: CalendarLesson) => {
  const start = moment(event.start);
  const end = moment(event.end);

  return start.format("A") === end.format("A")
    ? `${start.format("h:mm")} - ${end.format("h:mm A")}`
    : `${start.format("h:mm A")} - ${end.format("h:mm A")}`;
};

const CalendarEvent = ({ event }: { event: CalendarLesson }) => (
  <div className="calendar-event">
    <span className="calendar-event-time">{formatEventTime(event)}</span>
    <span className="calendar-event-title">{event.title}</span>
  </div>
);

const BigCalendar = ({
  data,
}: {
  data: CalendarLesson[];
}) => {
  const [view, setView] = useState<View>(Views.WORK_WEEK);

  const handleOnChangeView = (selectedView: View) => {
    setView(selectedView);
  };

  return (
    <Calendar
      localizer={localizer}
      events={data}
      startAccessor="start"
      endAccessor="end"
      views={["work_week", "day"]}
      view={view}
      style={{ height: "98%" }}
      onView={handleOnChangeView}
      components={{ event: CalendarEvent }}
      eventPropGetter={(event) => ({
        className: getEventColorClass(event.title),
      })}
      tooltipAccessor={() => ""}
      min={new Date(2025, 1, 0, 8, 0, 0)}
      max={new Date(2025, 1, 0, 17, 0, 0)}
    />
  );
};

export default BigCalendar;
