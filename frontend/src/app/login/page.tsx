"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import GlassCard from "../../components/GlassCard/GlassCard";
import styles from "./login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, login } = useAuth();
  const router = useRouter();

  // 이미 로그인된 사용자는 대시보드로 이동
  useEffect(() => {
    if (user) {
      router.push("/portfolio");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "로그인 도중 에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <GlassCard className={styles.container}>
        <div className={styles.header}>
          <Link href="/" className={styles.logo}>
            🚀 ITYS <span className={styles.logoSub}>내가말했제</span>
          </Link>
          <h2 className={styles.title}>돌아온 개미님, 환영합니다!</h2>
          <p className={styles.desc}>오늘도 수익률과 종목 예측을 박제하세요.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>이메일 주소</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "로그인 중..." : "로그인 완료"}
          </button>
        </form>

        <div className={styles.footer}>
          <span>아직 회원이 아니신가요?</span>{" "}
          <Link href="/signup" className={styles.link}>
            회원가입
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
