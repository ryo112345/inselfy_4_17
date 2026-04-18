package workvalues

const N = 21

type NeedDef struct {
	ID            string
	Label         string
	DescriptionJa string
}

var NeedDefs = [N]NeedDef{
	{"ability_utilization", "能力活用", "自分の持つスキルや強みを存分に発揮できる"},
	{"achievement", "達成感", "目標を達成し、やり遂げた実感を得られる"},
	{"activity", "活動性", "仕事が途切れず、充実した密度で働ける環境がある"},
	{"advancement", "昇進", "実力や成果に応じて、キャリアアップできる"},
	{"authority", "権限", "チームに方向性を示し、リーダーとして導ける"},
	{"autonomy", "自律性", "自分のペースややり方で、仕事を進められる"},
	{"company_policies", "会社方針", "会社のルールや扱いが公平で、納得できる"},
	{"compensation", "報酬", "働きに見合った給与・待遇を得られる"},
	{"co_workers", "同僚関係", "気持ちよく協力し合える仲間がいる職場で働ける"},
	{"creativity", "創造性", "新しいアイデアや工夫を自由に試せる"},
	{"independence", "独立性", "他者に左右されず、一人で集中して取り組める"},
	{"moral_values", "道徳観", "自分の良心や価値観に反することを強いられない"},
	{"recognition", "承認", "自分の仕事ぶりや成果が、周囲にきちんと認められる"},
	{"responsibility", "責任", "重要な判断を任され、自分の裁量で意思決定できる"},
	{"security", "安定性", "長く安心して働き続けられる雇用がある"},
	{"social_service", "社会貢献", "誰かの役に立つことが、仕事の中心にある"},
	{"social_status", "社会的地位", "職業や立場を通じて、社会的に認められる"},
	{"supervision_hr", "上司の人間性", "部下の立場に立って、守ってくれる上司がいる"},
	{"supervision_technical", "上司の技術力", "仕事のやり方やスキルを丁寧に教える上司がいる"},
	{"variety", "多様性", "毎日同じではなく、変化や新しいことがある"},
	{"working_conditions", "労働環境", "職場の設備・雰囲気・働きやすさが整っている"},
}

var NeedIDs = func() [N]string {
	var ids [N]string
	for i, d := range NeedDefs {
		ids[i] = d.ID
	}
	return ids
}()

var needIndex map[string]int

func init() {
	needIndex = make(map[string]int, N)
	for i, id := range NeedIDs {
		needIndex[id] = i
	}
}

func NeedIndex(id string) (int, bool) {
	i, ok := needIndex[id]
	return i, ok
}

func NeedDefByID(id string) (NeedDef, bool) {
	i, ok := needIndex[id]
	if !ok {
		return NeedDef{}, false
	}
	return NeedDefs[i], true
}
