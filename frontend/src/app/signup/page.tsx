"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import GlassCard from "../../components/GlassCard/GlassCard";
import styles from "./signup.module.css";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, signup } = useAuth();
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
      await signup(email, password, nickname);
    } catch (err: any) {
      setError(err.message || "회원가입 도중 에러가 발생했습니다.");
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
          <h2 className={styles.title}>신규 회원가입</h2>
          <p className={styles.desc}>실력 증명을 위한 프라이빗 리그에 합류하세요!</p>
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
            <label>닉네임 (실명 또는 별명)</label>
            <input
              type="text"
              placeholder="수익률1위개미"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>비밀번호</label>
            <input
              type="password"
              placeholder="최소 6자리 이상"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "회원가입 중..." : "동의하고 합류하기"}
          </button>
        </form>

        <div className={styles.footer}>
          <span>이미 계정이 있으신가요?</span>{" "}
          <Link href="/login" className={styles.link}>
            로그인하기
          </Link>
        </div>
      </GlassCard>
    </div>
  );
}
