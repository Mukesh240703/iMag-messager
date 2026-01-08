"use server";

import connectDB from "@/lib/db";
import Chat, { IMessage } from "@/models/Chat";
import User from "@/models/User";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { getSession } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";

export async function heartbeat() {
    try {
        await connectDB();
        const session = await getSession();
        if (session?.user?.id) {
            // Force update with $set
            // console.log(`[HEARTBEAT] ${session.user.email} at ${new Date().toISOString()}`);
            await User.findByIdAndUpdate(session.user.id, { $set: { lastActive: new Date() } });
        }
    } catch (e) {
        console.error("Heartbeat error:", e);
    }
}

export async function getChats() {
    await connectDB();
    const session = await getSession();
    if (!session?.user?.email) return [];

    const currentUserEmail = session.user.email;
    const currentUserName = session.user.name;

    // Find chats where user is a participant
    const chats = await Chat.find({ participants: { $in: [currentUserEmail] } }).sort({ updatedAt: -1 }).lean();

    // Collect all other participants emails to fetch their details
    const otherEmails = new Set<string>();
    chats.forEach((chat: any) => {
        if (chat.type === 'direct') {
            chat.participants.forEach((p: string) => {
                if (p !== currentUserEmail) otherEmails.add(p);
            });
        }
    });

    // Fetch users
    const users = await User.find({ email: { $in: Array.from(otherEmails) } }).lean();
    const userMap = new Map(users.map(u => [u.email, u]));

    // Convert _id to string for serialization & Fix Display Names for Direct Chats
    return chats.map(chat => {
        let displayName = chat.name;
        let avatarColor = chat.avatarColor;

        if (chat.type === 'direct') {
            const otherEmail = chat.participants.find((p: string) => p !== currentUserEmail);
            if (otherEmail) {
                const otherUser = userMap.get(otherEmail);
                if (otherUser) {
                    displayName = otherUser.name;
                    avatarColor = otherUser.avatarColor || avatarColor;
                    (chat as any).avatarUrl = otherUser.avatarUrl; // Add avatarUrl (casting to any to bypass strict type for now)
                } else {
                    displayName = otherEmail; // Fallback
                }
            }
        }

        return {
            ...chat,
            _id: chat._id.toString(),
            name: displayName,
            avatarColor,
            avatarUrl: (chat as any).avatarUrl,
            messages: chat.messages?.map((m: any) => ({ ...m, _id: m._id?.toString() }))
        };
    });
}

export async function seedChats() {
    await Chat.create([
        {
            name: "Design Team",
            type: 'group',
            avatarColor: "#0052cc",
            messages: [{ sender: "them", text: "Can we review the logo?", createdAt: new Date() }],
            lastMessage: "Can we review the logo?",
            lastMessageTime: "10:30 AM",
            unreadCount: 2
        },
        {
            name: "Sarah Connor",
            type: 'direct',
            avatarColor: "#f59e0b",
            messages: [{ sender: "them", text: "Meeting rescheduled.", createdAt: new Date() }],
            lastMessage: "Meeting rescheduled.",
            lastMessageTime: "9:15 AM"
        }
    ]);
}

export async function createGroup(name: string) {
    await connectDB();
    const session = await getSession();
    if (!session?.user?.email) return { success: false, error: "Not authenticated" };

    const newChat = await Chat.create({
        name,
        type: 'group',
        avatarColor: '#0052cc', // Default blue
        participants: [session.user.email], // Add creator
        messages: [],
        unreadCount: 0,
        lastMessage: "Group created",
        lastMessageTime: "Just now"
    });
    revalidatePath('/chat');
    return { success: true, id: newChat._id.toString() };
}

