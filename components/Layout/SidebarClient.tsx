"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Phone, Calendar as CalendarIcon, Cloud, Bot, Bell, MoreHorizontal, Plus } from "lucide-react";
import styles from "./Sidebar.module.css";
import { cn } from "@/lib/utils";
import { useState } from "react";
import ProfileModal from "./ProfileModal";

interface SidebarClientProps {
    userName: string;
    avatarColor?: string;
    avatarUrl?: string;
    unreadCount?: number;
}

export default function SidebarClient({ userName, avatarColor, avatarUrl, unreadCount }: SidebarClientProps) {
    const pathname = usePathname();
    const [profileOpen, setProfileOpen] = useState(false);

    const navItems = [
        { name: "Chat", href: "/chat", icon: MessageSquare, badge: unreadCount },
        { name: "Calendar", href: "/calendar", icon: CalendarIcon },
        { name: "Calls", href: "/calls", icon: Phone },
        { name: "OneDrive", href: "#", icon: Cloud, disabled: true },
        { name: "Copilot", href: "#", icon: Bot, disabled: true },
    ];

    const bottomItems = [
        { name: "Activity", href: "#", icon: Bell, disabled: true },
        { name: "More", href: "#", icon: MoreHorizontal, disabled: true },
        { name: "Apps", href: "#", icon: Plus, disabled: true },
    ];

    return (
        <>
            <aside className={styles.sidebar}>
                {/* Apps / Top Area */}
                {/* Using a pseudo-logo or just the top spacing based on image */}

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(styles.navItem, isActive && styles.active)}
                                onClick={(e) => item.disabled && e.preventDefault()}
                            >
                                <div className={styles.iconWrapper}>
                                    {isActive && <div className={styles.activeIndicator} />}
                                    <Icon className={styles.icon} strokeWidth={1.5} />
                                    {item.badge ? (
                                        <div className={styles.badge}>{item.badge}</div>
                                    ) : null}
                                </div>
                                <span className={styles.label}>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.bottomNav}>
                    {bottomItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button key={item.name} className={styles.navItem} style={{ border: 'none', background: 'transparent' }}>
                                <div className={styles.iconWrapper}>
                                    <Icon className={styles.icon} strokeWidth={1.5} />
                                </div>
                                <span className={styles.label}>{item.name}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Profile Avatar at Bottom */}
                <div className={styles.userProfile} onClick={() => setProfileOpen(true)}>
                    {avatarUrl ? (
                        <img src={avatarUrl} alt={userName} className={styles.avatarImg} />
                    ) : (
                        <div className={styles.avatar} style={{ backgroundColor: avatarColor || '#0052cc' }}>
                            {userName.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                </div>
            </aside>

            <ProfileModal
                open={profileOpen}
                onOpenChange={setProfileOpen}
                currentName={userName}
                currentAvatarColor={avatarColor}
                currentAvatarUrl={avatarUrl}
            />
        </>
    );
}
