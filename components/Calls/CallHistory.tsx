"use client";

import { Phone, Video, ArrowDownLeft, ArrowUpRight, Plus, RefreshCcw } from "lucide-react";
import styles from "./CallHistory.module.css";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getCallHistory } from "@/actions/callActions";
import { useCall } from "@/context/CallContext";

export default function CallHistory() {
    const [calls, setCalls] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { startCall } = useCall();

    const fetchCalls = async () => {
        setLoading(true);
        const history = await getCallHistory();
        setCalls(history);
        setLoading(false);
    };

    useEffect(() => {
        fetchCalls();
    }, []);

    const handleCall = (email: string, type: 'audio' | 'video') => {
        if (!email) return;
        startCall(email, type === 'video');
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Recent Calls</h2>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className={styles.startCallBtn} onClick={fetchCalls} title="Refresh">
                        <RefreshCcw size={16} />
                    </button>
                    {/* New Call button could open a modal or just be decorative for now */}
                    <button className={styles.startCallBtn}>
                        <Plus size={20} />
                        New Call
                    </button>
                </div>
            </div>

            <div className={styles.list}>
                {loading && <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Loading history...</div>}

                {!loading && calls.length === 0 && (
                    <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No recent calls</div>
                )}

                {calls.map((call) => (
                    <div key={call.id} className={styles.item} onClick={() => handleCall(call.email, call.type)}>
                        <div className={styles.userInfo}>
                            <div className={styles.avatar} style={{ backgroundColor: call.avatarColor || '#0052cc' }}>
                                {call.avatarUrl ? (
                                    <img src={call.avatarUrl} alt={call.name} style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                                ) : (
                                    call.name.substring(0, 2).toUpperCase()
                                )}
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
