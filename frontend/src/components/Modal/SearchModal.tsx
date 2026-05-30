"use client";

import React, { useState, useEffect } from "react";
import { portfolioApi, SearchStockItem } from "../../lib/api";
import GlassCard from "../GlassCard/GlassCard";
import styles from "./SearchModal.module.css";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export default function SearchModal({ isOpen, onClose, userId, onSuccess }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchStockItem[]>([]);
  const [selectedStock, setSelectedStock] = useState<SearchStockItem | null>(null);
  const [avgPrice, setAvgPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSearchResults([]);
      setSelectedStock(null);
      setAvgPrice("");
      setQuantity("");
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

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      setAvgPrice("");
      return;
    }
    setAvgPrice(Number(cleanVal).toLocaleString());
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleanVal = e.target.value.replace(/[^0-9]/g, "");
    if (!cleanVal) {
      setQuantity("");
      return;
    }
    setQuantity(Number(cleanVal).toLocaleString());
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !avgPrice || !quantity) return;

    const numericPrice = parseFloat(avgPrice.replace(/,/g, ""));
    const numericQuantity = parseInt(quantity.replace(/,/g, ""), 10);

    if (isNaN(numericPrice) || numericPrice <= 0 || isNaN(numericQuantity) || numericQuantity <= 0) {
      setError("평균 매수가와 수량은 0보다 큰 양수여야 합니다.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await portfolioApi.addStock(
        userId,
        selectedStock.ticker_symbol,
        numericPrice,
        numericQuantity
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "추가 도중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <GlassCard className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>📈 종목 추가하기</h2>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!selectedStock ? (
          <div className={styles.step}>
            <input
              type="text"
              placeholder="종목명 또는 종목코드(6자리) 입력..."
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
                      setAvgPrice(stock.current_price ? stock.current_price.toLocaleString() : "");
                    }}
                  >
                    <span className={styles.stockName}>{stock.name}</span>
                    <span className={styles.ticker}>{stock.ticker_symbol}</span>
                  </div>
                ))
              ) : query.trim() ? (
                <div key="no-results" className={styles.noResults}>검색 결과가 없습니다.</div>
              ) : (
                <div key="placeholder" className={styles.placeholderText}>국내 주식 종목을 검색해 보세요.</div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleAdd} className={styles.form}>
            <div className={styles.selectedBanner}>
              <h3>{selectedStock.name} <span className={styles.tickerBanner}>{selectedStock.ticker_symbol}</span></h3>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => setSelectedStock(null)}
              >
                다른 종목 선택
              </button>
            </div>

            <div className={styles.formGroup}>
              <label>평균 매수가 (₩)</label>
              <input
                type="text"
                placeholder="평균 단가를 입력하세요"
                value={avgPrice}
                onChange={handlePriceChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label>보유 수량</label>
              <input
                type="text"
                placeholder="수량을 입력하세요"
                value={quantity}
                onChange={handleQuantityChange}
                required
                className={styles.input}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={styles.submitBtn}
            >
              {loading ? "추가 중..." : "포트폴리오에 추가"}
            </button>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
