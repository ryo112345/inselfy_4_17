package controller

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

var topicFiles = map[int16]string{
	1:  "01-career-story.md",
	2:  "02-user-manual.md",
	3:  "03-work-style.md",
	4:  "04-self-verbalization.md",
	5:  "05-transition-pattern.md",
	6:  "06-work-switch.md",
	7:  "07-crucible.md",
	8:  "08-leadership-type.md",
	9:  "09-ideal-teammate.md",
	10: "10-hidden-potential.md",
}

func (ctrl *AdminIntegratedReportController) GetPrompt(ctx echo.Context, requestID string) error {
	parsedReqID, err := uuid.Parse(requestID)
	if err != nil {
		return badRequest(ctx, "invalid request_id")
	}

	pgReqID := pgtype.UUID{Bytes: parsedReqID, Valid: true}
	reqCtx := ctx.Request().Context()

	req, err := ctrl.queries.GetIntegratedReportRequestByID(reqCtx, pgReqID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "request not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	base, err := readIntegratedBaseTemplate()
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to read base template: " + err.Error()})
	}

	topics := []int16{req.Topic1, req.Topic2, req.Topic3}
	var chapterBlocks [3]string
	for i, topicNum := range topics {
		content, err := readIntegratedTopicFile(topicNum)
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": fmt.Sprintf("failed to read topic %d: %s", topicNum, err.Error())})
		}
		chapterBlocks[i] = strings.ReplaceAll(string(content), "{{CHAPTER_NUM}}", fmt.Sprintf("%d", i+1))
	}

	freeTextBlock := fmt.Sprintf(`### 第4章: ユーザーからのリクエスト

ユーザーが自由記述で以下のリクエストを書きました:
「%s」

このリクエストに対して、診断結果（Work Values + Career Interest）と職歴・スキルのデータを踏まえて、この人固有の回答を書いてください。
汎用的な回答は禁止です。必ずこの人のデータに基づいた具体的な内容にしてください。
2〜3段落、各200文字以内。`, req.FreeText)

	prompt := string(base)
	prompt = strings.Replace(prompt, "{{CHAPTER_1}}", chapterBlocks[0], 1)
	prompt = strings.Replace(prompt, "{{CHAPTER_2}}", chapterBlocks[1], 1)
	prompt = strings.Replace(prompt, "{{CHAPTER_3}}", chapterBlocks[2], 1)
	prompt = strings.Replace(prompt, "{{CHAPTER_4_FREETEXT}}", freeTextBlock, 1)

	experiences, err := ctrl.queries.ListExperiencesByUserID(reqCtx, req.UserID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to fetch experiences"})
	}
	prompt = strings.Replace(prompt, "{{EXPERIENCES}}", buildExperiencesMarkdown(experiences), 1)

	educations, err := ctrl.queries.ListEducationsByUserID(reqCtx, req.UserID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to fetch educations"})
	}
	prompt = strings.Replace(prompt, "{{EDUCATIONS}}", buildEducationsMarkdown(educations), 1)

	skills, err := ctrl.queries.ListUserSkills(reqCtx, req.UserID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to fetch skills"})
	}
	prompt = strings.Replace(prompt, "{{SKILLS}}", buildSkillsMarkdown(skills), 1)

	wvDiag, err := ctrl.buildWVDiagnosis(reqCtx, req.UserID)
	if err != nil {
		prompt = strings.Replace(prompt, "{{WV_DIAGNOSIS}}", "（Work Values 診断データなし）", 1)
	} else {
		prompt = strings.Replace(prompt, "{{WV_DIAGNOSIS}}", wvDiag, 1)
	}

	ciDiag, err := ctrl.buildCIDiagnosis(reqCtx, req.UserID)
	if err != nil {
		prompt = strings.Replace(prompt, "{{CI_DIAGNOSIS}}", "（Career Interest 診断データなし）", 1)
	} else {
		prompt = strings.Replace(prompt, "{{CI_DIAGNOSIS}}", ciDiag, 1)
	}

	return ctx.JSON(http.StatusOK, map[string]string{
		"prompt": prompt,
	})
}

