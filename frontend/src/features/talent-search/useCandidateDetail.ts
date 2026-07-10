"use client";

import { useEffect, useState } from "react";
import { type CandidateExperience, fetchCandidateDetail, type TalentCard } from "./api";

/**
 * 選択中候補者の詳細（WV/CIスコア・職歴・スキル・自己紹介）を取得するフック。
 * 高速切替時に古いレスポンスが上書きしないよう AbortController で中断する。
 */
export function useCandidateDetail(users: TalentCard[], selectedUserId: string | null) {
  const [wvScores, setWvScores] = useState<{ id: string; score: number }[] | null>(null);
  const [ciScores, setCiScores] = useState<{ id: string; score: number }[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [experiences, setExperiences] = useState<CandidateExperience[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [about, setAbout] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey は再読み込みトリガー
  useEffect(() => {
    if (!selectedUserId) {
      setWvScores(null);
      setCiScores(null);
      setExperiences([]);
      setSkills([]);
      setAbout(null);
      return;
    }
    const user = users.find((u) => u.userId === selectedUserId);
    if (!user) return;
    // 候補者の高速切替時に古いレスポンスが新しい選択の詳細を上書きしないよう、
    // effect の cleanup で進行中のリクエストを中断する
    const ac = new AbortController();
    setLoading(true);
    setError(false);
    fetchCandidateDetail(user.username, selectedUserId, ac.signal)
      .then((detail) => {
        if (ac.signal.aborted) return;
        setWvScores(detail.wvScores);
        setCiScores(detail.ciScores);
        setExperiences(detail.experiences);
        setSkills(detail.skills);
        setAbout(detail.about);
      })
      .catch(() => {
        if (!ac.signal.aborted) setError(true);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [selectedUserId, users, reloadKey]);

  return {
    wvScores,
    ciScores,
    loading,
    error,
    experiences,
    skills,
    about,
    reload: () => setReloadKey((k) => k + 1),
  };
}
