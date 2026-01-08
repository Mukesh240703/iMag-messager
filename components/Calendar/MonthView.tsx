"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import styles from "./MonthView.module.css";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from "date-fns";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Mock Events
const events = [
    { id: 1, title: "Team Sync", date: new Date(2025, 0, 15), type: "meeting" },
    { id: 2, title: "Project Deadline", date: new Date(2025, 0, 20), type: "deadline" },
    { id: 3, title: "Client Call", date: new Date(2025, 0, 22), type: "meeting" },
];

export default function MonthView() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    // Mock checking for events on a day (simple check for today's month/day match)
    const getEventsForDay = (day: Date) => {
        // In a real app, match properly. Here just mock randomness or static dates if adjusted to current year/month
        // For demo, let's just show static events if they match date part (ignoring year/month for simplicity if strictly mocking)
        // Actually, let's just make it relative to today for the demo to always look good
        if (isSameDay(day, new Date())) return [{ id: 99, title: "Today's Focus", type: "meeting" }];
        return events.filter(e => isSameDay(e.date, day)); // This works if events are hardcoded to correct year/month
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>{format(currentDate, "MMMM yyyy")}</h2>
                <div className={styles.controls}>
                    <button className={styles.navBtn} onClick={prevMonth}><ChevronLeft size={20} /></button>
                    <button className={styles.navBtn} onClick={nextMonth}><ChevronRight size={20} /></button>
                    <button className={cn(styles.navBtn, "bg-blue-600 text-white border-none")} style={{ backgroundColor: 'var(--color-accent)', width: 'auto', padding: '0 1rem', borderRadius: '8px', color: 'white', gap: '0.5rem' }}>
                        <Plus size={18} /> Add Event
                    </button>
                </div>
            </div>

            <div className={styles.grid}>
                {weekDays.map(day => (
                    <div key={day} className={styles.dayHeader}>{day}</div>
                ))}

                <div className={styles.daysContainer}>
                    {days.map((day, idx) => {
                        const dayEvents = getEventsForDay(day);
                        return (
                            <div
                                key={day.toString()}
                                className={cn(
                                    styles.dayCell,
                                    !isSameMonth(day, monthStart) && styles.otherMonth,
                                    isSameDay(day, new Date()) && styles.today
                                )}
                            >
                                <span className={styles.dayNumber}>{format(day, "d")}</span>

                                {dayEvents.map(ev => (
                                    <div key={ev.id} className={cn(styles.event, ev.type === "deadline" ? styles.deadline : styles.meeting)}>
                                        {ev.title}
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
