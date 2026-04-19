"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const NEED_DESCRIPTIONS: Record<string, { label: string; description: string }> = {
  ability_utilization: { label: "能力活用", description: "自分が持っているスキルや得意なことを存分に活かして働ける環境を重視する価値観。自分の強みを活かせる仕事に就くことで、やりがいや充実感を感じられる。得意分野で力を発揮したい人に重要。" },
  achievement: { label: "達成感", description: "目標をやり遂げたとき、大きな達成感を味わえることを重視する価値観。プロジェクト完遂や目標達成の手応えが仕事の原動力になる。成果を出すことに喜びを感じる人に重要。" },
  activity: { label: "活動性", description: "手が空くことがなく、常にやるべき仕事に取り組んでいられることを重視する価値観。忙しく動き続けることで充実感を得る。暇な時間が苦手で、常に何かに取り組んでいたい人に重要。" },
  advancement: { label: "昇進", description: "努力や実力に応じて、キャリアアップしていける道があることを重視する価値観。昇進・昇格の機会が仕事へのモチベーションに直結する。成長と地位の向上を目指す人に重要。" },
  authority: { label: "権限", description: "メンバーに方向性を示し、チームを率いる立場で働けることを重視する価値観。リーダーシップを発揮し、人をまとめる役割にやりがいを感じる。指導的な立場で力を発揮したい人に重要。" },
  autonomy: { label: "自律性", description: "上司に細かく管理されず、自分で計画を立てて仕事を進められることを重視する価値観。「どうやるかを自分で決められる」という裁量が仕事への意欲に直結する。細かい管理や画一的な手順を窮屈に感じ、自分のペースや方法で動きたい人に特に重要。" },
  company_policies: { label: "会社方針", description: "会社の制度や評価基準が明確で、公正に運用されていることを重視する価値観。ルールの透明性や公平な扱いが仕事への信頼感を生む。組織の方針に納得感を持って働きたい人に重要。" },
  compensation: { label: "報酬", description: "自分の仕事や責任に見合った、納得できる給与・報酬が得られることを重視する価値観。金銭的な見返りが仕事の満足度に大きく影響する。努力に見合った対価を求める人に重要。" },
  co_workers: { label: "同僚関係", description: "気が合い信頼できる仲間と、協力しながら働けることを重視する価値観。良好な人間関係が職場での居心地や生産性に直結する。チームワークを大切にする人に重要。" },
  creativity: { label: "創造性", description: "新しいアイデアを生み出したり、独自のやり方で問題を解決したりできる機会を重視する価値観。「既存のやり方にとらわれず、自分のアイデアや発想を形にできる」ことがやりがいの源泉。イノベーションや新規開発、表現活動が好きな人に重要な項目。" },
  independence: { label: "独立性", description: "他の人に頼らず、自分の力で仕事をやり遂げられることを重視する価値観。自立して仕事を完遂する達成感が重要。一人で集中して取り組みたい人に重要。" },
  moral_values: { label: "道徳的価値", description: "自分の倫理観や価値観に反することをしなくてよいことを重視する価値観。良心に従って働ける環境が精神的な安定をもたらす。仕事と自分の価値観の一致を重視する人に重要。" },
  recognition: { label: "評価", description: "自分の成果や頑張りが、周囲からきちんと評価されることを重視する価値観。認められることが次の仕事への意欲に繋がる。努力を正当に認めてほしいと感じる人に重要。" },
  responsibility: { label: "責任", description: "重要な仕事を任され、自分の裁量で判断・意思決定ができることを重視する価値観。「自分が担当者として責任を持つ仕事がある」という感覚がやりがいの源泉になる。責任を持つことをプレッシャーではなくやりがいと感じる、当事者意識の強い人に重要。" },
  security: { label: "安定性", description: "景気や会社の状況に左右されず、長く安心して働き続けられることを重視する価値観。「この仕事を続けていける」という安心感が仕事への集中力を生む。生活基盤の確保・長期的なキャリア計画・家族への責任などを重視する人に特に重要な価値観。" },
  social_service: { label: "社会貢献", description: "自分の仕事を通じて、誰かの助けになったり社会に貢献できることを重視する価値観。社会的な意義のある仕事にやりがいを感じる。人や社会のために働きたい人に重要。" },
  social_status: { label: "社会的地位", description: "職業や立場を通じて、社会的に認められ尊敬されることを重視する価値観。社会的な評価やプレステージが仕事の満足度に影響する。世間的な評価を重視する人に重要。" },
  supervision_hr: { label: "上司との人間関係", description: "困ったときや理不尽な状況で、上司が自分の味方になってくれることを重視する価値観。「上司が自分のことを人として大切にしてくれる」という信頼関係が仕事の安心感に繋がる。上司との関係が仕事満足度に大きく影響すると感じる人に重要な項目。" },
  supervision_technical: { label: "上司の技術的指導", description: "上司が自分の成長を考え、的確なアドバイスや指導をしてくれることを重視する価値観。「上司から学べる・成長の手助けをしてもらえる」という環境がスキルアップに直結する。専門的に成長したい・メンターとしての上司を求める人に重要な価値観。" },
  variety: { label: "多様性", description: "同じ作業の繰り返しではなく、日々違う仕事や課題に取り組めることを重視する価値観。変化に富んだ仕事が刺激となり、飽きずに働ける。ルーティンワークを苦手とする人に重要。" },
  working_conditions: { label: "労働環境", description: "勤務時間や職場環境など、快適で働きやすい条件が整っていることを重視する価値観。物理的な環境や勤務条件が仕事の質に影響する。ワークライフバランスを大切にする人に重要。" },
};

