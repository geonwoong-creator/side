"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar/Navbar";
import GlassCard from "../components/GlassCard/GlassCard";
import styles from "./page.module.css";

export default function Home() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.badge}>🚀 PRIVATE SOCIAL PORTFOLIO</div>
          <h1 className={styles.title}>
            ITYS <span className={styles.gradientText}>(I Told You So)</span>
          </h1>
          <p className={styles.slogan}>“입으로만 하지 말고, 숫자로 박제해라.”</p>
          <p className={styles.description}>
            친구들과 실시간 수익률과 종목 비중을 공유하며, 투자 실력을 증명하는 폐쇄형 소셜 포트폴리오 플랫폼. 
            진정한 고수들이 누구인지 랭킹보드와 예측 박제 타임라인으로 직접 검증하세요.
          </p>

          <div className={styles.ctaContainer}>
            {user ? (
              <Link href="/portfolio" className={styles.primaryCta}>
                💼 내 포트폴리오로 이동
              </Link>
            ) : (
              <>
                <Link href="/login" className={styles.primaryCta}>
                  시작하기 (로그인)
                </Link>
                <Link href="/signup" className={styles.secondaryCta}>
                  회원가입
                </Link>
              </>
            )}
          </div>
        </section>

        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>핵심 기능 소개</h2>
          <div className={styles.grid}>
            <GlassCard hoverable className={styles.featureCard}>
              <div className={styles.icon}>📊</div>
              <h3>실시간 포트폴리오 요약</h3>
              <p>
                평단가와 수량만 입력하면, 국내 주식 시장 시세를 스크래핑하여 멤버들의 실시간 총 수익률을 즉시 계산합니다.
              </p>
            </GlassCard>

            <GlassCard hoverable className={styles.featureCard}>
              <div className={styles.icon}>🏆</div>
              <h3>친구들 간의 실시간 랭킹</h3>
              <p>
                보유 금액은 프라이버시로 숨기고, 순수 수익률(%)과 종목 비중(%)만으로 정정당당하게 서열을 가립니다.
              </p>
            </GlassCard>

            <GlassCard hoverable className={styles.featureCard}>
              <div className={styles.icon}>📌</div>
              <h3>"내가 말했제" (예측 박제)</h3>
              <p>
                특정 종목의 상승/하락 예측 가격과 기한을 등록하세요. 도달 시 시스템이 성공/실패 판정을 내려 타임라인에 완벽히 박제합니다.
              </p>
            </GlassCard>
          </div>
        </section>
      </main>
    </>
  );
}
