"use client";

import React, { useState, useEffect } from "react";
import { portfolioApi, PortfolioSummaryResponse, StockHolding } from "../../lib/api";
import GlassCard from "../GlassCard/GlassCard";
import styles from "./MemberPortfolioModal.module.css";

interface MemberPortfolioModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  nickname: string;
}

export default function MemberPortfolioModal({ isOpen, onClose, userId, nickname }: MemberPortfolioModalProps) {
  const [summary, setSummary] = useState<PortfolioSummaryResponse["summary"] | null>(null);
  const [holdings, setHoldings] = useState<StockHolding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && userId) {
      setLoading(true);
      setError("");
      setSummary(null);
      setHoldings([]);
      
      portfolioApi.getSummary(userId)
        .then((res) => {
          if (res.summary) {
            setSummary(res.summary);
            setHoldings(res.holdings || []);
          } else {
            setSummary(null);
            setHoldings([]);
          }
        })
        .catch((err: any) => {
          console.error(err);
          setError("상대방의 포트폴리오를 가져오는 도중 오류가 발생했습니다.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const isProfit = (summary?.total_profit || 0) >= 0;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <GlassCard className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 영역 */}
        <div className={styles.header}>
          <h2>🔥 <strong>{nickname}</strong> 님의 포트폴리오</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {error && <div className={styles.error}>⚠️ {error}</div>}

        {loading ? (
          <div className={styles.loader}>
            <div className={styles.loaderSpinner}></div>
            <p>포트폴리오 실시간 동기화 중...</p>
          </div>
        ) : holdings.length > 0 ? (
          <>
            {/* 1. 자산 요약 그리드 */}
            <section className={styles.summarySection}>
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
                  <span className={`${styles.value} ${isProfit ? styles.plusColor : styles.minusColor}`}>
                    ₩ {(summary?.total_profit || 0).toLocaleString()}
                  </span>
                </div>
                <div className={styles.summaryItem}>
                  <span className={styles.label}>총 수익률</span>
                  <span className={`${styles.yieldValue} ${isProfit ? styles.plusBg : styles.minusBg}`}>
                    {isProfit ? "+" : ""}
                    {(summary?.total_yield_percent || 0).toFixed(2)} %
                  </span>
                </div>
              </div>
            </section>

            {/* 2. 보유 종목 리스트 */}
            <section className={styles.holdingsSection}>
              <h3>📋 보유 종목 세부 내역</h3>
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
                          <td>
                            <span className={`${styles.itemYieldBadge} ${isHoldingProfit ? styles.plusBadge : styles.minusBadge}`}>
                              {isHoldingProfit ? "+" : ""}
                              {yieldPct.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : (
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIcon}>💼</div>
            <p>포트폴리오에 등록된 주식이 없습니다.</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
