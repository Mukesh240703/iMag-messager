"use client";

import ChatList from "@/components/Chat/ChatList";
import MessageThread from "@/components/Chat/MessageThread";
import { useState } from "react";

export default function ChatClient({ user }: { user: any }) {
    const [selectedChat, setSelectedChat] = useState<any>(null);

    return (
        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
            <ChatList onSelectChat={setSelectedChat} user={user} />
            <MessageThread chat={selectedChat} />
        </div>
    );
}
