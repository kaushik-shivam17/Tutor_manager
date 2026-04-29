import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  parseISO 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from 'clsx';

interface CalendarViewProps {
  selectedDate: string; // YYYY-MM-DD
  onChange: (date: string) => void;
}

export default function CalendarView({ selectedDate, onChange }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(parseISO(selectedDate));
  const selected = parseISO(selectedDate);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "d";
  const rows = [];
  let days = [];
  let day = startDate;
  let formattedDate = "";

  while (day <= endDate) {
    for (let i = 0; i < 7; i++) {
      formattedDate = format(day, dateFormat);
      const cloneDay = day;
      days.push(
        <button
          key={day.toString()}
          onClick={() => onChange(format(cloneDay, 'yyyy-MM-dd'))}
          className={clsx(
            "p-2 w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
            !isSameMonth(day, monthStart)
              ? "text-slate-300 hover:bg-slate-50"
              : isSameDay(day, selected)
              ? "bg-indigo-600 text-white shadow-sm"
              : isSameDay(day, new Date())
              ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
              : "text-slate-700 hover:bg-slate-100"
          )}
        >
          {formattedDate}
        </button>
      );
      day = addDays(day, 1);
    }
    rows.push(
      <div className="flex justify-between" key={day.toString()}>
        {days}
      </div>
    );
    days = [];
  }

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full max-w-sm">
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-semibold text-slate-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <div className="flex justify-between mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="w-10 text-center text-xs font-semibold text-slate-400">
            {d}
          </div>
        ))}
      </div>
      <div className="space-y-1">
        {rows}
      </div>
    </div>
  );
}
