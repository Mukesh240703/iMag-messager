"use client";

import Link from "next/link";
import styles from "../auth.module.css";
import { signup } from "@/actions/authActions";
import { useFormStatus } from "react-dom";
import { useState } from "react";
import { User, Chrome, Github } from "lucide-react";

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <button className={styles.button} disabled={pending}>
            {pending ? "Creating Account..." : "Create Account"}
        </button>
    )
}

export default function SignupPage() {
    const [error, setError] = useState<string>("");

    async function clientAction(formData: FormData) {
        const res = await signup(formData);
        if (res?.error) {
            setError(res.error);
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
                    <h1 className={styles.heroTitle}>Join the conversation.</h1>
                    <p className={styles.heroSubtitle}>Create your workspace and start collaborating today.</p>
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>© 2026 iMag Systems</div>
            </div>

            {/* Right Side: Form */}
            <div className={styles.formSide}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>Create Account</h1>
                        <p className={styles.subtitle}>Get your free account now</p>
                    </div>

                    <form className={styles.form} action={clientAction}>
                        {error && <div className={styles.error}>{error}</div>}

                        <div className={styles.field}>
                            <label className={styles.label}>Full Name</label>
                            <input name="name" type="text" required placeholder="John Doe" className={styles.input} />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Email</label>
                            <input name="email" type="email" required placeholder="john@example.com" className={styles.input} />
                        </div>

                        <div className={styles.field}>
                            <label className={styles.label}>Password</label>
                            <input name="password" type="password" required placeholder="Create a password" className={styles.input} />
                        </div>

                        <SubmitButton />
                    </form>

                    <div className={styles.divider}>
                        <span>Sign up with</span>
                    </div>

                    <div className={styles.socialLogin}>
                        <button className={styles.socialBtn}><Chrome size={20} color="#DB4437" /></button>
                        <button className={styles.socialBtn}><Github size={20} color="#333" /></button>
                    </div>

                    <p className={styles.footer}>
                        Already have an account?
                        <Link href="/login" className={styles.link}>Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
