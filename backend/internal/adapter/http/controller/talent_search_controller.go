package controller

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

type TalentSearchController struct {
	pool *pgxpool.Pool
}

func NewTalentSearchController(pool *pgxpool.Pool) *TalentSearchController {
	return &TalentSearchController{pool: pool}
}

type talentCard struct {
	UserID           string     `json:"user_id"`
	Username         string     `json:"username"`
	Name             string     `json:"name"`
	Headline         *string    `json:"headline"`
	AvatarURL        *string    `json:"avatar_url"`
	ProfileColor     *string    `json:"profile_color"`
	JobSeekingStatus *string    `json:"job_seeking_status"`
	Skills           []string   `json:"skills"`
	Experiences      []talentExp `json:"experiences"`
	TopWVLabels      []string   `json:"top_wv_labels"`
	TopCILabels      []string   `json:"top_ci_labels"`
	Similarity       *float64   `json:"similarity,omitempty"`
}

type talentExp struct {
	CompanyName string `json:"company_name"`
	Title       string `json:"title"`
}

func (c *TalentSearchController) Search(ctx echo.Context) error {
	keyword := ctx.QueryParam("q")
	skillsParam := ctx.QueryParam("skills")
	location := ctx.QueryParam("location")
	industry := ctx.QueryParam("industry")
	jobSeekingStatus := ctx.QueryParam("job_seeking_status")
	jobType := ctx.QueryParam("job_type")
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	if limit < 1 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var skills []string
	if skillsParam != "" {
		for _, s := range strings.Split(skillsParam, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				skills = append(skills, s)
			}
		}
	}

	query := `
		SELECT u.id, u.username, u.name, u.headline, u.avatar_url, u.profile_color, u.job_seeking_status
		FROM users u
		WHERE u.is_public = true`
	countQuery := `SELECT COUNT(*) FROM users u WHERE u.is_public = true`
	var args []any
	argIdx := 1

	if keyword != "" {
		clause := ` AND (u.name ILIKE $` + strconv.Itoa(argIdx) +
			` OR u.headline ILIKE $` + strconv.Itoa(argIdx) +
			` OR u.about ILIKE $` + strconv.Itoa(argIdx) + `)`
		query += clause
		countQuery += clause
		args = append(args, "%"+keyword+"%")
		argIdx++
	}
	if location != "" {
		clause := ` AND u.location = $` + strconv.Itoa(argIdx)
		query += clause
		countQuery += clause
		args = append(args, location)
		argIdx++
	}
	if industry != "" {
		clause := ` AND u.industry = $` + strconv.Itoa(argIdx)
		query += clause
		countQuery += clause
		args = append(args, industry)
		argIdx++
	}
	if jobSeekingStatus != "" {
		clause := ` AND u.job_seeking_status = $` + strconv.Itoa(argIdx)
		query += clause
		countQuery += clause
		args = append(args, jobSeekingStatus)
		argIdx++
	}
	if jobType != "" {
		clause := ` AND u.job_type = $` + strconv.Itoa(argIdx)
		query += clause
		countQuery += clause
		args = append(args, jobType)
		argIdx++
	}
	if len(skills) > 0 {
		clause := ` AND u.id IN (
			SELECT us.user_id FROM user_skills us
			JOIN skills s ON s.id = us.skill_id
			WHERE s.name = ANY($` + strconv.Itoa(argIdx) + `)
			GROUP BY us.user_id
			HAVING COUNT(DISTINCT s.name) = $` + strconv.Itoa(argIdx+1) + `)`
		query += clause
		countQuery += clause
		args = append(args, skills, len(skills))
		argIdx += 2
	}

	reqCtx := ctx.Request().Context()

	var total int
	countArgs := make([]any, len(args))
	copy(countArgs, args)
	if err := c.pool.QueryRow(reqCtx, countQuery, countArgs...).Scan(&total); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	query += ` ORDER BY u.created_at DESC LIMIT $` + strconv.Itoa(argIdx) + ` OFFSET $` + strconv.Itoa(argIdx+1)
	args = append(args, limit, offset)

	rows, err := c.pool.Query(reqCtx, query, args...)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	defer rows.Close()

	var users []talentCard
	for rows.Next() {
		var uid pgtype.UUID
		var username, name string
		var headline, avatarURL, profileColor, seekingStatus pgtype.Text

		if err := rows.Scan(&uid, &username, &name, &headline, &avatarURL, &profileColor, &seekingStatus); err != nil {
			continue
		}
		card := talentCard{
			UserID:   pgUUIDToString(uid),
			Username: username,
			Name:     name,
		}
		if headline.Valid {
			card.Headline = &headline.String
		}
		if avatarURL.Valid {
			card.AvatarURL = &avatarURL.String
		}
		if profileColor.Valid {
			card.ProfileColor = &profileColor.String
		}
		if seekingStatus.Valid {
			card.JobSeekingStatus = &seekingStatus.String
		}
		users = append(users, card)
	}

	if len(users) > 0 {
		c.enrichCards(reqCtx, users)
	}

	if users == nil {
		users = []talentCard{}
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"users": users,
		"total": total,
	})
}

