"use server";

import connectDB from "@/lib/db";
import Call from "@/models/Call";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function logCall(data: {
    caller: string,
    receiver: string,
    type: 'audio' | 'video',
    status: 'completed' | 'missed' | 'rejected' | 'busy',
    startTime: Date,
    endTime?: Date
}) {
    try {
        await connectDB();

        let duration = "";
        if (data.endTime && data.startTime) {
            const diffMs = new Date(data.endTime).getTime() - new Date(data.startTime).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 60) {
                duration = `${diffMins}m`;
            } else {
                const hours = Math.floor(diffMins / 60);
                const mins = diffMins % 60;
                duration = `${hours}h ${mins}m`;
            }
        }

        await Call.create({
            ...data,
            participants: [data.caller, data.receiver],
            duration
        });

        revalidatePath('/calls');
        return { success: true };
    } catch (e) {
        console.error("LogCall error:", e);
        return { success: false };
    }
}

export async function getCallHistory() {
    try {
        await connectDB();
        const session = await getSession();
        if (!session?.user?.email) return [];

        const calls = await Call.find({ participants: { $in: [session.user.email] } })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        // Fetch user details for names/avatars
        // Collect all distinct emails excluding self
        const contactsSet = new Set<string>();
        calls.forEach((c: any) => {
            c.participants.forEach((p: string) => {
                if (p !== session.user.email) contactsSet.add(p);
            });
        });

        const users = await User.find({ email: { $in: Array.from(contactsSet) } }).lean();
        const userMap = new Map(users.map(u => [u.email, u]));

        return calls.map((c: any) => {
            const otherEmail = c.participants.find((p: string) => p !== session.user.email) || c.caller; // Fallback to caller if self call?
            const otherUser = userMap.get(otherEmail);

            return {
                id: c._id.toString(),
                name: otherUser ? otherUser.name : otherEmail,
                email: otherEmail, // Needed for redial
                avatarUrl: otherUser?.avatarUrl,
                avatarColor: otherUser?.avatarColor,
                time: new Date(c.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                type: c.type,
                direction: c.caller === session.user.email ? "outgoing" : "incoming",
                duration: c.duration || (c.status === 'completed' ? '0m' : ''),
                missed: c.status === 'missed',
                status: c.status
            };
        });
    } catch (e) {
        console.error("GetCallHistory error:", e);
        return [];
    }
}