func (ctrl *AdminIntegratedReportController) buildWVDiagnosis(ctx context.Context, userID pgtype.UUID) (string, error) {
	wvSessionID, err := ctrl.queries.GetLatestWVCompletedSessionByUserID(ctx, userID)
	if err != nil {
		return "", err
	}

	row, err := ctrl.queries.GetWVNeedsScoresBySessionID(ctx, wvSessionID)
	if err != nil {
		return "", err
	}

	var mu map[string]float64
	var se map[string]float64
	if err := json.Unmarshal(row.Mu, &mu); err != nil {
		return "", err
	}
	if err := json.Unmarshal(row.Se, &se); err != nil {
		return "", err
	}

	var positive []string
	var negative []string
	for _, def := range workvalues.NeedDefs {
		m, okM := mu[def.ID]
		s, okS := se[def.ID]
		if !okM || !okS || s == 0 {
			continue
		}
		z := m / s
		if math.Abs(z) <= zThreshold {
			continue
		}
		line := fmt.Sprintf("- %s（μ=%.2f, SE=%.2f）: %s", def.Label, m, s, def.DescriptionJa)
		if z > zThreshold {
			positive = append(positive, line)
		} else {
			negative = append(negative, line)
		}
	}

	var sb strings.Builder
	sb.WriteString("**明確に重視している価値観:** ")
	if len(positive) > 0 {
		sb.WriteString("\n")
		sb.WriteString(strings.Join(positive, "\n"))
	} else {
		sb.WriteString("（統計的に有意な項目はありませんでした）")
	}
	sb.WriteString("\n\n**明確に重視していない価値観:** ")
	if len(negative) > 0 {
		sb.WriteString("\n")
		sb.WriteString(strings.Join(negative, "\n"))
	} else {
		sb.WriteString("（統計的に有意な項目はありませんでした）")
	}
	return sb.String(), nil
}

func (ctrl *AdminIntegratedReportController) buildCIDiagnosis(ctx context.Context, userID pgtype.UUID) (string, error) {
	ciSessionID, err := ctrl.queries.GetLatestCICompletedSessionByUserID(ctx, userID)
	if err != nil {
		return "", err
	}

	typeScores, err := ctrl.queries.GetCITypeScoresBySessionID(ctx, ciSessionID)
	if err != nil {
		return "", err
	}

	basicScores, err := ctrl.queries.GetCIBasicScoresBySessionID(ctx, ciSessionID)
	if err != nil {
		return "", err
	}

	var sb strings.Builder

	if len(typeScores) >= 3 {
		hollandCode := typeScores[0].TypeID + typeScores[1].TypeID + typeScores[2].TypeID
		sb.WriteString(fmt.Sprintf("ホランドコード: %s\n\n", hollandCode))
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
	sb.WriteString("【基本興味スコア】\n")
	sb.WriteString(strings.Join(scoreParts, ", "))

	return sb.String(), nil
}

func buildExperiencesMarkdown(experiences []*generated.Experience) string {
	if len(experiences) == 0 {
		return "（職歴データなし）"
	}
	var sb strings.Builder
	for _, exp := range experiences {
		period := fmt.Sprintf("%d年%d月", exp.StartYear, exp.StartMonth)
		if exp.IsCurrent {
			period += "〜現在"
		} else if exp.EndYear.Valid && exp.EndMonth.Valid {
			period += fmt.Sprintf("〜%d年%d月", exp.EndYear.Int16, exp.EndMonth.Int16)
		}
		sb.WriteString(fmt.Sprintf("- **%s** / %s（%s）\n", exp.CompanyName, exp.Title, period))
		if exp.Description != "" {
			sb.WriteString(fmt.Sprintf("  業務内容: %s\n", exp.Description))
		}
	}
	return sb.String()
}

func buildEducationsMarkdown(educations []*generated.Education) string {
	if len(educations) == 0 {
		return "（学歴データなし）"
	}
	var sb strings.Builder
	for _, edu := range educations {
		line := fmt.Sprintf("- %s", edu.School)
		if edu.Degree.Valid && edu.Degree.String != "" {
			line += fmt.Sprintf(" / %s", edu.Degree.String)
		}
		sb.WriteString(line + "\n")
	}
	return sb.String()
}

func buildSkillsMarkdown(skills []*generated.ListUserSkillsRow) string {
	if len(skills) == 0 {
		return "（スキルデータなし）"
	}
	names := make([]string, 0, len(skills))
	for _, s := range skills {
		names = append(names, s.Name)
	}
	return strings.Join(names, ", ")
}

func readIntegratedBaseTemplate() ([]byte, error) {
	candidates := []string{
		"../prompts/integrated-report-base.md",
		"prompts/integrated-report-base.md",
		"../../prompts/integrated-report-base.md",
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err == nil {
			return data, nil
		}
	}
	return nil, fmt.Errorf("integrated base template not found")
}

func readIntegratedTopicFile(topicNum int16) ([]byte, error) {
	filename, ok := topicFiles[topicNum]
	if !ok {
		return nil, fmt.Errorf("invalid topic number: %d", topicNum)
	}
	candidates := []string{
		"../prompts/integrated-report-topics/" + filename,
		"prompts/integrated-report-topics/" + filename,
		"../../prompts/integrated-report-topics/" + filename,
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p)
		if err == nil {
			return data, nil
		}
	}
	return nil, fmt.Errorf("topic file not found: %s", filename)
}
