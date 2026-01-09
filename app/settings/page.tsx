"use client";

import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";

export default function SettingsPage() {
    const { theme, toggleTheme } = useTheme();

    return (
        <div style={{ padding: '2rem', maxWidth: '800px' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem' }}>Settings</h1>

            <div style={{
                backgroundColor: 'var(--bg-panel)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--border-light)'
            }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Appearance</h2>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <h3 style={{ fontWeight: 500 }}>Theme</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {theme === 'light' ? 'Light Mode' : 'Dark Mode'}
                        </p>
                    </div>

                    <button
                        onClick={toggleTheme}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-light)',
                            backgroundColor: 'var(--color-white)',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            fontSize: '0.9rem'
                        }}
                    >
                        {theme === 'light' ? (
                            <>
                                <Moon size={18} /> Switch to Dark
                            </>
                        ) : (
                            <>
                                <Sun size={18} /> Switch to Light
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
