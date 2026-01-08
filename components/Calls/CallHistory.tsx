"use client";

import { Phone, Video, ArrowDownLeft, ArrowUpRight, Plus } from "lucide-react";
import styles from "./CallHistory.module.css";
import { cn } from "@/lib/utils";

const calls = [
    { id: 1, name: "Design Team", time: "Today, 10:00 AM", type: "video", direction: "incoming", duration: "45m", missed: false },
    { id: 2, name: "Sarah Connor", time: "Yesterday, 4:20 PM", type: "audio", direction: "outgoing", duration: "12m", missed: false },
    { id: 3, name: "John Doe", time: "Yesterday, 2:00 PM", type: "audio", direction: "incoming", duration: "0m", missed: true },
    { id: 4, name: "Client Meeting", time: "Mon, 11:30 AM", type: "video", direction: "incoming", duration: "1h 20m", missed: false },
];

export default function CallHistory() {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Recent Calls</h2>
                <button className={styles.startCallBtn}>
                    <Plus size={20} />
                    New Call
                </button>
            </div>

            <div className={styles.list}>
                {calls.map((call) => (
                    <div key={call.id} className={styles.item}>
                        <div className={styles.userInfo}>
                            <div className={styles.avatar}>
                                {call.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className={styles.details}>
                                <span className={styles.name}>{call.name}</span>
                                <span className={cn(styles.time, call.missed && styles.missed)}>
                                    {call.direction === "incoming" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                                    {call.time}
                                    {!call.missed && ` • ${call.duration}`}
                                    {call.missed && " • Missed Call"}
                                </span>
                            </div>
                        </div>
                        <div className={styles.typeIcon}>
                            {call.type === "video" ? <Video size={20} /> : <Phone size={20} />}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
