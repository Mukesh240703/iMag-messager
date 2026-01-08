"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { MessageSquare, Phone, Calendar as CalendarIcon, LogOut, User } from "lucide-react";
import styles from "./Sidebar.module.css";
import { cn } from "@/lib/utils";
import { logout } from "@/actions/authActions";
import { useState } from "react";
import ProfileModal from "./ProfileModal";

interface SidebarClientProps {
    userName: string;
    avatarColor?: string;
    avatarUrl?: string;
}

export default function SidebarClient({ userName, avatarColor, avatarUrl }: SidebarClientProps) {
    const pathname = usePathname();

    const navItems = [
        { name: "Chat", href: "/chat", icon: MessageSquare },
        { name: "Calls", href: "/calls", icon: Phone },
        { name: "Calendar", href: "/calendar", icon: CalendarIcon },
    ];

    const [profileOpen, setProfileOpen] = useState(false);

    return (
        <>
            <aside className={styles.sidebar}>
                <div className={styles.logoContainer}>
                    <Image
                        src="/logo.png"
                        alt="iMag Logo"
                        width={40}
                        height={40}
                        className={styles.logoImage}
                        priority
                    />
                    <span className={styles.appName}>iMag-Messager</span>
                </div>

                <nav className={styles.nav}>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(styles.navItem, isActive && styles.active)}
                            >
                                <Icon className={styles.icon} />
                                <span>{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className={styles.userProfile} onClick={() => setProfileOpen(true)} style={{ cursor: 'pointer' }}>
                    {avatarUrl ? (
                        <div className={styles.avatar}>
                            <img src={avatarUrl} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        </div>
                    ) : (
                        <div className={styles.avatar} style={{ backgroundColor: avatarColor || '#0052cc' }}>
                            {userName.substring(0, 2).toUpperCase()}
                        </div>
                    )}
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{userName}</span>
                        <span className={styles.userStatus}>Online</span>
                    </div>
                    {/* Removed direct logout button, moved to modal */}
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