func (c *TalentSearchController) DiagnosticSearch(ctx echo.Context) error {
	companyID := ctx.Get(authmw.CompanyIDKey).(string)
	teamID := ctx.QueryParam("team_id")
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	if limit < 1 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	reqCtx := ctx.Request().Context()

	var targetMu map[string]float64

	if teamID != "" {
		mu, err := c.getTeamAverageMu(reqCtx, companyID, teamID)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team not found or no completed WV data"})
		}
		targetMu = mu
	} else {
		targetMu = c.parseCustomWeights(ctx)
		if targetMu == nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team_id or custom wv_ weights required"})
		}
	}

	targetJSON, err := json.Marshal(targetMu)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	// SQL CTE: latest session per user, cosine similarity computed in DB
	query := `
WITH latest_wv AS (
  SELECT DISTINCT ON (wns.user_id) wns.user_id, wns.mu
  FROM work_needs_scores wns
  ORDER BY wns.user_id, wns.created_at DESC
),
target AS (
  SELECT $1::jsonb AS mu
),
similarity AS (
  SELECT
    lw.user_id,
    lw.mu,
    (
      SELECT
        CASE WHEN norm_a = 0 OR norm_b = 0 THEN 0
        ELSE (dot / (SQRT(norm_a) * SQRT(norm_b)) + 1.0) / 2.0
        END
      FROM (
        SELECT
          SUM(a_val * b_val) AS dot,
          SUM(a_val * a_val) AS norm_a,
          SUM(b_val * b_val) AS norm_b
        FROM jsonb_each_text(lw.mu) AS a(key, val)
        JOIN jsonb_each_text((SELECT mu FROM target)) AS b(key, val) ON a.key = b.key
        CROSS JOIN LATERAL (SELECT a.val::float8 AS a_val, b.val::float8 AS b_val) v
      ) inner_calc
    ) AS sim
  FROM latest_wv lw
)
SELECT
  u.id, u.username, u.name, u.headline, u.avatar_url, u.profile_color, u.job_seeking_status,
  ROUND((s.sim * 100)::numeric, 1) AS similarity_pct
FROM similarity s
JOIN users u ON u.id = s.user_id
WHERE u.is_public = true
ORDER BY s.sim DESC
LIMIT $2 OFFSET $3`

	rows, err := c.pool.Query(reqCtx, query, targetJSON, limit, offset)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	defer rows.Close()

	var users []talentCard
	for rows.Next() {
		var uid pgtype.UUID
		var username, name string
		var headline, avatarURL, profileColor, seekingStatus pgtype.Text
		var simPct pgtype.Numeric

		if err := rows.Scan(&uid, &username, &name, &headline, &avatarURL, &profileColor, &seekingStatus, &simPct); err != nil {
			continue
		}

		card := talentCard{
			UserID:   pgUUIDToString(uid),
			Username: username,
			Name:     name,
		}
		if headline.Valid {
			card.Headline = &headline.String
		}
		if avatarURL.Valid {
			card.AvatarURL = &avatarURL.String
		}
		if profileColor.Valid {
			card.ProfileColor = &profileColor.String
		}
		if seekingStatus.Valid {
			card.JobSeekingStatus = &seekingStatus.String
		}
		if simPct.Valid {
			f, _ := simPct.Float64Value()
			if f.Valid {
				card.Similarity = &f.Float64
			}
		}

		users = append(users, card)
	}

	var total int
	_ = c.pool.QueryRow(reqCtx,
		`SELECT COUNT(DISTINCT wns.user_id)
		 FROM work_needs_scores wns
		 JOIN users u ON u.id = wns.user_id
		 WHERE u.is_public = true`,
	).Scan(&total)

	if len(users) > 0 {
		c.enrichCards(reqCtx, users)
	}

	if users == nil {
		users = []talentCard{}
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"users": users,
		"total": total,
	})
}

