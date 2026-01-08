import { getSession } from "@/lib/auth";
import ChatClient from "./ChatClient";

export default async function ChatPage() {
    const session = await getSession();
    const user = session?.user;

    return (
        <ChatClient user={user} />
    );
}
