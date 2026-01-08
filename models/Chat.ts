import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMessage {
    sender: string; // "me" or "them" (simplified for now) or userId
    text: string;
    attachment?: {
        url: string;
        type: string;
        name: string;
    };
    createdAt: Date;
    status: 'sent' | 'delivered' | 'seen';
}

export interface IChat extends Document {
    name: string;
    type: 'direct' | 'group';
    avatarColor?: string;
    participants: string[]; // List of names or userIds
    messages: IMessage[];
    unreadCount?: number;
    lastMessage?: string;
    lastMessageTime?: string; // String for formatted time or Date
    typingUsers?: string[];
}

const MessageSchema = new Schema<IMessage>({
    sender: { type: String, required: true },
    text: { type: String },
    attachment: {
        url: { type: String },
        type: { type: String }, // 'image', 'file'
        name: { type: String }
    },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' }
});

const ChatSchema = new Schema<IChat>({
    name: { type: String, required: true },
    type: { type: String, enum: ['direct', 'group'], default: 'direct' },
    avatarColor: { type: String },
    participants: [{ type: String }],
    messages: [MessageSchema],
    unreadCount: { type: Number, default: 0 },
    lastMessage: { type: String },
    lastMessageTime: { type: String },
    typingUsers: [{ type: String }]
}, { timestamps: true });

// Prevent overwrite on hot reload
const Chat: Model<IChat> = mongoose.models.Chat || mongoose.model<IChat>("Chat", ChatSchema);

export default Chat;
