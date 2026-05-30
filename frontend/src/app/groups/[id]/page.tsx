"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { groupsApi, GroupRankingItem, GroupPost } from "../../../lib/api";
import Navbar from "../../../components/Navbar/Navbar";
import GlassCard from "../../../components/GlassCard/GlassCard";
import PredictionModal from "../../../components/Modal/PredictionModal";
import styles from "./groupDetail.module.css";

export default function GroupDetail() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [ranking, setRanking] = useState<GroupRankingItem[]>([]);
  const [posts, setPosts] = useState<GroupPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPredictionOpen, setIsPredictionOpen] = useState(false);
  const [error, setError] = useState("");

  const fetchGroupData = useCallback(async () => {
    if (!groupId) return;
    setLoading(true);
    setError("");
    try {
      const [rankingRes, postsRes] = await Promise.all([
        groupsApi.getGroupRanking(groupId),
        groupsApi.listGroupPosts(groupId),
      ]);
      setRanking(rankingRes.ranking || []);
      setPosts(postsRes.data || []);
    } catch (e: any) {
      console.error(e);
      setError("그룹 상세 데이터를 가져오는 도중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchGroupData();
      }
    }
  }, [user, authLoading, router, fetchGroupData]);

  if (authLoading || (!user && loading)) {
    return <div className={styles.loader}>로딩 중...</div>;
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.header}>
          <div>
            <h1 className={styles.title}>👥 그룹 상세 정보</h1>
            <p className={styles.subtitle}>실시간 리그 랭킹과 박제된 예측 타임라인을 확인하세요.</p>
          </div>
          <button onClick={() => setIsPredictionOpen(true)} className={styles.predictBtn}>
            🎯 내 예측 박제하기
          </button>
        </section>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.contentLayout}>
          {/* 1. 실시간 랭킹보드 (왼쪽) */}
          <section className={styles.rankingSection}>
            <GlassCard className={styles.card}>
              <h2 className={styles.sectionTitle}>🏆 실시간 리그 랭킹</h2>
              {loading ? (
                <div className={styles.subLoader}>랭킹 로딩 중...</div>
              ) : ranking.length > 0 ? (
                <div className={styles.rankingList}>
                  {ranking.map((item, idx) => {
                    const isRankProfit = item.yield >= 0;
                    const rankNum = idx + 1;

                    let rankBadge = styles.rankNormal;
                    if (rankNum === 1) rankBadge = styles.rankGold;
                    else if (rankNum === 2) rankBadge = styles.rankSilver;
                    else if (rankNum === 3) rankBadge = styles.rankBronze;

                    return (
                      <div key={idx} className={`${styles.rankingItem} ${rankBadge}`}>
                        <div className={styles.rankInfo}>
                          <span className={styles.rankNumber}>{rankNum}</span>
                          <span className={styles.nickname}>{item.nickname}</span>
                        </div>
                        <div className={styles.rankScore}>
                          <span
                            className={`${styles.yieldText} ${
                              isRankProfit ? styles.plusColor : styles.minusColor
                            }`}
                          >
                            {isRankProfit ? "+" : ""}
                            {item.yield.toFixed(2)}%
                          </span>
                          <span className={styles.totalValue}>
                            ₩ {item.total_value.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyText}>랭킹 데이터가 없습니다.</div>
              )}
            </GlassCard>
          </section>

          {/* 2. "내가 말했제" 예측 박제 타임라인 (오른쪽) */}
          <section className={styles.postsSection}>
            <GlassCard className={styles.card}>
              <h2 className={styles.sectionTitle}>📌 "내가 말했제" 예측 타임라인</h2>
              {loading ? (
                <div className={styles.subLoader}>타임라인 로딩 중...</div>
              ) : posts.length > 0 ? (
                <div className={styles.timeline}>
                  {posts.map((post) => {
                    const nickname = post.profiles?.nickname || "무명개미";
                    const isRise = post.prediction_type === "RISE";

                    let statusClass = styles.statusPending;
                    let statusLabel = "대기 중 (Pending)";
                    if (post.status === "success") {
                      statusClass = styles.statusSuccess;
                      statusLabel = "🎯 예측 성공";
                    } else if (post.status === "failed") {
                      statusClass = styles.statusFailed;
                      statusLabel = "💀 예측 실패";
                    }

                    return (
                      <div key={post.id} className={styles.timelineItem}>
                        <div className={styles.timelineMarker}></div>
                        <GlassCard className={styles.timelineCard}>
                          <div className={styles.postHeader}>
                            <span className={styles.postAuthor}>🔥 <strong>{nickname}</strong></span>
                            <span className={`${styles.statusBadge} ${statusClass}`}>
                              {statusLabel}
                            </span>
                          </div>

                          <div className={styles.postBody}>
                            <h3 className={styles.stockTitle}>
                              {post.ticker_symbol}
                              <span
                                className={`${styles.predictionBadge} ${
                                  isRise ? styles.badgeRise : styles.badgeFall
                                }`}
                              >
                                {isRise ? "📈 상승 예측" : "📉 하락 예측"}
                              </span>
                            </h3>

                            <div className={styles.priceInfoGrid}>
                              <div className={styles.priceInfoItem}>
                                <span className={styles.priceLabel}>진입가</span>
                                <span className={styles.priceVal}>{post.entry_price.toLocaleString()} 원</span>
                              </div>
                              <div className={styles.priceInfoItem}>
                                <span className={styles.priceLabel}>목표가</span>
                                <span className={styles.priceVal}>{post.target_price.toLocaleString()} 원</span>
                              </div>
                              <div className={styles.priceInfoItem}>
                                <span className={styles.priceLabel}>목표 만료일</span>
                                <span className={styles.priceVal}>{post.target_date}</span>
                              </div>
                            </div>
                          </div>
                        </GlassCard>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyTimelineContainer}>
                  <div className={styles.emptyTimelineIcon}>📌</div>
                  <p>박제된 예측글이 없습니다.</p>
                  <p className={styles.emptyTimelineHint}>
                    우측 상단의 "내 예측 박제하기" 버튼을 눌러 첫 번째 말했제를 등재해보세요!
                  </p>
                </div>
              )}
            </GlassCard>
          </section>
        </div>
      </main>

      <PredictionModal
        isOpen={isPredictionOpen}
        onClose={() => setIsPredictionOpen(false)}
        groupId={groupId}
        userId={user?.id || ""}
        onSuccess={fetchGroupData}
      />
    </>
  );
}
