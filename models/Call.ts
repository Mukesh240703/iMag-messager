
import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICall extends Document {
    caller: string; // Email of caller
    receiver: string; // Email of receiver
    participants: string[]; // [caller, receiver]
    type: 'audio' | 'video';
    status: 'completed' | 'missed' | 'rejected' | 'busy'; // Add 'busy' if needed
    startTime: Date;
    endTime?: Date; // Optional for missed calls
    duration?: string; // e.g. "1h 5m" or seconds? Let's treat as string for display or seconds. Prefer string for simple UI match or seconds for calc. Let's store string as per UI or calculate?
    // Let's store duration as seconds (number) and format on frontend? Or simple string.
    // UI has "1h 20m".
    // Let's store startTime/endTime and calculate duration virtually or on save.
}

const CallSchema = new Schema<ICall>(
    {
        caller: { type: String, required: true },
        receiver: { type: String, required: true },
        participants: [{ type: String, required: true }],
        type: { type: String, enum: ['audio', 'video'], required: true },
        status: { type: String, enum: ['completed', 'missed', 'rejected', 'busy'], required: true },
        startTime: { type: Date, default: Date.now },
        endTime: { type: Date },
        duration: { type: String }, // Calculated string "12m", "1h 5m"
    },
    { timestamps: true }
);

const Call: Model<ICall> = mongoose.models?.Call || mongoose.model<ICall>("Call", CallSchema);

export default Call;