export async function createDirectChat(email: string) {
    await connectDB();
    const session = await getSession();
    if (!session?.user?.email) return { success: false, error: "Not authenticated" };

    if (email === session.user.email) return { success: false, error: "Cannot chat with yourself" };

    // Check if target user exists
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
        return { success: false, error: "User not found" };
    }

    // Check if chat already exists
    const existingChat = await Chat.findOne({
        type: 'direct',
        participants: { $all: [session.user.email, email] }
    });

    if (existingChat) {
        return { success: true, id: existingChat._id.toString() };
    }

    // Create new DM
    const newChat = await Chat.create({
        name: targetUser.name, // This is just a fallback name in DB
        type: 'direct',
        avatarColor: targetUser.avatarColor || '#f59e0b',
        participants: [session.user.email, email],
        messages: [],
        unreadCount: 0,
        lastMessage: "Start chatting",
        lastMessageTime: ""
    });

    revalidatePath('/chat');
    return { success: true, id: newChat._id.toString() };
}


export async function uploadFile(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) return { success: false };

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = Date.now() + "_" + file.name.replaceAll(" ", "_");
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    try {
        await writeFile(path.join(uploadDir, filename), buffer);
    } catch (error) {
        return { success: false, error: "Upload failed" };
    }

    return { success: true, url: `/uploads/${filename}`, name: file.name, type: file.type.startsWith("image/") ? "image" : "file" };
}

export async function sendMessage(chatId: string, text: string, attachment?: { url: string, type: string, name: string }) {
    try {
        await connectDB();
        const session = await getSession();
        if (!session?.user?.email) return { success: false };

        const chat = await Chat.findById(chatId);
        if (!chat) return { success: false };

        const newMessage = {
            sender: session.user.email,
            text: text || (attachment ? (attachment.type === 'image' ? 'Sent an image' : 'Sent a file') : ''),
            attachment,
            createdAt: new Date(),
            status: 'sent' as 'sent'
        };

        chat.messages.push(newMessage);
        chat.lastMessage = newMessage.text;
        chat.lastMessageTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (attachment) chat.lastMessage = "📎 " + (text || "Attachment");

        // Clear sender from typing list if they send a message
        if (chat.typingUsers) {
            chat.typingUsers = chat.typingUsers.filter((u: string) => u !== session.user.email);
        }

        await chat.save();

        revalidatePath('/chat');
        return { success: true };
    } catch (e) {
        console.error("SendMessage error:", e);
        return { success: false, error: "Failed to send message" };
    }
}

export async function setTypingStatus(chatId: string, isTyping: boolean) {
    try {
        await connectDB();
        const session = await getSession();
        if (!session?.user?.email) return { success: false };

        if (isTyping) {
            await Chat.findByIdAndUpdate(chatId, { $addToSet: { typingUsers: session.user.email } });
        } else {
            await Chat.findByIdAndUpdate(chatId, { $pull: { typingUsers: session.user.email } });
        }

        return { success: true };
    } catch (e) {
        // console.error("TypingStatus error:", e);
        return { success: false };
    }
}

