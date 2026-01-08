"use client";

import * as Dialog from '@radix-ui/react-dialog';
import { useState, useRef } from 'react';
import styles from './ProfileModal.module.css';
import { LogOut, X, Camera, Upload } from 'lucide-react';
import { logout, updateProfile } from '@/actions/authActions';
import { toast } from 'sonner';

interface ProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentName: string;
    currentAvatarColor?: string;
    currentAvatarUrl?: string;
}

const COLORS = ['#0052cc', '#ff2a2a', '#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'];

export default function ProfileModal({ open, onOpenChange, currentName, currentAvatarColor, currentAvatarUrl }: ProfileModalProps) {
    const [name, setName] = useState(currentName);
    const [color, setColor] = useState(currentAvatarColor || COLORS[0]);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        const formData = new FormData();
        formData.append("name", name);
        formData.append("avatarColor", color);
        if (avatarFile) {
            formData.append("file", avatarFile);
        }

        const res = await updateProfile(formData);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success("Profile updated!");
            onOpenChange(false);
            // Optional: Force reload if needed, but router refresh should handle it
        }
        setLoading(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content className={styles.content}>
                    <div className={styles.header}>
                        <Dialog.Title className={styles.title}>Edit Profile</Dialog.Title>
                        <Dialog.Close asChild>
                            <button className={styles.closeBtn} aria-label="Close">
                                <X size={20} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className={styles.body}>
                        {/* Avatar Upload Section */}
                        <div className={styles.avatarSection}>
                            <div
                                className={styles.avatarPreview}
                                onClick={() => fileInputRef.current?.click()}
                                style={{ backgroundColor: previewUrl ? 'transparent' : color }}
                            >
                                {previewUrl ? (
                                    <img src={previewUrl} alt="Preview" className={styles.avatarImage} />
                                ) : (
                                    <span className={styles.avatarInitials}>{name.substring(0, 2).toUpperCase()}</span>
                                )}
                                <div className={styles.cameraOverlay}>
                                    <Camera size={24} color="white" />
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                style={{ display: 'none' }}
                            />
                            <p className={styles.hint}>Click to upload new photo</p>
                        </div>

                        <fieldset className={styles.field}>
                            <label className={styles.label} htmlFor="name">
                                Display Name
                            </label>
                            <input
                                className={styles.input}
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </fieldset>

                        <fieldset className={styles.field}>
                            <label className={styles.label}>
                                Avatar Color (Fallback)
                            </label>
                            <div className={styles.colorGrid}>
                                {COLORS.map((c) => (
                                    <div
                                        key={c}
                                        className={styles.colorOption}
                                        style={{ backgroundColor: c }}
                                        data-selected={color === c}
                                        onClick={() => setColor(c)}
                                    />
                                ))}
                            </div>
                        </fieldset>
                    </div>

                    <div className={styles.footer}>
                        <button className={styles.logoutBtn} onClick={() => logout()}>
                            <LogOut size={16} /> Log Out
                        </button>
                        <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