const PROMPT_TEMPLATE = `あなたは温かく寄り添うキャリアカウンセラーです。以下はWork Values診断（TWA理論に基づく21の仕事価値観の一対比較）の結果です。この結果を分析し、日本語でキャリアレポートを作成してください。

## 文体について

読み手に語りかけるような、温かく親しみやすい文体で書いてください。「〜ですね」「〜ではないでしょうか」のように柔らかい表現を使い、診断結果を受け取った人が安心して読めるトーンにしてください。ただし、馴れ馴れしくならず、丁寧語は保ってください。

## 診断について

この診断では以下の21の仕事価値観を一対比較で測定しています:
能力活用、達成感、活動性、昇進、権限、自律性、会社方針、報酬、同僚関係、創造性、独立性、道徳的価値、評価、責任、安定性、社会貢献、社会的地位、上司との人間関係、上司の技術的指導、多様性、作業環境

アダプティブ方式で出題しており、各項目の推定には統計的な不確実性があります。以下では、21項目の中から統計的に有意と判定できた項目のみを提示しています。それ以外の項目は判定不能のため、レポートでは一切言及しないでください。
**グループ内の項目同士に優劣をつけないでください。**

{{DIAGNOSIS_DATA}}
## レポート構成

以下の5セクションで構成してください。マークダウン形式で出力してください。
**重要: すべてのセクションで、1つの段落は最大200文字以内にしてください。200文字を超える場合は段落を分けてください。**

### 1. キャッチコピー
この人の仕事価値観の本質に合った、実在の著名人（思想家・経営者・アーティスト等）の名言を引用してください。
診断結果の価値観と強く共鳴する言葉を選び、最後に発言者の名前を添えてください。
形式例:「あなたがどんな仕事をしているかは、私にはどうでもいいこと。あなたが何を切望しているか、あこがれとの出会いを夢見る勇気があるかを私は知りたい。 ― オライア・マウンテン・ドリーマー」
引用は正確なものを使い、出典を捏造しないでください。

### 2. あなたの価値観プロファイル（200文字以内×2段落）
2つの段落で構成してください。1段落目は「明らかに重視している」グループから読み取れる特徴、2段落目は「明らかに重視していない」グループから読み取れる特徴を述べてください。各段落200文字以内。「〜を重視している」というスコアの言い換えではなく、具体的な仕事場面での行動傾向や職場で活きる特性として描写してください。

### 3. 適した職業・働き方
「明らかに重視している」「明らかに重視していない」の両方を考慮して、この価値観プロファイルに合う具体的な職業や働き方を3つ提案し、それぞれなぜ合っているかを説明してください。1つの職業・働き方につき200文字以内の段落で書いてください。

### 4. 適さない可能性がある職業・働き方
「明らかに重視していない」グループの項目から、この人がミスマッチを感じやすい職業や働き方を挙げ、なぜ合わないかを説明してください。1つにつき200文字以内の段落で書いてください。

### 5. キャリア形成のアドバイス
この価値観を持つ人がキャリアを形成する上でのアドバイスや注意点を述べてください。200文字以内の段落で書いてください。

## 注意事項

- 提示されていない項目（判定不能な項目）を根拠にした分析は一切しないでください。
- グループ内の項目同士に順位をつけないでください（例:「最も重視している」「2番目に重視している」等は不可）。同グループ内は同程度に重視していると扱ってください。
- 具体的な統計データ、年収の数値、求人倍率などの数値情報は提示しないでください。
- 職業を提案する際は、価値観との対応関係を根拠にしてください。
- 温かく前向きなトーンで、読み手を励ますように書いてください。ただし過度に褒めたり持ち上げたりせず、誠実さを保ってください。
- レポート本文のみを出力してください。前置きや「以下はレポートです」のような導入文は不要です。
- レポート全体のタイトル（例:「Work Values 診断レポート」「診断結果レポート」等）は付けないでください。最初のセクション（キャッチコピー）から直接始めてください。
- ダッシュ記号（——、——、―、−、–、—）は一切使わないでください。補足や言い換えは「、」や句読点、括弧で表現してください。
- 水平線（---、***、___）は使わないでください。セクション間の区切りは見出し（###）のみで表現してください。`;

