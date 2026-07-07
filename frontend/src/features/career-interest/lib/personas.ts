import type { TypeId } from "./types";

export const CI_MODIFIERS: Record<TypeId, string> = {
  R: "実践的な",
  I: "分析的な",
  A: "創造的な",
  S: "共感的な",
  E: "戦略的な",
  C: "堅実な",
};

const PERSONA_MAP: Record<string, { name: string; subtitle: string }> = {
  R_I: { name: "匠", subtitle: "知と技を重ね、確かなものを生み出す" },
  R_A: { name: "体現者", subtitle: "発想を自らの手で形にする" },
  R_S: { name: "伴走者", subtitle: "背中で語り、人と共に歩む" },
  R_E: { name: "推進者", subtitle: "先頭に立ち、道なき道を進む" },
  R_C: { name: "達人", subtitle: "ひとつを極め、揺るがない力にする" },

  I_R: { name: "解明者", subtitle: "仮説を立て、自らの手で確かめる" },
  I_A: { name: "発想家", subtitle: "知の深みから、新しい問いを生む" },
  I_S: { name: "洞察者", subtitle: "静かに見つめ、人の本質を捉える" },
  I_E: { name: "参謀", subtitle: "論理と直感で、最善の一手を導く" },
  I_C: { name: "検証者", subtitle: "あらゆる角度から、真実を見極める" },

  A_R: { name: "造形者", subtitle: "感性と技術をひとつに紡ぐ" },
  A_I: { name: "夢想家", subtitle: "まだ見ぬ世界を、頭の中に描く" },
  A_S: { name: "表現者", subtitle: "表現を通じて、人の心を動かす" },
  A_E: { name: "仕掛け人", subtitle: "想像力で周囲を巻き込み、現実にする" },
  A_C: { name: "審美家", subtitle: "細部にこだわり、美と精度を両立させる" },

  S_R: { name: "盟友", subtitle: "行動で寄り添い、確かな力になる" },
  S_I: { name: "理解者", subtitle: "深く耳を傾け、人の本音に触れる" },
  S_A: { name: "共鳴者", subtitle: "感性の力で、人の心に光を灯す" },
  S_E: { name: "結束者", subtitle: "人をつなぎ、ひとつの方向へ導く" },
  S_C: { name: "世話人", subtitle: "丁寧に場を調え、みんなを活かす" },

  E_R: { name: "実行者", subtitle: "決めたら動く、結果で証明する" },
  E_I: { name: "知略家", subtitle: "知恵と決断で、突破口を開く" },
  E_A: { name: "先導者", subtitle: "アイデアに火をつけ、人を動かす" },
  E_S: { name: "鼓舞者", subtitle: "人の力を引き出し、成果を最大にする" },
  E_C: { name: "統率者", subtitle: "仕組みで勝つ道筋をつくる" },

  C_R: { name: "完遂者", subtitle: "正確な技で、最後まで完璧に仕上げる" },
  C_I: { name: "体系家", subtitle: "知識を整え、確かな土台を築く" },
  C_A: { name: "巧者", subtitle: "細部を磨き上げ、完成度を極める" },
  C_S: { name: "調整者", subtitle: "人と情報を整理し、円滑に回す" },
  C_E: { name: "立案家", subtitle: "計画を立て、着実にゴールへ導く" },
};

export function getCIPersona(sortedTypes: { typeId: string }[]): {
  modifier: string;
  name: string;
  subtitle: string;
} {
  const first = sortedTypes[0].typeId as TypeId;
  const second = sortedTypes[1].typeId as TypeId;
  const third = sortedTypes[2].typeId as TypeId;

  const persona = PERSONA_MAP[`${first}_${second}`] ?? { name: "—", subtitle: "" };
  const modifier = CI_MODIFIERS[third] ?? "";

  return { modifier, ...persona };
}
