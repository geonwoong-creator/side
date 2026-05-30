"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { groupsApi } from "../../lib/api";
import Navbar from "../../components/Navbar/Navbar";
import GlassCard from "../../components/GlassCard/GlassCard";
import styles from "./groups.module.css";

interface GroupItem {
  group_id: string;
  groups: {
    id: string;
    name: string;
    invite_code: string;
  } | null;
}

export default function Groups() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 그룹 생성 관련 상태
  const [newGroupName, setNewGroupName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createdInviteCode, setCreatedInviteCode] = useState("");

  // 그룹 참여 관련 상태
  const [inviteCode, setInviteCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState("");

  const fetchGroups = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const res = await groupsApi.getUserGroups(user.id);
      setGroups(res.data || []);
    } catch (e: any) {
      console.error(e);
      setError("그룹 목록을 가져오는 데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else {
        fetchGroups();
      }
    }
  }, [user, authLoading, router, fetchGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newGroupName.trim()) return;

    setCreateLoading(true);
    setError("");
    setCreatedInviteCode("");
    try {
      const res = await groupsApi.createGroup(user.id, newGroupName);
      setCreatedInviteCode(res.invite_code);
      setNewGroupName("");
      fetchGroups(); // 그룹 리프레시
    } catch (err: any) {
      setError(err.message || "그룹 생성에 실패했습니다.");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !inviteCode.trim()) return;

    setJoinLoading(true);
    setError("");
    setJoinSuccess("");
    try {
      const res = await groupsApi.joinGroup(user.id, inviteCode);
      if (res.status === "error") {
        setError(res.message || "이미 참여 중이거나 존재하지 않는 코드입니다.");
      } else {
        setJoinSuccess("그룹 참여가 성공적으로 완료되었습니다!");
        setInviteCode("");
        fetchGroups(); // 그룹 리프레시
      }
    } catch (err: any) {
      setError(err.message || "그룹 참여에 실패했습니다.");
    } finally {
      setJoinLoading(false);
    }
  };

  if (authLoading || (!user && loading)) {
    return <div className={styles.loader}>로딩 중...</div>;
  }

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <section className={styles.heroSection}>
          <h1 className={styles.title}>👥 그룹 랭킹 보드</h1>
          <p className={styles.subtitle}>친구들과 그룹을 형성하여 프라이빗 수익률 랭킹 경쟁을 벌이세요.</p>
        </section>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.containerGrid}>
          {/* 왼쪽: 내 가입 그룹 목록 */}
          <section className={styles.groupsListSection}>
            <GlassCard className={styles.card}>
              <h2 className={styles.sectionTitle}>참여 중인 그룹</h2>
              {loading ? (
                <div className={styles.subLoader}>그룹 조회 중...</div>
              ) : groups.length > 0 ? (
                <div className={styles.groupsGrid}>
                  {groups.map((item) => {
                    const group = item.groups;
                    if (!group) return null;
                    return (
                      <Link
                        href={`/groups/${group.id}`}
                        key={group.id}
                        className={styles.groupLinkCard}
                      >
                        <GlassCard hoverable className={styles.groupInnerCard}>
                          <div className={styles.groupHeader}>
                            <span className={styles.groupIcon}>🏷️</span>
                            <span className={styles.groupName}>{group.name}</span>
                          </div>
                          <div className={styles.groupFooter}>
                            <span className={styles.inviteLabel}>초대코드:</span>{" "}
                            <span className={styles.inviteCodeText}>{group.invite_code}</span>
                          </div>
                        </GlassCard>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptyGroups}>
                  <p>아직 참여 중인 그룹이 없습니다.</p>
                  <p className={styles.emptyDesc}>우측 폼을 이용해 그룹을 개설하거나 친구의 초대코드를 입력하세요.</p>
                </div>
              )}
            </GlassCard>
          </section>

          {/* 오른쪽: 그룹 생성 및 그룹 가입 폼 */}
          <section className={styles.formsSection}>
            {/* 그룹 가입 카드 */}
            <GlassCard className={styles.formCard}>
              <h3 className={styles.formTitle}>🔑 초대코드로 그룹 가입</h3>
              {joinSuccess && <div className={styles.success}>{joinSuccess}</div>}
              <form onSubmit={handleJoinGroup} className={styles.form}>
                <input
                  type="text"
                  placeholder="초대 코드 6자리 입력..."
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                  className={styles.input}
                />
                <button type="submit" disabled={joinLoading} className={styles.joinBtn}>
                  {joinLoading ? "가입 중..." : "그룹 입장"}
                </button>
              </form>
            </GlassCard>

            {/* 그룹 개설 카드 */}
            <GlassCard className={styles.formCard}>
              <h3 className={styles.formTitle}>✨ 새 그룹 개설</h3>
              {createdInviteCode && (
                <div className={styles.inviteCodeBanner}>
                  <p>🎉 그룹 개설 성공!</p>
                  <p className={styles.bannerCodeText}>초대코드: <strong>{createdInviteCode}</strong></p>
                  <span className={styles.bannerHint}>이 코드를 복사해서 친구들에게 공유하세요.</span>
                </div>
              )}
              <form onSubmit={handleCreateGroup} className={styles.form}>
                <input
                  type="text"
                  placeholder="개설할 그룹 모임명 입력..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className={styles.input}
                />
                <button type="submit" disabled={createLoading} className={styles.createBtn}>
                  {createLoading ? "개설 중..." : "그룹 개설"}
                </button>
              </form>
            </GlassCard>
          </section>
        </div>
      </main>
    </>
  );
}
