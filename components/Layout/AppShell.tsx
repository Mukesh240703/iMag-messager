import styles from "./AppShell.module.css";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <div className={styles.shell}>
            <Sidebar />
            <main className={styles.main}>
                {children}
            </main>
        </div>
    )
}
