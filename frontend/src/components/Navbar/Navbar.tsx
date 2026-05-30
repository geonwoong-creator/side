"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          🚀 ITYS <span className={styles.subtitle}>내가말했제</span>
        </Link>

        <div className={styles.navLinks}>
          {user ? (
            <>
              <Link
                href="/portfolio"
                className={`${styles.link} ${pathname === "/portfolio" ? styles.active : ""}`}
              >
                💼 내 포트폴리오
              </Link>
              <Link
                href="/groups"
                className={`${styles.link} ${pathname === "/groups" ? styles.active : ""}`}
              >
                👥 그룹 랭킹
              </Link>
            </>
          ) : null}
        </div>

        <div className={styles.authSection}>
          {user ? (
            <div className={styles.userInfo}>
              <span className={styles.nickname}>
                🔥 <strong>{user.nickname || "무명개미"}</strong> 님
              </span>
              <button onClick={logout} className={styles.logoutBtn}>
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/login" className={styles.loginBtn}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