func (c *TalentSearchController) enrichCards(ctx context.Context, cards []talentCard) {
	uids := make([]pgtype.UUID, len(cards))
	uidMap := make(map[string]int, len(cards))
	for i, card := range cards {
		uids[i] = pgUUID(card.UserID)
		uidMap[card.UserID] = i
	}

	expRows, err := c.pool.Query(ctx,
		`SELECT user_id, company_name, title FROM (
			SELECT user_id, company_name, title,
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY is_current DESC, start_year DESC, start_month DESC) AS rn
			FROM experiences WHERE user_id = ANY($1)
		) sub WHERE rn <= 2 ORDER BY user_id, rn`, uids)
	if err == nil {
		for expRows.Next() {
			var uid pgtype.UUID
			var companyName, title string
			if err := expRows.Scan(&uid, &companyName, &title); err == nil {
				id := pgUUIDToString(uid)
				if idx, ok := uidMap[id]; ok {
					cards[idx].Experiences = append(cards[idx].Experiences, talentExp{
						CompanyName: companyName,
						Title:       title,
					})
				}
			}
		}
		expRows.Close()
	}

	skillRows, err := c.pool.Query(ctx,
		`SELECT us.user_id, s.name FROM (
			SELECT user_id, skill_id,
				ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn
			FROM user_skills WHERE user_id = ANY($1)
		) us
		JOIN skills s ON s.id = us.skill_id
		WHERE us.rn <= 5
		ORDER BY us.user_id, us.rn`, uids)
	if err == nil {
		for skillRows.Next() {
			var uid pgtype.UUID
			var skillName string
			if err := skillRows.Scan(&uid, &skillName); err == nil {
				id := pgUUIDToString(uid)
				if idx, ok := uidMap[id]; ok {
					cards[idx].Skills = append(cards[idx].Skills, skillName)
				}
			}
		}
		skillRows.Close()
	}

	wvRows, err := c.pool.Query(ctx,
		`SELECT DISTINCT ON (wns.user_id) wns.user_id, wns.mu
		FROM work_needs_scores wns
		WHERE wns.user_id = ANY($1)
		ORDER BY wns.user_id, wns.created_at DESC`, uids)
	if err == nil {
		for wvRows.Next() {
			var uid pgtype.UUID
			var muJSON []byte
			if err := wvRows.Scan(&uid, &muJSON); err == nil {
				var mu map[string]float64
				if json.Unmarshal(muJSON, &mu) == nil {
					id := pgUUIDToString(uid)
					if idx, ok := uidMap[id]; ok {
						top3 := topNeedIDs(mu, 3)
						cards[idx].TopWVLabels = needLabels(top3)
					}
				}
			}
		}
		wvRows.Close()
	}

	ciRows, err := c.pool.Query(ctx,
		`SELECT ts.user_id, ts.type_id, ts.rank
		FROM (
			SELECT ts.type_id, ts.rank, s.user_id,
				ROW_NUMBER() OVER (PARTITION BY s.user_id, ts.type_id ORDER BY s.completed_at DESC) AS rn
			FROM career_interest_type_scores ts
			JOIN career_interest_sessions s ON s.id = ts.session_id
			WHERE s.user_id = ANY($1) AND s.status = 'completed'
		) ts
		WHERE ts.rn = 1 AND ts.rank <= 3
		ORDER BY ts.user_id, ts.rank`, uids)
	if err == nil {
		ciLabels := map[string]string{
			"R": "現実的", "I": "研究的", "A": "芸術的",
			"S": "社会的", "E": "企業的", "C": "慣習的",
		}
		for ciRows.Next() {
			var uid pgtype.UUID
			var typeID string
			var rank int
			if err := ciRows.Scan(&uid, &typeID, &rank); err == nil {
				id := pgUUIDToString(uid)
				if idx, ok := uidMap[id]; ok {
					if label, ok := ciLabels[typeID]; ok {
						cards[idx].TopCILabels = append(cards[idx].TopCILabels, label)
					}
				}
			}
		}
		ciRows.Close()
	}

	for i := range cards {
		if cards[i].Experiences == nil {
			cards[i].Experiences = []talentExp{}
		}
		if cards[i].Skills == nil {
			cards[i].Skills = []string{}
		}
		if cards[i].TopWVLabels == nil {
			cards[i].TopWVLabels = []string{}
		}
		if cards[i].TopCILabels == nil {
			cards[i].TopCILabels = []string{}
		}
	}
}

