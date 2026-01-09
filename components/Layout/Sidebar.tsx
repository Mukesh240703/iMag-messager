import { getSession } from "@/lib/auth";
import SidebarClient from "./SidebarClient";
import { getTotalUnreadCount } from "@/actions/chatActions";

export default async function Sidebar() {
    const session = await getSession();
    const userName = session?.user?.name || "Guest";
    const avatarColor = session?.user?.avatarColor;
    const avatarUrl = session?.user?.avatarUrl;
    const unreadCount = await getTotalUnreadCount();

    return (
        <SidebarClient
            userName={userName}
            avatarColor={avatarColor}
            avatarUrl={avatarUrl}
            unreadCount={unreadCount}
        />
    );
}
