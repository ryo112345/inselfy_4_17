package controller

import (
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

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

const zThreshold = 1.64

func (c *AdminReportController) GetPrompt(ctx echo.Context, sessionID string) error {
	parsedSession, err := uuid.Parse(sessionID)
	if err != nil {
		return badRequest(ctx, "invalid session_id")
	}

	pgSessionID := pgtype.UUID{Bytes: parsedSession, Valid: true}
	row, err := c.queries.GetWVNeedsScoresBySessionID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "scores not found")
		}
		return internalError(ctx, err.Error())
	}

	var mu map[string]float64
	var se map[string]float64
	if err := json.Unmarshal(row.Mu, &mu); err != nil {
		return internalError(ctx, "failed to parse mu")
	}
	if err := json.Unmarshal(row.Se, &se); err != nil {
		return internalError(ctx, "failed to parse se")
	}

	template, err := readPromptTemplate()
	if err != nil {
		return internalError(ctx, "failed to read prompt template: "+err.Error())
	}

	prompt := buildReportPrompt(string(template), mu, se)

	return ctx.JSON(http.StatusOK, map[string]string{
		"prompt": prompt,
	})
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
		data, err := os.ReadFile(p)
		if err == nil {
			return data, nil
		}
	}
	return nil, fmt.Errorf("prompt template not found in any candidate path")
}
