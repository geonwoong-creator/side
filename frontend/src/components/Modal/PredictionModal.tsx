"use client";

import React, { useState, useEffect } from "react";
import { portfolioApi, groupsApi, SearchStockItem } from "../../lib/api";
import GlassCard from "../GlassCard/GlassCard";
import styles from "./PredictionModal.module.css";

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  userId: string;
  onSuccess: () => void;
}

export default function PredictionModal({
  isOpen,
  onClose,
  groupId,
  userId,
  onSuccess,
}: PredictionModalProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchStockItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<SearchStockItem | null>(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [predictionType, setPredictionType] = useState<"RISE" | "FALL">("RISE");
  const [targetDate, setTargetDate] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSearchResults([]);
      setSelectedStock(null);
      setTargetPrice("");
      setPredictionType("RISE");
      setTargetDate("");
      setDescription("");
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query.trim()) {
        try {
          const res = await portfolioApi.searchStocks(query);
          setSearchResults(res);
        } catch (e) {
          console.error(e);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      setTargetPrice("");
      return;
    }
    setTargetPrice(Number(cleanVal).toLocaleString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !targetPrice || !targetDate) return;

    const numericPrice = parseFloat(targetPrice.replace(/,/g, ""));
    if (isNaN(numericPrice) || numericPrice <= 0) {
      setError("목표 가격은 0보다 큰 양수여야 합니다.");
      return;
    }

    const todayStr = getLocalDateString();
    if (targetDate < todayStr) {
      setError("목표 만료일은 오늘 또는 미래 날짜여야 합니다.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await groupsApi.addHedgePost(
        groupId,
        userId,
        selectedStock.ticker_symbol,
        numericPrice,
        predictionType,
        targetDate,
        description
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "예측 등록 도중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <GlassCard className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>🎯 예측 박제하기 (내가말했제)</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!selectedStock ? (
          <div className={styles.step}>
            <input
              type="text"
              placeholder="예측할 종목명 또는 종목코드 입력..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.input}
              autoFocus
            />

            <div className={styles.resultList}>
              {searchResults.length > 0 ? (
                searchResults.map((stock) => (
                  <div
                    key={stock.ticker_symbol}
                    className={styles.resultItem}
                    onClick={() => {
                      setSelectedStock(stock);
                      setTargetPrice(stock.current_price ? stock.current_price.toLocaleString() : "");
                    }}
                  >
                    <span className={styles.stockName}>{stock.name}</span>
                    <span className={styles.ticker}>{stock.ticker_symbol}</span>
                  </div>
                ))
              ) : query.trim() ? (
                <div key="no-results" className={styles.noResults}>검색 결과가 없습니다.</div>
              ) : (
                <div key="placeholder" className={styles.placeholderText}>예측하고자 하는 국내 주식을 검색하세요.</div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.selectedBanner}>
              <h3>{selectedStock.name} <span className={styles.tickerBanner}>{selectedStock.ticker_symbol}</span></h3>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setSelectedStock(null)}
              >
                다시 검색
              </button>
            </div>

            <div className={styles.formGroup}>
              <label>현재 시세</label>
              <div className={styles.currentPriceText}>
                {selectedStock.current_price ? `${selectedStock.current_price.toLocaleString()} 원` : "시세 정보 없음"}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>예측 방향</label>
              <div className={styles.tabContainer}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${styles.riseBtn} ${predictionType === "RISE" ? styles.activeRise : ""}`}
                  onClick={() => setPredictionType("RISE")}
                >
                  📈 상승 (RISE)
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${styles.fallBtn} ${predictionType === "FALL" ? styles.activeFall : ""}`}
                  onClick={() => setPredictionType("FALL")}
                >
                  📉 하락 (FALL)
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>목표 가격 (₩)</label>
              <input
                type="text"
                placeholder="목표가를 입력하세요"
                value={targetPrice}
                onChange={handlePriceChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>목표 만료일</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                required
                className={styles.input}
                min={getLocalDateString()}
              />
            </div>

            <div className={styles.formGroup}>
              <label>예측 근거 및 사유</label>
              <textarea
                placeholder="왜 상승/하락할 것이라고 예측하시나요? 구체적인 비전이나 근거를 남겨 입을 꾹 닫게 하세요! (선택 사항)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.input}
                style={{ minHeight: "80px", resize: "vertical", fontFamily: "inherit", padding: "12px", background: "rgba(255, 255, 255, 0.02)", border: "1px solid var(--glass-border)", borderRadius: "8px", color: "var(--foreground)" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? "박제 중..." : "🚀 이 예측을 박제해라 (입꾹닫)"}
            </button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
