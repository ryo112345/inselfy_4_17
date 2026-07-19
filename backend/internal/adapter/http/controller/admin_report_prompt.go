package controller

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"os"
	"strings"

	"github.com/jackc/pgx/v5"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

const zThreshold = 1.64

// GetPrompt handles GET /api/admin/sessions/{sessionId}/prompt.
func (c *AdminReportController) GetPrompt(ctx context.Context, req openapi.AdminGetWvPromptRequestObject) (openapi.AdminGetWvPromptResponseObject, error) {
	row, err := c.queries.GetWVNeedsScoresBySessionID(ctx, pgUUID(req.SessionId))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminGetWvPrompt404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "scores not found",
			}), nil
		}
		return nil, err
	}

	var mu map[string]float64
	var se map[string]float64
	if err := json.Unmarshal(row.Mu, &mu); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(row.Se, &se); err != nil {
		return nil, err
	}

	template, err := readPromptTemplate()
	if err != nil {
		return nil, err
	}

	prompt := buildReportPrompt(string(template), mu, se)

	return openapi.AdminGetWvPrompt200JSONResponse(openapi.ModelsAdminPromptResponse{Prompt: prompt}), nil
}

func buildReportPrompt(template string, mu, se map[string]float64) string {
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

	var diagData strings.Builder
	diagData.WriteString("### 明らかに重視している価値観\n\n")
	if len(positive) > 0 {
		diagData.WriteString(strings.Join(positive, "\n"))
	} else {
		diagData.WriteString("（統計的に有意な項目はありませんでした）")
	}
	diagData.WriteString("\n\n### 明らかに重視していない価値観\n\n")
	if len(negative) > 0 {
		diagData.WriteString(strings.Join(negative, "\n"))
	} else {
		diagData.WriteString("（統計的に有意な項目はありませんでした）")
	}
	diagData.WriteString("\n")

	// テンプレートの例示データ部分（「### 明らかに重視している」から「## レポート構成」の前まで）を置換
	parts := strings.SplitN(template, "### 明らかに重視している価値観", 2)
	if len(parts) != 2 {
		return template
	}
	afterParts := strings.SplitN(parts[1], "## レポート構成", 2)
	if len(afterParts) != 2 {
		return template
	}

	return parts[0] + diagData.String() + "## レポート構成" + afterParts[1]
}

func readPromptTemplate() ([]byte, error) {
	candidates := []string{
		"../prompts/work-values-report-prompt.md",
		"prompts/work-values-report-prompt.md",
		"../../prompts/work-values-report-prompt.md",
	}
	for _, p := range candidates {
		data, err := os.ReadFile(p) //nolint:gosec // G304: 候補パスは固定リテラルのみ
		if err == nil {
			return data, nil
		}
	}
	return nil, errors.New("prompt template not found in any candidate path")
}
