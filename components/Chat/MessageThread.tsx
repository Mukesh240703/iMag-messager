"use client";

import { Phone, Video, MoreVertical, Paperclip, Send, Smile, File, X, Check, CheckCheck, Trash2 } from "lucide-react";
import styles from "./MessageThread.module.css";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { getMessages, sendMessage, uploadFile, setTypingStatus, heartbeat, deleteMessage, addReaction } from "@/actions/chatActions";
import EmojiPicker from 'emoji-picker-react';
import { toast, Toaster } from 'sonner';

import { useCall } from "@/context/CallContext";

export default function MessageThread({ chat }: { chat: any }) {
    const { startCall } = useCall();

    // ... rest of state

    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [showEmoji, setShowEmoji] = useState(false);
    const [attachment, setAttachment] = useState<File | null>(null);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // Status & Selection - NUCLEAR OPTION: ANY
    const [participantsStatus, setParticipantsStatus] = useState<any>({});
    const [participantDetails, setParticipantDetails] = useState<any>({});
    const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [activeMessageMenu, setActiveMessageMenu] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Request Notification Permission on mount & Heartbeat
    useEffect(() => {
        if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
            Notification.requestPermission();
        }

        // Initial heartbeat
        heartbeat().catch(() => { });
        const hbInterval = setInterval(() => heartbeat().catch(() => { }), 30000); // Every 30s
        return () => clearInterval(hbInterval);
    }, []);

    // Close menu on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setActiveMessageMenu(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Keep track of messages for comparison in interval/fetch
    const messagesRef = useRef(messages);
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Poll for new messages every 3 seconds (simple semi-realtime)
    useEffect(() => {
        if (!chat) return;

        async function fetchMsgs() {
            const data = await getMessages(chat._id);
            const msgs = data.messages || []; // Handle defined structure
            const typing = data.typingUsers || [];

            setParticipantsStatus(data.participantsStatus || {});
            setParticipantDetails(data.participantDetails || {});

            // Check for new messages to play sound/notify using REF to avoid stale closure or dependency loop
            const prevMessages = messagesRef.current;
            if (msgs.length > prevMessages.length && prevMessages.length > 0) {
                const newMsg = msgs[msgs.length - 1];
                if (newMsg.sender !== "me") {
                    // Sound
                    const audio = new Audio("https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3");
                    audio.play().catch(() => { });

                    // In-App Toast
                    toast(`New message from ${newMsg.senderName || chat.name}: ${newMsg.text}`);

                    // Browser Notification
                    if (Notification.permission === "granted" && document.hidden) {
                        new Notification(`New Message from ${newMsg.senderName || chat.name}`, {
                            body: newMsg.text || (newMsg.attachment ? "Sent an attachment" : ""),
                            icon: "/favicon.ico" // Placeholder
                        });
                    }
                }
            }
            setMessages(msgs);
            setTypingUsers(typing);
        }
        fetchMsgs();

        const interval = setInterval(fetchMsgs, 3000);
        return () => clearInterval(interval);
    }, [chat?._id]); // Only re-run if chat ID changes

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length, messages[messages.length - 1]?.id]);

    // Cleanup typing status on unmount or chat switch
    useEffect(() => {
        return () => {
            // We use a pragmatic approach: always try to clear typing on unmount if we were potentially typing
            // To avoid dependency loops, we just clear it unconditionally if we have a chat ID.
            if (chat?._id) {
                setTypingStatus(chat._id, false);
            }
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [chat?._id]);

    // Handle Typing
    const handleTyping = () => {
        if (!isTyping) {
            setIsTyping(true);
            setTypingStatus(chat._id, true);
        }

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Increased timeout to 4000ms to ensure it overlaps with the 3000ms polling interval
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTypingStatus(chat._id, false);
        }, 4000);
    }

    const handleSend = async () => {
        if ((!inputText.trim() && !attachment) || !chat) return;

        // Stop typing immediately on send
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsTyping(false);
        setTypingStatus(chat._id, false);

        let attachmentData: { url: string, type: string, name: string } | undefined = undefined;
        if (attachment) {
            const formData = new FormData();
            formData.append("file", attachment);
            // Upload logic
            const uploadRes = await uploadFile(formData);
            if (uploadRes.success && uploadRes.url && uploadRes.type && uploadRes.name) {
                attachmentData = {
                    url: uploadRes.url,
                    type: uploadRes.type,
                    name: uploadRes.name
                };
            } else {
                toast.error(uploadRes.error || "File upload failed");
                return;
            }
        }

        // Optimistic Update
        const tempId = Date.now();
        const newMessage = {
            id: tempId,
            text: inputText,
            sender: "me",
            attachment: attachmentData,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'sent'
        };
        setMessages([...messages, newMessage]);
        setInputText("");
        setAttachment(null);
        setShowEmoji(false);

        // Server Action
        await sendMessage(chat._id, newMessage.text, attachmentData);
        // poll will handle sync
    };

    const handleDelete = async (msgId: string) => {
        if (!confirm("Unsend this message for everyone?")) return;

        // Optimistic remove
        setMessages(prev => prev.filter(m => m.id !== msgId));
        setActiveMessageMenu(null);

        const res = await deleteMessage(chat._id, msgId);
        if (!res.success) {
            toast.error("Failed to delete message: " + res.error);
        }
    };

    const handleSelect = (msgId: string) => {
        setIsSelectMode(true);
        if (selectedMessages.includes(msgId)) {
            setSelectedMessages(prev => prev.filter(id => id !== msgId));
        } else {
            setSelectedMessages(prev => [...prev, msgId]);
        }
        setActiveMessageMenu(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    }

    const onEmojiClick = (emojiObject: any) => {
        setInputText(prev => prev + emojiObject.emoji);
    };

    const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setAttachment(e.target.files[0]);
        }
    }

    if (!chat) return <div className={styles.container} style={{ justifyContent: 'center', alignItems: 'center', color: '#888' }}>Select a chat to start messaging</div>;

    // Construct Header Status
    let headerStatus = "";
    if (typingUsers.length > 0) {
        if (chat.type === 'direct') {
            headerStatus = "Typing...";
        } else {
            // Group
            headerStatus = `${typingUsers.join(", ")} ${typingUsers.length > 1 ? 'are' : 'is'} typing...`;
        }
    } else if (chat.type === 'group') {
        headerStatus = `${chat.participants?.length || 0} members`;
    } else {
        // Direct Chat Online Logic
        const onlineThreshold = 2 * 60 * 1000; // 2 minutes
        const now = new Date();
        let foundOnline = false;
        let lastSeen: any = null;

        // Fix: Use generic iteration to avoid narrow types
        Object.entries(participantsStatus).forEach(([key, val]) => {
            if (!val) return;
            // Parse date safely
            const activeDate = new Date(val as string);
            const isValidDate = activeDate instanceof Date && !isNaN(activeDate.getTime());

            if (isValidDate) {
                const diff = now.getTime() - activeDate.getTime();
                if (diff < onlineThreshold) {
                    foundOnline = true;
                }
                if (!lastSeen || activeDate > lastSeen) {
                    lastSeen = activeDate;
                }
            }
        });

        if (foundOnline) {
            headerStatus = "Online";
        } else if (lastSeen && !isNaN(lastSeen.getTime()) && lastSeen.getTime() > 0) {
            headerStatus = `Last seen ${lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            headerStatus = "Offline";
        }
    }

    return (
        <div className={styles.container}>
            <Toaster position="top-right" />

            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerUserInfo}>
                    <div className={styles.headerAvatar} style={{ backgroundColor: chat.avatarColor || '#0052cc' }}>
                        {(chat.avatarUrl || (chat.type === 'direct' && Object.values(participantDetails)[0] && (participantDetails as any)[Object.keys(participantDetails)[0] as string]?.avatarUrl)) ? (
                            <img
                                src={chat.avatarUrl || (participantDetails as any)[Object.keys(participantDetails)[0] as string]?.avatarUrl}
                                alt={chat.name}
                                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                            />
                        ) : (
                            chat.name ? chat.name.substring(0, 2).toUpperCase() : "?"
                        )}
                    </div>
                    <div className={styles.headerDetails}>
                        <span className={styles.headerName}>{chat.name}</span>
                        <span className={styles.headerStatus} style={{ color: headerStatus === 'Typing...' || headerStatus === 'Online' ? '#10b981' : 'inherit', fontWeight: (headerStatus === 'Typing...' || headerStatus === 'Online') ? 'bold' : 'normal' }}>
                            {headerStatus}
                        </span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.actionBtn} onClick={() => {
                        if (chat.type === 'direct') {
                            const other = chat.participants.find((p: string) => p !== "me" && p !== "myself"); // We need actual email. 
                            // In this component 'participants' array in 'chat' object might be name or email depending on how it was passed.
                            // Let's rely on finding the other participant's email from the 'participantDetails' or 'participantsStatus' keys if possible,
                            // OR better, look at how getChats constructed it. 

                            // The 'chat' object from getChats has participants: [email1, email2]. 
                            // But wait, the 'chat' prop passed here comes from 'selectedChat'.
                            // Let's debug/assume: 'chat.participants' is an array of emails.

                            // We need to find the participant that is NOT me.
                            // But we don't have 'session' or 'me' easily accessible inside the click handler without prop drilling or assumption.
                            // However, MessageThread doesn't receive 'user' prop. It calls independent actions.
                            // BUT, we can iterate 'participantDetails' keys which are emails.

                            const emails = Object.keys(participantDetails);
                            // If direct chat, pick the first one that isn't the header name (imperfect) or just pick the first key if length is 1 (other user).
                            // Wait, participantDetails includes everyone usually.
                            // Let's just pick the first key that works? 
                            // A better way is: "The keys of participantDetails are emails".

                            if (emails.length > 0) {
                                // Just pick the first one? In direct chat, usually only the other person is in participantDetails logic in getMessages?
                                // Let's check getMessages... 
                                // "participants" query includes everyone. 
                                // So participantDetails has keys for everyone.
                                // We need to filter out 'me'. 
                                // We don't have 'me' email in this component state directly, but we do have it in 'messages' sender check ("me" vs "them").
                                // Actually, we don't have the current user's email stored. 

                                // HACK: In 'getMessages' we see 'participantsStatus' excludes self.
                                const otherEmail = Object.keys(participantsStatus)[0];
                                if (otherEmail) startCall(otherEmail, false);
                                else alert("Cannot call: User offline or unknown");
                            }
                        } else {
                            alert("Group calling not supported yet");
                        }
                    }}><Phone size={20} /></button>

                    <button className={styles.actionBtn} onClick={() => {
                        if (chat.type === 'direct') {
                            const otherEmail = Object.keys(participantsStatus)[0];
                            if (otherEmail) startCall(otherEmail, true);
                            else alert("Cannot call: User offline or unknown");
                        } else {
                            alert("Group calling not supported yet");
                        }
                    }}><Video size={20} /></button>

                    <button className={styles.actionBtn}><MoreVertical size={20} /></button>
                </div>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
                {messages.map((msg) => (
                    <div key={msg.id} className={cn(styles.messageRow, msg.sender === "me" ? styles.sent : styles.received)}>

                        {/* Select Mode Checkbox */}
                        {isSelectMode && (
                            <input
                                type="checkbox"
                                checked={selectedMessages.includes(msg.id)}
                                onChange={() => handleSelect(msg.id)}
                                style={{ margin: '0 10px', alignSelf: 'center', width: 16, height: 16 }}
                            />
                        )}

                        <div
                            className={styles.bubble}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setActiveMessageMenu(msg.id);
                            }}
                            onClick={() => {
                                // Tap to select if in mode?
                                if (isSelectMode) handleSelect(msg.id);
                                else if (activeMessageMenu) setActiveMessageMenu(null);
                            }}
                            style={{ position: 'relative', userSelect: 'none' }}
                        >
                            {msg.attachment && (
                                <div style={{ marginBottom: msg.text ? 5 : 0 }}>
                                    {msg.attachment.type === 'image' ? (
                                        <img src={msg.attachment.url} alt="attachment" style={{ maxWidth: '200px', borderRadius: '8px' }} />
                                    ) : (
                                        <a href={msg.attachment.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'inherit', textDecoration: 'underline' }}>
                                            <File size={16} /> {msg.attachment.name}
                                        </a>
                                    )}
                                </div>
                            )}
                            {msg.text}

                            {/* Read Receipts */}
                            {msg.sender === "me" && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                                    {msg.status === 'seen' ? (
                                        <CheckCheck size={14} color="#3b82f6" />
                                    ) : msg.status === 'delivered' ? (
                                        <CheckCheck size={14} color="#9ca3af" />
                                    ) : (
                                        <Check size={14} color="#9ca3af" />
                                    )}
                                </div>
                            )}

                            {/* Context Menu (Dropdown) */}
                            {activeMessageMenu === msg.id && (
                                <div ref={menuRef} style={{
                                    position: 'absolute',
                                    top: '100%',
                                    right: msg.sender === 'me' ? 0 : 'auto',
                                    left: msg.sender === 'me' ? 'auto' : 0,
                                    background: 'white',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    borderRadius: '8px',
                                    padding: '5px',
                                    zIndex: 100,
                                    minWidth: '150px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px'
                                }}>
                                    {/* Quick Reactions */}
                                    <div style={{ padding: '8px', display: 'flex', gap: '5px', borderBottom: '1px solid #eee' }}>
                                        {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => (
                                            <button
                                                key={emoji}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    setActiveMessageMenu(null);
                                                    // Optimistic update
                                                    const currentUserEmail = (chat as any).currentUserEmail || "me"; // We need to pass this prop ideally or infer
                                                    // Actually we can't easily infer without passing it.
                                                    // Let's use "me" for now and see if display logic handles it?
                                                    // Display logic only counts. So "me" is fine for counting.
                                                    // But for TOGGLE, we need to find if we already reacted.
                                                    // We can look for a reaction where user === "me" OR user === realEmail.
                                                    // Since we don't know realEmail, we might duplicate reactions if we use "me" and backend uses real email.
                                                    // But the next poll (3s) will fix it.

                                                    setMessages(prev => prev.map(m => {
                                                        if (m.id === msg.id) {
                                                            const newReactions = m.reactions ? [...m.reactions] : [];
                                                            // Simple add for now (toggle is hard without knowing which one is mine comfortably)
                                                            // We'll just push. Backend handles dedup/toggle. Poll aligns it.
                                                            newReactions.push({ emoji, user: 'temp_me' });
                                                            return { ...m, reactions: newReactions };
                                                        }
                                                        return m;
                                                    }));

                                                    await addReaction(chat._id, msg.id, emoji);
                                                }}
                                                style={{ border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer', padding: 0 }}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSelect(msg.id); }}
                                        style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#333', borderRadius: 4 }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <Check size={14} /> Select
                                    </button>
                                    {msg.sender === "me" && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(msg.id); }}
                                            style={{ padding: '8px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', borderRadius: 4 }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <Trash2 size={14} /> Unsend
                                        </button>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Display Reactions Outside Bubble */}
                        {msg.reactions && msg.reactions.length > 0 && (
                            <div style={{
                                display: 'flex',
                                gap: '4px',
                                marginTop: '-10px', // Overlap slightly
                                marginLeft: msg.sender !== 'me' ? '10px' : 0,
                                marginRight: msg.sender === 'me' ? '10px' : 0,
                                zIndex: 5,
                                flexWrap: 'wrap',
                                justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start'
                            }}>
                                {/* Group reactions by emoji */}
                                {Object.entries(msg.reactions.reduce((acc: any, curr: any) => {
                                    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                    return acc;
                                }, {})).map(([emoji, count]) => (
                                    <div key={emoji} style={{
                                        backgroundColor: 'var(--bg-app)', // Use app bg (white) to stand out against page
                                        border: '1px solid var(--border-light)',
                                        padding: '2px 6px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '2px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        cursor: 'pointer'
                                    }}>
                                        <span>{emoji}</span>
                                        {(count as number) > 1 && <span style={{ fontWeight: 'bold', fontSize: '10px' }}>{count as number}</span>}
                                    </div>
                                ))}
                            </div>
                        )}
                        <span className={styles.timestamp}>{msg.time}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Select Mode Toolbar */}
            {isSelectMode && (
                <div style={{ padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>{selectedMessages.length} Selected</span>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { setIsSelectMode(false); setSelectedMessages([]); }} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #ccc', background: 'white', cursor: 'pointer' }}>Cancel</button>
                        <button
                            onClick={() => {
                                // Delete logic for batch (not implemented in backend yet, just UI)
                                alert("Batch delete coming soon");
                            }}
                            style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            )}


            {/* Input */}
            {!isSelectMode && (
                <div className={styles.inputArea}>
                    <button className={styles.actionBtn} style={{ width: 36, height: 36 }} onClick={() => fileInputRef.current?.click()}>
                        <Paperclip size={18} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={onFileSelect}
                    />

                    {attachment && (
                        <div style={{ position: 'absolute', bottom: '60px', left: '20px', background: 'white', padding: '5px 10px', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span style={{ fontSize: '12px' }}>{attachment.name}</span>
                            <button onClick={() => setAttachment(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><X size={14} /></button>
                        </div>
                    )}

                    {showEmoji && (
                        <div style={{ position: 'absolute', bottom: '70px', right: '20px', zIndex: 50 }}>
                            <EmojiPicker onEmojiClick={onEmojiClick} />
                        </div>
                    )}

                    <div className={styles.inputWrapper}>
                        <input
                            type="text"
                            placeholder="Type a message..."
                            className={styles.input}
                            value={inputText}
                            onChange={(e) => {
                                setInputText(e.target.value);
                                handleTyping();
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSend();
                            }}
                        />
                        <button
                            className={cn(styles.actionBtn, "border-none")}
                            style={{ width: 30, height: 30, border: 'none' }}
                            onClick={() => setShowEmoji(!showEmoji)}
                        >
                            <Smile size={18} />
                        </button>
                    </div>
                    <button className={styles.sendBtn} onClick={handleSend}>
                        <Send size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