export async function getMessages(chatId: string) {
    noStore(); // Opt out of static caching
    try {
        await connectDB();
        const session = await getSession();
        const currentUserEmail = session?.user?.email;

        // Use findById to get Mongoose document (not lean) so we can save
        const chat = await Chat.findById(chatId);
        if (!chat) return { messages: [], typingUsers: [] };

        // Mark messages as seen if they are not from me and not already seen
        if (currentUserEmail) {
            let needsSave = false;
            chat.messages.forEach((m: any) => {
                if (m.sender !== currentUserEmail && m.status !== 'seen') {
                    m.status = 'seen';
                    needsSave = true;
                }
            });
            if (needsSave) {
                await chat.save();
            }
        }

        // Resolve typing users to names
        let typingNames: string[] = [];
        if (chat.typingUsers && chat.typingUsers.length > 0) {
            const typingEmails = chat.typingUsers.filter((e: string) => e !== currentUserEmail);
            if (typingEmails.length > 0) {
                const users = await User.find({ email: { $in: typingEmails } }).select('name').lean();
                typingNames = users.map(u => u.name);
            }
        }

        // Resolve Sender Names & Online Status for Delivery Check
        // Case-insensitive lookup for participants with proper escaping
        const escapeRegExp = (string: string) => {
            return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        };

        const participantsQuery = Array.isArray(chat.participants)
            ? chat.participants.map((e: string) => new RegExp(`^${escapeRegExp(e)}$`, 'i'))
            : [];

        const participants = await User.find({
            email: { $in: participantsQuery }
        }).select('email name lastActive avatarUrl avatarColor').lean();

        // Create map with lowercased keys for easier lookup if needed, or just standard
        const userMap = new Map();
        participants.forEach(u => {
            userMap.set(u.email, u); // Standard
            userMap.set(u.email.toLowerCase(), u); // Lowercase fallback
        });

        // serialized
        const messages = chat.messages.map((m: any) => {
            let status = m.status || 'sent';

            // Dynamic Delivery Check: If status is 'sent' but recipient was active recently
            if (status === 'sent' && m.sender === currentUserEmail) {
                const otherParticipants = participants.filter(p => p.email !== currentUserEmail);
                // Delivery assumption: If they were active AFTER the message was created
                const isDelivered = otherParticipants.some(p => p.lastActive && new Date(p.lastActive) > new Date(m.createdAt));
                if (isDelivered) status = 'delivered';
            }

            return {
                id: m._id.toString(),
                text: m.text,
                sender: m.sender === currentUserEmail ? "me" : "them",
                senderName: userMap.get(m.sender)?.name || m.sender,
                senderAvatarUrl: userMap.get(m.sender)?.avatarUrl, // Pass sender avatar for group chats
                attachment: (m.attachment && m.attachment.url) ? {
                    url: m.attachment.url,
                    type: m.attachment.type,
                    name: m.attachment.name
                } : undefined,
                time: m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                status: status
            };
        });

        // Map participant status for frontend
        const participantsStatus = participants.reduce((acc, p) => {
            if (p.email === currentUserEmail) return acc; // Exclude self from status check to prevent false "Online" positive
            acc[p.email] = p.lastActive ? new Date(p.lastActive).toISOString() : undefined;
            return acc;
        }, {} as Record<string, string | undefined>);

        // Map participant details for header
        const participantDetails = participants.reduce((acc, p) => {
            acc[p.email] = {
                name: p.name,
                avatarUrl: p.avatarUrl,
                avatarColor: p.avatarColor
            };
            return acc;
        }, {} as Record<string, { name: string, avatarUrl?: string, avatarColor?: string }>);

        return { messages, typingUsers: typingNames, participantsStatus, participantDetails };
    } catch (error) {
        console.error("Error in getMessages:", error);
        return { messages: [], typingUsers: [], participantsStatus: {}, error: "Failed to fetch messages" };
    }
}

export async function deleteMessage(chatId: string, messageId: string) {
    await connectDB();
    const session = await getSession();
    if (!session?.user?.email) return { success: false };

    const chat = await Chat.findById(chatId);
    if (!chat) return { success: false };

    // Find and remove message
    // We can either physically delete or mark as deleted. Since users often want "Unsend", let's remove it.
    // However, if we want "Delete for me" vs "Delete for everyone", that requires more schema. 
    // For now, "Unsend" (Delete for everyone) is easier to implement by just removing it from the array.

    // Filter out the message
    // Note: Mongoose subdoc array removal
    // Verify ownership? Usually you can only delete your own messages.
    const msgIndex = chat.messages.findIndex((m: any) => m._id.toString() === messageId);
    if (msgIndex === -1) return { success: false, error: "Message not found" };

    // Check ownership
    if (chat.messages[msgIndex].sender !== session.user.email) {
        return { success: false, error: "Cannot delete others' messages" };
    }

    chat.messages.splice(msgIndex, 1);

    // Update last message if needed
    if (chat.messages.length > 0) {
        const lastMsg = chat.messages[chat.messages.length - 1];
        chat.lastMessage = lastMsg.attachment ? "📎 Attachment" : lastMsg.text;
        chat.lastMessageTime = new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        chat.lastMessage = "";
        chat.lastMessageTime = "";
    }

    await chat.save();
    revalidatePath('/chat');
    return { success: true };
}
