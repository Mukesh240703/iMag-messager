"use server";

import connectDB from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import { encrypt, decrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { writeFile } from "fs/promises";
import path from "path";

export async function signup(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!name || !email || !password) {
        return { error: "Missing fields" };
    }

    await connectDB();

    const existing = await User.findOne({ email });
    if (existing) {
        return { error: "User already exists" };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
        name,
        email,
        passwordHash,
        avatarColor: '#' + Math.floor(Math.random() * 16777215).toString(16) // Random hex
    });

    // Create session
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await encrypt({
        user: {
            id: newUser._id.toString(),
            name: newUser.name,
            email: newUser.email,
            avatarUrl: newUser.avatarUrl
        },
        expires
    });

    (await cookies()).set("session", session, { expires, httpOnly: true });

    redirect("/chat");
}

export async function login(formData: FormData) {
    try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        await connectDB();
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return { error: "Invalid credentials" };
        }

        // Create session
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const session = await encrypt({
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                avatarColor: user.avatarColor,
                avatarUrl: user.avatarUrl
            },
            expires
        });

        (await cookies()).set("session", session, { expires, httpOnly: true });
    } catch (error) {
        console.error("Login Error:", error);
        return { error: "Login Error: " + (error as Error).message };
    }

    redirect("/chat");
}

export async function logout() {
    const sessionCookie = (await cookies()).get("session")?.value;
    if (sessionCookie) {
        try {
            const data = await decrypt(sessionCookie);
            if (data?.user?.id) {
                await connectDB();
                await User.findByIdAndUpdate(data.user.id, { lastActive: new Date(0) }); // Set to past
            }
        } catch (e) {
            // ignore
        }
    }
    (await cookies()).set("session", "", { expires: new Date(0) });
    redirect("/login");
}

export async function updateProfile(formData: FormData) {
    const sessionCookie = (await cookies()).get("session")?.value;
    if (!sessionCookie) return { error: "Not authenticated" };

    const name = formData.get("name") as string;
    const avatarColor = formData.get("avatarColor") as string;
    const file = formData.get("file") as File | null;

    if (!name) return { error: "Name is required" };

    await connectDB();
    // Decode to get ID
    const data = await decrypt(sessionCookie);
    const userId = data.user.id;

    console.log("UpdateProfile called for:", userId, "File:", file?.name, file?.size);

    let avatarUrl = undefined;

    // Handle File Upload
    if (file && file.size > 0 && file.name !== "undefined") {
        try {
            console.log("Processing file upload...");
            const buffer = Buffer.from(await file.arrayBuffer());
            const filename = `profile_${userId}_${Date.now()}.png`; // Normalize to png or keep extension
            // Simple path - in real app use S3/Blob
            const uploadDir = path.join(process.cwd(), "public", "uploads");
            console.log("Saving to:", path.join(uploadDir, filename));
            await writeFile(path.join(uploadDir, filename), buffer);
            avatarUrl = `/uploads/${filename}`;
            console.log("File saved, avatarUrl:", avatarUrl);
        } catch (e) {
            console.error("Upload failed", e);
            return { error: "Failed to upload image" };
        }
    } else {
        console.log("No valid file provided");
    }

    const updateData: any = { name, avatarColor };
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });

    if (!updatedUser) return { error: "Update failed" };

    // Update session cookie with new data
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newSession = await encrypt({
        user: {
            id: updatedUser._id.toString(),
            name: updatedUser.name,
            email: updatedUser.email,
            avatarColor: updatedUser.avatarColor,
            avatarUrl: updatedUser.avatarUrl // Add to session
        },
        expires
    });

    (await cookies()).set("session", newSession, { expires, httpOnly: true });

    revalidatePath('/', 'layout'); // Refresh all
    return { success: true, avatarUrl: updatedUser.avatarUrl };
}
