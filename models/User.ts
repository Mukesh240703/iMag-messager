import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    name: string;
    email: string;
    passwordHash: string;
    avatarColor?: string;
    avatarUrl?: string;
    createdAt: Date;
    lastActive?: Date;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    avatarColor: { type: String, default: '#0052cc' },
    avatarUrl: { type: String },
    lastActive: { type: Date }
}, { timestamps: true });

// Prevent overwrite on hot reload
const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
