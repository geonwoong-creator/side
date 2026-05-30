"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { portfolioApi, PortfolioSummaryResponse, StockHolding } from "../../lib/api";
import Navbar from "../../components/Navbar/Navbar";
import GlassCard from "../../components/GlassCard/GlassCard";
import SearchModal from "../../components/Modal/SearchModal";
import styles from "./portfolio.module.css";

export default function Portfolio() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [summary, setSummary] = useState<PortfolioSummaryResponse["summary"] | null>(null);
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [error, setError] = useState("");

  const fetchPortfolioData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await portfolioApi.getSummary(user.id);
      if (res.summary) {
        setSummary(res.summary);
        setHoldings(res.holdings || []);
      } else {
        setSummary(null);
        setHoldings([]);
      }
    } catch (err: any) {
      console.error(err);
      setError("포트폴리오 정보를 가져오는 도중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auth 완료 후 비회원은 로그인으로 튕기기, 회원은 데이터 로드
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchPortfolioData();
      }
    }
  }, [user, authLoading, router, fetchPortfolioData]);

  const handleDelete = async (itemId: string) => {
    if (!confirm("정말 이 종목을 포트폴리오에서 삭제하시겠습니까?")) return;
    try {
      await portfolioApi.removeStock(itemId);
      fetchPortfolioData(); // 리프레시
    } catch (err: any) {
      alert(err.message || "삭제 실패");
    }
  };

  if (authLoading || (!user && loading)) {
    return <div className={styles.loader}>로딩 중...</div>;
  }

  const isProfit = (summary?.total_profit || 0) >= 0;

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        {/* 상단 타이틀 섹션 */}
        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>💼 내 포트폴리오</h1>
            <p className={styles.subtitle}>보유 중인 주식 자산 현황과 실시간 수익률을 확인하세요.</p>
          </div>
          <button onClick={() => setIsSearchOpen(true)} className={styles.addBtn}>
            ➕ 종목 추가하기
          </button>
        </section>

        {error && <div className={styles.error}>{error}</div>}

        {/* 1. 요약 정보 카드 (글래스모피즘) */}
        <section className={styles.summarySection}>
          <GlassCard className={styles.summaryCard}>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.label}>총 매수 금액</span>
                <span className={styles.value}>
                  ₩ {(summary?.total_purchase || 0).toLocaleString()}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>총 평가 금액</span>
                <span className={styles.value}>
                  ₩ {(summary?.total_value || 0).toLocaleString()}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>총 평가 손익</span>
                <span
                  className={`${styles.value} ${
                    isProfit ? styles.plusColor : styles.minusColor
                  }`}
                >
                  ₩ {(summary?.total_profit || 0).toLocaleString()}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>총 실시간 수익률</span>
                <span
                  className={`${styles.yieldValue} ${
                    isProfit ? styles.plusBg : styles.minusBg
                  }`}
                >
                  {isProfit ? "+" : ""}
                  {(summary?.total_yield_percent || 0).toFixed(2)} %
                </span>
              </div>
            </div>
          </GlassCard>
        </section>

        {/* 2. 보유 종목 리스트 테이블 */}
        <section className={styles.holdingsSection}>
          <GlassCard className={styles.tableCard}>
            <h2 className={styles.tableTitle}>📋 보유 종목 세부 내역</h2>
            {loading ? (
              <div className={styles.tableLoader}>불러오는 중...</div>
            ) : holdings.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>종목명</th>
                      <th>종목코드</th>
                      <th>평단가 (₩)</th>
                      <th>현재가 (₩)</th>
                      <th>보유수량</th>
                      <th>평가금액 (₩)</th>
                      <th>평가손익 (₩)</th>
                      <th>수익률</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((item) => {
                      const currentPrice = item.stocks?.current_price || 0;
                      const stockName = item.stocks?.name || "알 수 없는 종목";
                      const purchaseVal = item.avg_price * item.quantity;
                      const currentVal = currentPrice * item.quantity;
                      const profit = currentVal - purchaseVal;
                      const yieldPct = purchaseVal > 0 ? (profit / purchaseVal) * 100 : 0;
                      const isHoldingProfit = profit >= 0;

                      return (
                        <tr key={item.id}>
                          <td className={styles.stockNameTd}>
                            <strong>{stockName}</strong>
                          </td>
                          <td className={styles.tickerTd}>{item.ticker_symbol}</td>
                          <td>{Math.round(item.avg_price).toLocaleString()}</td>
                          <td>{currentPrice.toLocaleString()}</td>
                          <td>{item.quantity}</td>
                          <td>{currentVal.toLocaleString()}</td>
                          <td className={isHoldingProfit ? styles.plusColor : styles.minusColor}>
                            {isHoldingProfit ? "+" : ""}
                            {profit.toLocaleString()}
                          </td>
                          <td className={isHoldingProfit ? styles.plusColor : styles.minusColor}>
                            <span
                              className={`${styles.itemYieldBadge} ${
                                isHoldingProfit ? styles.plusBadge : styles.minusBadge
                              }`}
                            >
                              {isHoldingProfit ? "+" : ""}
                              {yieldPct.toFixed(2)}%
                            </span>
                          </td>
                          <td>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className={styles.deleteBtn}
                              title="삭제"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.emptyContainer}>
                <div className={styles.emptyIcon}>💼</div>
                <p>포트폴리오에 등록된 주식이 없습니다.</p>
                <p className={styles.emptyHint}>
                  우측 상단의 "종목 추가하기" 버튼을 눌러 첫 종목을 등록해보세요!
                </p>
              </div>
            )}
          </GlassCard>
        </section>
      </main>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        userId={user?.id || ""}
        onSuccess={fetchPortfolioData}
      />
    </>
  );
}
