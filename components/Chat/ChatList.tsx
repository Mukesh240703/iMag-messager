"use client";

import { Search, Plus, Users, MessageSquarePlus } from "lucide-react";
import styles from "./ChatList.module.css";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { getChats, createGroup, createDirectChat } from "@/actions/chatActions";
import ProfileModal from "../Layout/ProfileModal";

export default function ChatList({ onSelectChat, user }: { onSelectChat: (chat: any) => void, user: any }) {
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [profileOpen, setProfileOpen] = useState(false);

    useEffect(() => {
        async function loadChats() {
            try {
                const data = await getChats();
                setChats(data);
                if (data.length > 0) onSelectChat(data[0]);
            } catch (e) {
                console.error("Failed to load chats", e);
            } finally {
                setLoading(false);
            }
        }
        loadChats();
    }, [onSelectChat]);

    const handleCreateGroup = async () => {
        const name = prompt("Enter Group Name:");
        if (name) {
            const res = await createGroup(name);
            if (res.success) {
                const data = await getChats();
                setChats(data);
            }
        }
    }

    const handleCreateDirectChat = async () => {
        const email = prompt("Enter User Email to chat with:");
        if (email) {
            const res = await createDirectChat(email);
            if (res.success) {
                const data = await getChats();
                setChats(data);
            } else {
                alert(res.error || "Failed to find user");
            }
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {user && (
                            <div
                                style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    backgroundColor: user.avatarColor || '#0052cc',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '0.8rem',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    overflow: 'hidden' // Ensure image stays in circle
                                }}
                                onClick={() => setProfileOpen(true)}
                                title="Edit Profile"
                            >
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    user.name.substring(0, 2).toUpperCase()
                                )}
                            </div>
                        )}
                        <h2 className={styles.title}>Messages</h2>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className={styles.createGroupBtn} onClick={handleCreateDirectChat} title="New Direct Message">
                            <MessageSquarePlus size={20} />
                        </button>
                        <button className={styles.createGroupBtn} onClick={handleCreateGroup} title="Create Group">
                            <Plus size={20} />
                        </button>
                    </div>
                </div>

                <ProfileModal
                    open={profileOpen}
                    onOpenChange={setProfileOpen}
                    currentName={user?.name || ""}
                    currentAvatarColor={user?.avatarColor}
                />
                <div className={styles.searchWrapper}>
                    <Search className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search messages..."
                        className={styles.searchInput}
                    />
                </div>
            </div>

            <div className={styles.list}>
                {loading && <div className="p-4 text-center text-gray-500">Loading chats...</div>}
                {!loading && chats.length === 0 && <div className="p-4 text-center text-gray-500">No chats yet. Start one!</div>}
                {chats.map((chat) => (
                    <div key={chat._id} className={cn(styles.item)} onClick={() => onSelectChat(chat)}>
                        <div className={styles.avatar} style={{ backgroundColor: chat.avatarColor || '#0052cc' }}>
                            {chat.avatarUrl ? (
                                <img src={chat.avatarUrl} alt={chat.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                                chat.type === 'group' ? <Users size={20} /> : (chat.name ? chat.name.substring(0, 2).toUpperCase() : "?")
                            )}
                        </div>
                        <div className={styles.content}>
                            <div className={styles.topRow}>
                                <span className={styles.name}>{chat.name || "Unknown"}</span>
                                <span className={styles.time}>{chat.lastMessageTime}</span>
                            </div>
                            <div className={styles.topRow}>
                                <p className={styles.messagePreview}>{chat.lastMessage}</p>
                                {chat.unreadCount > 0 && (
                                    <span className={styles.unreadBadge}>{chat.unreadCount}</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