interface PendingSession {
  session_id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  completed_at: string | null;
}

interface ScoresData {
  mu: Record<string, number>;
  se: Record<string, number>;
  consistency_coefficient?: number;
  consistency_level?: string;
}

function buildPrompt(scores: ScoresData): string {
  const significantPositive: string[] = [];
  const significantNegative: string[] = [];

  for (const [needId, mu] of Object.entries(scores.mu)) {
    const se = scores.se[needId];
    if (!se || se === 0) continue;
    const z = mu / se;
    const def = NEED_DESCRIPTIONS[needId];
    if (!def) continue;

    if (z > 1.64) {
      significantPositive.push(
        `- ${def.label}（μ=${mu.toFixed(2)}, SE=${se.toFixed(2)}）: ${def.description}`
      );
    } else if (z < -1.64) {
      significantNegative.push(
        `- ${def.label}（μ=${mu.toFixed(2)}, SE=${se.toFixed(2)}）: ${def.description}`
      );
    }
  }

  let diagnosisData = "";
  if (significantPositive.length > 0) {
    diagnosisData += `### 明らかに重視している価値観\n\n${significantPositive.join("\n")}\n\n`;
  } else {
    diagnosisData += `### 明らかに重視している価値観\n\n（統計的に有意な項目はありませんでした）\n\n`;
  }
  if (significantNegative.length > 0) {
    diagnosisData += `### 明らかに重視していない価値観\n\n${significantNegative.join("\n")}\n`;
  } else {
    diagnosisData += `### 明らかに重視していない価値観\n\n（統計的に有意な項目はありませんでした）\n`;
  }

  return PROMPT_TEMPLATE.replace("{{DIAGNOSIS_DATA}}", diagnosisData);
}

export default function AdminReportsPage() {
  const [sessions, setSessions] = useState<PendingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPrompt, setExpandedPrompt] = useState<string | null>(null);
  const [promptContent, setPromptContent] = useState<Record<string, string>>({});
  const [loadingPrompt, setLoadingPrompt] = useState<string | null>(null);

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports/pending");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const togglePrompt = async (session: PendingSession) => {
    const sid = session.session_id;

    if (expandedPrompt === sid) {
      setExpandedPrompt(null);
      return;
    }

    if (promptContent[sid]) {
      setExpandedPrompt(sid);
      return;
    }

    setLoadingPrompt(sid);
    try {
      const scoresRes = await fetch(`/api/admin/sessions/${sid}/scores`);
      if (!scoresRes.ok) throw new Error("スコアデータの取得に失敗しました");
      const scores: ScoresData = await scoresRes.json();
      const prompt = buildPrompt(scores);
      setPromptContent((prev) => ({ ...prev, [sid]: prompt }));
      setExpandedPrompt(sid);
    } catch {
      // silently fail
    } finally {
      setLoadingPrompt(null);
    }
  };

  const copyPrompt = async (sid: string) => {
    const text = promptContent[sid];
    if (!text) return;
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-[900px] mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-[var(--foreground)]">AIレポート管理</h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500">レポート未生成のセッションはありません</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">
              レポート未生成: {sessions.length}件
            </p>
            {sessions.map((s) => {
              const sid = s.session_id;
              const isExpanded = expandedPrompt === sid;
              const isLoadingThis = loadingPrompt === sid;

              return (
                <div
                  key={sid}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {s.display_name ?? s.username}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        @{s.username}
                        {s.completed_at && (
                          <span className="ml-2">
                            {new Date(s.completed_at).toLocaleDateString("ja-JP")} 完了
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => togglePrompt(s)}
                      disabled={isLoadingThis}
                      className="shrink-0 ml-4 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    >
                      {isLoadingThis ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          読み込み中
                        </span>
                      ) : isExpanded ? (
                        "プロンプトを閉じる"
                      ) : (
                        "プロンプトを表示"
                      )}
                    </button>
                  </div>

                  {isExpanded && promptContent[sid] && (
                    <div className="border-t border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-gray-500">
                          Claude Code に渡すプロンプト
                        </p>
                        <button
                          onClick={() => copyPrompt(sid)}
                          className="text-xs text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
                        >
                          コピー
                        </button>
                      </div>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap bg-white border border-gray-200 rounded-md p-4 max-h-[400px] overflow-y-auto leading-relaxed">
                        {promptContent[sid]}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