func (c *TalentSearchController) getTeamAverageMu(ctx context.Context, companyID, teamID string) (map[string]float64, error) {
	var ownerID pgtype.UUID
	teamUUID := pgUUID(teamID)
	err := c.pool.QueryRow(ctx,
		`SELECT company_id FROM teams WHERE id = $1`, teamUUID,
	).Scan(&ownerID)
	if err != nil {
		return nil, err
	}
	if pgUUIDToString(ownerID) != companyID {
		return nil, pgx.ErrNoRows
	}

	rows, err := c.pool.Query(ctx,
		`SELECT DISTINCT ON (wns.user_id) wns.mu
		FROM work_needs_scores wns
		JOIN team_members tm ON tm.user_id = wns.user_id
		WHERE tm.team_id = $1 AND tm.wv_status = 'completed'
		ORDER BY wns.user_id, wns.created_at DESC`, teamUUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	avg := make(map[string]float64)
	count := 0
	for rows.Next() {
		var muJSON []byte
		if err := rows.Scan(&muJSON); err != nil {
			continue
		}
		var mu map[string]float64
		if err := json.Unmarshal(muJSON, &mu); err != nil {
			continue
		}
		for _, id := range workvalues.NeedIDs {
			avg[id] += mu[id]
		}
		count++
	}
	if count == 0 {
		return nil, pgx.ErrNoRows
	}
	for k := range avg {
		avg[k] /= float64(count)
	}
	return avg, nil
}

func (c *TalentSearchController) parseCustomWeights(ctx echo.Context) map[string]float64 {
	weights := make(map[string]float64)
	hasAny := false
	for _, vid := range workvalues.ValueIDs {
		param := ctx.QueryParam("wv_" + vid)
		if param != "" {
			v, err := strconv.ParseFloat(param, 64)
			if err == nil {
				weights[vid] = v
				hasAny = true
			}
		}
	}
	if !hasAny {
		return nil
	}

	valNeeds := map[string][]string{
		"achievement": {"ability_utilization", "achievement"},
		"comfort":     {"activity", "independence", "variety", "compensation", "security", "working_conditions"},
		"status":      {"advancement", "authority", "recognition", "social_status"},
		"altruism":    {"co_workers", "moral_values", "social_service"},
		"safety":      {"company_policies", "supervision_hr", "supervision_technical"},
		"autonomy":    {"autonomy", "creativity", "responsibility"},
	}

	mu := make(map[string]float64)
	for vid, score := range weights {
		s := score / 100.0
		if s <= 0.01 {
			s = 0.01
		}
		if s >= 0.99 {
			s = 0.99
		}
		muVal := math.Log(s / (1.0 - s))

		for _, nid := range valNeeds[vid] {
			mu[nid] = muVal
		}
	}
	return mu
}
