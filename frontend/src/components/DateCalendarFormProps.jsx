
import React, { useState } from "react";
import dayjs from "dayjs";

function getDaysInMonth(year, month) {
  const days = [];
  const firstDay = dayjs(`${year}-${month}-01`);
  const startDay = firstDay.day();
  const daysInMonth = firstDay.daysInMonth();
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

export default function DateCalendarFormProps() {
  const today = dayjs();
  const [currentMonth, setCurrentMonth] = useState(today);

  const days = getDaysInMonth(currentMonth.year(), currentMonth.format("MM"));

  return (
    <div className="flex items-center justify-center w-full h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-base font-semibold">
            {currentMonth.format("MMMM YYYY")}
          </span>
          <div className="flex gap-2">
            <button
              className="text-gray-500 hover:text-blue-600 text-sm"
              onClick={() => setCurrentMonth(currentMonth.subtract(1, "month"))}
            >
              &lt;
            </button>
            <button
              className="text-gray-500 hover:text-blue-600 text-sm"
              onClick={() => setCurrentMonth(currentMonth.add(1, "month"))}
            >
              &gt;
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-gray-500 mb-1 text-xs">
          {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
            <div key={d} className="font-medium">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 text-center gap-y-1">
          {days.map((d, i) =>
            d ? (
              <div
                key={i}
                className={`w-7 h-7 flex items-center justify-center rounded-full text-xs ${
                  today.date() === d &&
                  today.month() === currentMonth.month() &&
                  today.year() === currentMonth.year()
                    ? "bg-blue-900 text-white font-bold"
                    : "hover:bg-blue-100"
                }`}
              >
                {d}
              </div>
            ) : (
              <div key={i}></div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
