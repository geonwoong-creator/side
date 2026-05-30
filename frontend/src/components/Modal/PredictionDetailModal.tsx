"use client";

import React from "react";
import { GroupPost } from "../../lib/api";
import GlassCard from "../GlassCard/GlassCard";
import styles from "./PredictionDetailModal.module.css";

interface PredictionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: GroupPost | null;
}

export default function PredictionDetailModal({ isOpen, onClose, post }: PredictionDetailModalProps) {
  if (!isOpen || !post) return null;

  const nickname = post.profiles?.nickname || "무명개미";
  const isRise = post.prediction_type === "RISE";
  const stockName = post.stock_name || post.ticker_symbol;

  let statusClass = styles.statusPending;
  let statusLabel = "대기 중 (Pending)";
  if (post.status === "success") {
    statusClass = styles.statusSuccess;
    statusLabel = "🎯 예측 성공 (Success)";
  } else if (post.status === "failed") {
    statusClass = styles.statusFailed;
    statusLabel = "💀 예측 실패 (Failed)";
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <GlassCard className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className={styles.header}>
          <h2>📌 박제된 "말했제" 상세 정보</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {/* 바디 */}
        <div className={styles.body}>
          {/* 작성자 정보 */}
          <div className={styles.authorBanner}>
            작성자: <span className={styles.authorName}>🔥 {nickname}</span>
          </div>

          {/* 종목 및 예측 방향 헤더 */}
          <div className={styles.stockHeader}>
            <div className={styles.stockInfo}>
              <h3>{stockName}</h3>
              <span className={styles.ticker}>{post.ticker_symbol}</span>
            </div>
            <div className={`${styles.predictionBadge} ${isRise ? styles.badgeRise : styles.badgeFall}`}>
              {isRise ? "📈 상승 예측 (RISE)" : "📉 하락 예측 (FALL)"}
            </div>
          </div>

          {/* 가격 정보 그리드 */}
          <div className={styles.priceGrid}>
            <div className={styles.priceItem}>
              <span className={styles.label}>진입가 (당시 시세)</span>
              <span className={styles.value}>{post.entry_price.toLocaleString()} 원</span>
            </div>
            <div className={styles.priceItem}>
              <span className={styles.label}>목표가</span>
              <span className={styles.value}>{post.target_price.toLocaleString()} 원</span>
            </div>
            <div className={styles.priceItem}>
              <span className={styles.label}>목표 만료일</span>
              <span className={styles.value}>{post.target_date}</span>
            </div>
          </div>

          {/* 예측 사유 텍스트 (글) */}
          <div className={styles.reasonSection}>
            <span className={styles.reasonTitle}>💡 내가 이 종목을 박제한 이유</span>
            {post.description ? (
              <div className={styles.reasonContent}>{post.description}</div>
            ) : (
              <div className={`${styles.reasonContent} ${styles.emptyReason}`}>
                기재된 예측 사유가 없습니다. (입으로만 했군요!)
              </div>
            )}
          </div>

          {/* 진행 상태 정보 */}
          <div className={styles.statusContainer}>
            판정 상태:
            <span className={`${styles.statusBadge} ${statusClass}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
