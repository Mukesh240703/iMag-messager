"use client";

import Link from "next/link";
import styles from "../auth.module.css";
import { login } from "@/actions/authActions";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { User, Chrome, Github } from "lucide-react";
import { useRouter } from "next/navigation";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button className={styles.button} disabled={pending}>
            {pending ? "Signing in..." : "Log In"}
        </button>
    )
}

export default function LoginPage() {
    const [error, setError] = useState<string>("");
    const router = useRouter();

    async function clientAction(formData: FormData) {
        const res = await login(formData);
        if (res && 'error' in res) {
            setError(res.error);
        } else if (res && 'success' in res) {
            router.push("/chat");
        }
    }

    return (
        <div className={styles.container}>
            {/* Decorative Background Elements */}
            <div className={styles.circle1} />
            <div className={styles.circle2} />

            {/* Left Side: Branding */}
            <div className={styles.brandSide}>
                <div className={styles.authLogo}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', padding: '4px', borderRadius: '6px' }}>
                        <User color="white" size={24} />
                    </span>
                    iMag-Messager
                </div>
                <div className={styles.heroText}>
                    <h1 className={styles.heroTitle}>Connect like never before.</h1>
                    <p className={styles.heroSubtitle}>Premium messaging for professional teams.</p>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>© 2026 iMag Systems</div>
            </div>

            {/* Right Side: Form */}
            <div className={styles.formSide}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Welcome Back!</h1>
                        <p className={styles.subtitle}>Sign in to continue to iMag</p>
                    </div>

                    <form className={styles.form} action={clientAction}>
                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.field}>
                            <label className={styles.label}>Email</label>
                            <input name="email" type="email" required placeholder="Enter username or email" className={styles.input} />
                        </div>

                        <div className={styles.field}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label className={styles.label}>Password</label>
                                <span className={styles.forgotPassword}>Forgot password?</span>
                            </div>
                            <input name="password" type="password" required placeholder="Enter password" className={styles.input} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                            <input type="checkbox" id="remember" />
                            <label htmlFor="remember">Remember me</label>
                        </div>

                        <SubmitButton />
                    </form>

                    <div className={styles.divider}>
                        <span>Sign in with</span>
                    </div>

                    <div className={styles.socialLogin}>
                        <button className={styles.socialBtn}><Chrome size={20} color="#DB4437" /></button>
                        <button className={styles.socialBtn}><Github size={20} color="#333" /></button>
                    </div>

                    <p className={styles.footer}>
                        Don't have an account?
                        <Link href="/signup" className={styles.link}>Register</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
