package controller

import (
	"fmt"
	"os"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
)

type ciResponse struct {
	ItemCode string `json:"item_code"`
	Score    int    `json:"score"`
}

func buildCIReportPrompt(
	template string,
	typeScores []*generated.GetCITypeScoresBySessionIDRow,
	basicScores []*generated.GetCIBasicScoresBySessionIDRow,
	responses []ciResponse,
) string {
	if len(typeScores) >= 3 {
		hollandCode := typeScores[0].TypeID + typeScores[1].TypeID + typeScores[2].TypeID
		template = strings.Replace(template, "（）", fmt.Sprintf("（%s）", hollandCode), 1)
	}

	basicScoreMap := make(map[string]float32, len(basicScores))
	for _, s := range basicScores {
		basicScoreMap[s.BasicInterestID] = s.Score
	}
	basicIDs := []string{
		"R1", "R2", "R3", "I1", "I2", "I3", "I4",
		"A1", "A2", "A3", "S1", "S2", "S3", "S4",
		"E1", "E2", "E3", "C1", "C2", "C3",
	}
	var scoreParts []string
	for _, id := range basicIDs {
		scoreParts = append(scoreParts, fmt.Sprintf("%s=%.2f", id, basicScoreMap[id]))
	}
	template = replaceLinePrefix(template, "R1=0.00,", strings.Join(scoreParts, ", "))

	responseMap := make(map[string]int, len(responses))
	for _, r := range responses {
		responseMap[r.ItemCode] = r.Score
	}

	// Group items by basic interest, ordered entry→mid→advanced (Q1/Q2/Q3)
	skillOrder := map[string]int{"entry": 0, "mid": 1, "advanced": 2}
	type itemByBI struct {
		codes [3]string // entry, mid, advanced
	}
	biItems := make(map[string]*itemByBI)
	for _, item := range careerinterest.AllItems {
		bi := item.BasicInterestID
		if _, ok := biItems[bi]; !ok {
			biItems[bi] = &itemByBI{}
		}
		idx := skillOrder[item.SkillLevel]
		biItems[bi].codes[idx] = item.ItemCode
	}

	var answerParts []string
	for _, id := range basicIDs {
		items := biItems[id]
		if items == nil {
			answerParts = append(answerParts, fmt.Sprintf("%s: //", id))
			continue
		}
		var scores []string
		for _, code := range items.codes {
			if code == "" {
				scores = append(scores, "")
			} else if v, ok := responseMap[code]; ok {
				scores = append(scores, fmt.Sprintf("%d", v))
			} else {
				scores = append(scores, "")
			}
		}
		answerParts = append(answerParts, fmt.Sprintf("%s: %s", id, strings.Join(scores, "/")))
	}
	template = replaceLinePrefix(template, "R1: / R2:", strings.Join(answerParts, " "))

	return template
}

func replaceLinePrefix(template, prefix, replacement string) string {
	lines := strings.Split(template, "\n")
	for i, line := range lines {
		if strings.Contains(line, prefix) {
			lines[i] = replacement
			break
		}
	}
	return strings.Join(lines, "\n")
}

func readCIPromptTemplate() ([]byte, error) {
	candidates := []string{
		"../prompts/career-interest-report-prompt.md",
		"prompts/career-interest-report-prompt.md",
		"../../prompts/career-interest-report-prompt.md",
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err == nil {
			return data, nil
		}
	}
	return nil, fmt.Errorf("CI prompt template not found in any candidate path")
}
