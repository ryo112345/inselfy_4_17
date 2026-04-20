import type { ValueId } from "./needs";

export const WV_MODIFIERS: Record<ValueId, string> = {
  achievement: "情熱的な",
  comfort: "堅実な",
  status: "野心的な",
  altruism: "心優しい",
  safety: "慎重な",
  autonomy: "独創的な",
};

const PERSONA_MAP: Record<string, { name: string; subtitle: string }> = {
  "achievement_comfort":  { name: "職人",         subtitle: "確かな成果を、確かな環境で積み上げる" },
  "achievement_status":   { name: "チャンピオン",  subtitle: "結果で勝負し、その名を刻む" },
  "achievement_altruism": { name: "ヒーロー",      subtitle: "人のために力を尽くし、成し遂げる" },
  "achievement_safety":   { name: "実務家",        subtitle: "安心できる場所で、着実に成果を出す" },
  "achievement_autonomy": { name: "開拓者",        subtitle: "自分の道を切り拓き、やり遂げる" },

  "comfort_achievement":  { name: "戦略家",        subtitle: "最高の環境を整え、成果を最大化する" },
  "comfort_status":       { name: "プロデューサー", subtitle: "最高の舞台を整え、表舞台に立つ" },
  "comfort_altruism":     { name: "調和者",        subtitle: "心地よい関係の中で、共に働く" },
  "comfort_safety":       { name: "設計者",        subtitle: "安定と快適さで、揺るがない基盤を築く" },
  "comfort_autonomy":     { name: "旅人",          subtitle: "自分らしい環境を、自分で選ぶ" },

  "status_achievement":   { name: "挑戦者",        subtitle: "高みを目指し、圧倒的な成果で証明する" },
  "status_comfort":       { name: "実力者",        subtitle: "地位と豊かさを、実力で手にする" },
  "status_altruism":      { name: "大使",          subtitle: "人望と影響力で、周囲を導く" },
  "status_safety":        { name: "権威者",        subtitle: "揺るがぬ信頼と地位を築き上げる" },
  "status_autonomy":      { name: "起業家",        subtitle: "自分で立ち上げて認められる" },

  "altruism_achievement": { name: "貢献者",        subtitle: "人のために全力を尽くし、結果を出す" },
  "altruism_comfort":     { name: "奉仕者",        subtitle: "あたたかい環境で、みんなを支える" },
  "altruism_status":      { name: "指導者",        subtitle: "信頼と敬意を集め、人を育てる" },
  "altruism_safety":      { name: "保護者",        subtitle: "安心を届け、誰も取り残さない" },
  "altruism_autonomy":    { name: "提唱者",        subtitle: "自分の信念で、人と社会を動かす" },

  "safety_achievement":   { name: "番人",          subtitle: "守りを固めて、確実に成果を出す" },
  "safety_comfort":       { name: "管理者",        subtitle: "安定した仕組みで、快適な環境を守る" },
  "safety_status":        { name: "支援者",        subtitle: "信頼の基盤から、着実に地位を築く" },
  "safety_altruism":      { name: "守護者",        subtitle: "人を守り、安心できる場をつくる" },
  "safety_autonomy":      { name: "独立者",        subtitle: "自分の領域を守り、自分のやり方を貫く" },

  "autonomy_achievement": { name: "冒険者",        subtitle: "自分の道で、誰も成し得ない成果を出す" },
  "autonomy_comfort":     { name: "探求者",        subtitle: "自分だけの理想の環境を追い求める" },
  "autonomy_status":      { name: "革命家",        subtitle: "既存の枠を壊し、新しい秩序をつくる" },
  "autonomy_altruism":    { name: "哲学者",        subtitle: "自分の信念で、人と社会に向き合う" },
  "autonomy_safety":      { name: "建築家",        subtitle: "独立した安全な仕組みを、自ら設計する" },
};

export function getWVPersona(sortedValues: { value_id: string }[]): {
  modifier: string;
  name: string;
  subtitle: string;
} {
  const first = sortedValues[0].value_id as ValueId;
  const second = sortedValues[1].value_id as ValueId;
  const third = sortedValues[2].value_id as ValueId;

  const persona = PERSONA_MAP[`${first}_${second}`] ?? { name: "—", subtitle: "" };
  const modifier = WV_MODIFIERS[third] ?? "";

  return { modifier, ...persona };
}
