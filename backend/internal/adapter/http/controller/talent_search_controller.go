package controller

import (
	"context"
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
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
	WVSimilarity     *float64   `json:"wv_similarity,omitempty"`
	CISimilarity     *float64   `json:"ci_similarity,omitempty"`
	IntSimilarity    *float64   `json:"integrated_similarity,omitempty"`
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

	if limit < 1 || limit > 200 {
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

	if limit < 1 || limit > 200 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	reqCtx := ctx.Request().Context()

	var targetWV map[string]float64

	if teamID != "" {
		wv, err := c.getTeamAverageWVDisplayScores(reqCtx, companyID, teamID)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team not found or no completed WV data"})
		}
		targetWV = wv
	} else {
		targetWV = c.parseCustomWVDisplayScores(ctx)
		if targetWV == nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team_id or custom wv_ weights required"})
		}
	}

	scored, err := c.computeWVScores(reqCtx, targetWV)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	sort.Slice(scored, func(i, j int) bool { return scored[i].sim > scored[j].sim })
	total := len(scored)

	if offset >= len(scored) {
		scored = nil
	} else {
		end := offset + limit
		if end > len(scored) {
			end = len(scored)
		}
		scored = scored[offset:end]
	}

	if len(scored) == 0 {
		return ctx.JSON(http.StatusOK, map[string]any{"users": []talentCard{}, "total": total})
	}

	users := c.fetchUserCards(reqCtx, scored)
	for i := range users {
		users[i].WVSimilarity = users[i].Similarity
	}

	if len(users) > 0 {
		c.enrichCards(reqCtx, users)
		var targetCI *[6]float64
		if teamID != "" {
			if ci, err := c.getTeamAverageCIScores(reqCtx, companyID, teamID); err == nil {
				targetCI = &ci
			}
		} else if ci, ok := c.parseCustomCIWeights(ctx); ok {
			targetCI = &ci
		}
		c.fillCrossSimilarity(reqCtx, users, nil, targetCI)
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

func (c *TalentSearchController) fillCrossSimilarity(ctx context.Context, cards []talentCard, targetWV map[string]float64, targetCI *[6]float64) {
	if len(cards) == 0 {
		return
	}
	uids := make([]pgtype.UUID, len(cards))
	uidMap := make(map[string]int, len(cards))
	for i, card := range cards {
		uids[i] = pgUUID(card.UserID)
		uidMap[card.UserID] = i
	}

	if targetWV != nil {
		rows, err := c.pool.Query(ctx, `
SELECT DISTINCT ON (s.user_id) s.user_id, s.id
FROM work_values_sessions s
WHERE s.user_id = ANY($1) AND s.status = 'completed'
ORDER BY s.user_id, s.completed_at DESC`, uids)
		if err == nil {
			var sids []pgtype.UUID
			userSessionMap := make(map[string]string)
			for rows.Next() {
				var uid, sid pgtype.UUID
				if rows.Scan(&uid, &sid) == nil {
					uidStr := pgUUIDToString(uid)
					sidStr := pgUUIDToString(sid)
					userSessionMap[sidStr] = uidStr
					sids = append(sids, sid)
				}
			}
			rows.Close()

			if len(sids) > 0 {
				scoreRows, err := c.pool.Query(ctx,
					`SELECT session_id, value_id, display_score FROM work_values_scores WHERE session_id = ANY($1)`, sids)
				if err == nil {
					sessionScores := make(map[string]map[string]float64)
					for scoreRows.Next() {
						var sid pgtype.UUID
						var vid string
						var ds float64
						if scoreRows.Scan(&sid, &vid, &ds) == nil {
							sidStr := pgUUIDToString(sid)
							if sessionScores[sidStr] == nil {
								sessionScores[sidStr] = make(map[string]float64)
							}
							sessionScores[sidStr][vid] = ds
						}
					}
					scoreRows.Close()

					for sidStr, userScores := range sessionScores {
						uidStr := userSessionMap[sidStr]
						if idx, ok := uidMap[uidStr]; ok && cards[idx].WVSimilarity == nil {
							sim := gaussianWVSimilarity(userScores, targetWV)
							cards[idx].WVSimilarity = &sim
						}
					}
				}
			}
		}
	}

	if targetCI != nil {
		rows, err := c.pool.Query(ctx, `
SELECT DISTINCT ON (s.user_id) s.user_id, s.id
FROM career_interest_sessions s
WHERE s.user_id = ANY($1) AND s.status = 'completed'
ORDER BY s.user_id, s.completed_at DESC`, uids)
		if err == nil {
			var sids []pgtype.UUID
			userSessionMap := make(map[string]string)
			for rows.Next() {
				var uid, sid pgtype.UUID
				if rows.Scan(&uid, &sid) == nil {
					uidStr := pgUUIDToString(uid)
					sidStr := pgUUIDToString(sid)
					userSessionMap[sidStr] = uidStr
					sids = append(sids, sid)
				}
			}
			rows.Close()

			if len(sids) > 0 {
				scoreRows, err := c.pool.Query(ctx,
					`SELECT session_id, type_id, score FROM career_interest_type_scores WHERE session_id = ANY($1)`, sids)
				if err == nil {
					sessionScores := make(map[string][6]float64)
					for scoreRows.Next() {
						var sid pgtype.UUID
						var tid string
						var score float64
						if scoreRows.Scan(&sid, &tid, &score) == nil {
							sidStr := pgUUIDToString(sid)
							scores := sessionScores[sidStr]
							if idx, ok := ciTypeIndex[tid]; ok {
								scores[idx] = score
							}
							sessionScores[sidStr] = scores
						}
					}
					scoreRows.Close()

					for sidStr, userScores := range sessionScores {
						uidStr := userSessionMap[sidStr]
						if idx, ok := uidMap[uidStr]; ok && cards[idx].CISimilarity == nil {
							sim := gaussianCISimilarity(userScores, *targetCI)
							cards[idx].CISimilarity = &sim
						}
					}
				}
			}
		}
	}

	for i := range cards {
		if cards[i].WVSimilarity != nil && cards[i].CISimilarity != nil && cards[i].IntSimilarity == nil {
			avg := (*cards[i].WVSimilarity + *cards[i].CISimilarity) / 2.0
			rounded := math.Round(avg*10) / 10
			cards[i].IntSimilarity = &rounded
		}
	}
}

var ciTypeIDs = [6]string{"R", "I", "A", "S", "E", "C"}

func (c *TalentSearchController) CIDiagnosticSearch(ctx echo.Context) error {
	companyID := ctx.Get(authmw.CompanyIDKey).(string)
	teamID := ctx.QueryParam("team_id")
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	if limit < 1 || limit > 200 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	reqCtx := ctx.Request().Context()
	var target [6]float64

	if teamID != "" {
		scores, err := c.getTeamAverageCIScores(reqCtx, companyID, teamID)
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team not found or no completed CI data"})
		}
		target = scores
	} else {
		scores, ok := c.parseCustomCIWeights(ctx)
		if !ok {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team_id or custom ci_ weights required"})
		}
		target = scores
	}

	scored, err := c.computeCIScores(reqCtx, target)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	sort.Slice(scored, func(i, j int) bool { return scored[i].sim > scored[j].sim })
	total := len(scored)

	if offset >= len(scored) {
		scored = nil
	} else {
		end := offset + limit
		if end > len(scored) {
			end = len(scored)
		}
		scored = scored[offset:end]
	}

	if len(scored) == 0 {
		return ctx.JSON(http.StatusOK, map[string]any{"users": []talentCard{}, "total": total})
	}

	users := c.fetchUserCards(reqCtx, scored)
	for i := range users {
		users[i].CISimilarity = users[i].Similarity
	}

	if len(users) > 0 {
		c.enrichCards(reqCtx, users)
		var targetWV map[string]float64
		if teamID != "" {
			if wv, err := c.getTeamAverageWVDisplayScores(reqCtx, companyID, teamID); err == nil {
				targetWV = wv
			}
		} else {
			targetWV = c.parseCustomWVDisplayScores(ctx)
		}
		c.fillCrossSimilarity(reqCtx, users, targetWV, nil)
	}

	if users == nil {
		users = []talentCard{}
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"users": users,
		"total": total,
	})
}

func (c *TalentSearchController) IntegratedDiagnosticSearch(ctx echo.Context) error {
	companyID := ctx.Get(authmw.CompanyIDKey).(string)
	teamID := ctx.QueryParam("team_id")
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	if limit < 1 || limit > 200 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	reqCtx := ctx.Request().Context()

	var targetWV map[string]float64
	var targetCI [6]float64

	if teamID != "" {
		wv, errWV := c.getTeamAverageWVDisplayScores(reqCtx, companyID, teamID)
		ci, errCI := c.getTeamAverageCIScores(reqCtx, companyID, teamID)
		if errWV != nil && errCI != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team not found or no completed diagnostic data"})
		}
		if errWV != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team has no completed WV data"})
		}
		if errCI != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "team has no completed CI data"})
		}
		targetWV = wv
		targetCI = ci
	} else {
		targetWV = c.parseCustomWVDisplayScores(ctx)
		ci, hasCI := c.parseCustomCIWeights(ctx)
		if targetWV == nil || !hasCI {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "both wv_ and ci_ weights required"})
		}
		targetCI = ci
	}

	wvScored, err := c.computeWVScores(reqCtx, targetWV)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	ciScored, err := c.computeCIScores(reqCtx, targetCI)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	wvMap := make(map[string]float64, len(wvScored))
	for _, s := range wvScored {
		wvMap[s.userID] = s.sim
	}
	ciMap := make(map[string]float64, len(ciScored))
	for _, s := range ciScored {
		ciMap[s.userID] = s.sim
	}

	var scored []intScored
	for uid, wvSim := range wvMap {
		ciSim, ok := ciMap[uid]
		if !ok {
			continue
		}
		overall := math.Round((wvSim+ciSim)/2.0*10) / 10
		scored = append(scored, intScored{uid, overall, wvSim, ciSim})
	}

	sort.Slice(scored, func(i, j int) bool { return scored[i].sim > scored[j].sim })
	total := len(scored)

	if offset >= len(scored) {
		scored = nil
	} else {
		end := offset + limit
		if end > len(scored) {
			end = len(scored)
		}
		scored = scored[offset:end]
	}

	if len(scored) == 0 {
		return ctx.JSON(http.StatusOK, map[string]any{"users": []talentCard{}, "total": total})
	}

	basicScored := make([]scoredUser, len(scored))
	for i, s := range scored {
		basicScored[i] = scoredUser{s.userID, s.sim}
	}
	users := c.fetchUserCards(reqCtx, basicScored)
	for i := range users {
		for _, s := range scored {
			if s.userID == users[i].UserID {
				wv := math.Round(s.wvSim*10) / 10
				ci := math.Round(s.ciSim*10) / 10
				users[i].WVSimilarity = &wv
				users[i].CISimilarity = &ci
				users[i].IntSimilarity = users[i].Similarity
				break
			}
		}
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

func (c *TalentSearchController) getTeamAverageCIScores(ctx context.Context, companyID, teamID string) ([6]float64, error) {
	var ownerID pgtype.UUID
	teamUUID := pgUUID(teamID)
	err := c.pool.QueryRow(ctx,
		`SELECT company_id FROM teams WHERE id = $1`, teamUUID,
	).Scan(&ownerID)
	if err != nil {
		return [6]float64{}, err
	}
	if pgUUIDToString(ownerID) != companyID {
		return [6]float64{}, pgx.ErrNoRows
	}

	rows, err := c.pool.Query(ctx,
		`SELECT ts.type_id, AVG(ts.score) AS avg_score
		FROM career_interest_type_scores ts
		JOIN (
			SELECT DISTINCT ON (s.user_id) s.id AS session_id
			FROM career_interest_sessions s
			JOIN team_members tm ON tm.user_id = s.user_id
			WHERE tm.team_id = $1 AND tm.ci_status = 'completed' AND s.status = 'completed'
			ORDER BY s.user_id, s.completed_at DESC
		) latest ON ts.session_id = latest.session_id
		GROUP BY ts.type_id`, teamUUID)
	if err != nil {
		return [6]float64{}, err
	}
	defer rows.Close()

	typeIndex := map[string]int{"R": 0, "I": 1, "A": 2, "S": 3, "E": 4, "C": 5}
	var scores [6]float64
	count := 0
	for rows.Next() {
		var typeID string
		var avgScore float64
		if err := rows.Scan(&typeID, &avgScore); err == nil {
			if idx, ok := typeIndex[typeID]; ok {
				scores[idx] = avgScore
				count++
			}
		}
	}
	if count == 0 {
		return [6]float64{}, pgx.ErrNoRows
	}
	return scores, nil
}

func (c *TalentSearchController) parseCustomCIWeights(ctx echo.Context) ([6]float64, bool) {
	var scores [6]float64
	hasAny := false
	for i, tid := range ciTypeIDs {
		param := ctx.QueryParam("ci_" + tid)
		if param != "" {
			v, err := strconv.ParseFloat(param, 64)
			if err == nil {
				scores[i] = v
				hasAny = true
			}
		}
	}
	return scores, hasAny
}

const (
	sigmaWV       = 18.0
	sigmaCI       = 0.7
	geomeanFloor  = 0.001
)

var ciTypeIndex = map[string]int{"R": 0, "I": 1, "A": 2, "S": 3, "E": 4, "C": 5}

var wvValueIDs = []string{"achievement", "comfort", "status", "altruism", "safety", "autonomy"}

func gauss(diff, sigma float64) float64 {
	return math.Exp(-(diff * diff) / (2 * sigma * sigma))
}

func gaussianWVSimilarity(userScores, targetScores map[string]float64) float64 {
	var logSum, weightTotal float64
	for _, vid := range wvValueIDs {
		u, uOk := userScores[vid]
		t, tOk := targetScores[vid]
		if !uOk || !tOk {
			continue
		}
		closeness := gauss(math.Abs(u-t), sigmaWV)
		logSum += u * math.Log(closeness+geomeanFloor)
		weightTotal += u
	}
	if weightTotal == 0 {
		return 0
	}
	return math.Round(math.Exp(logSum/weightTotal)*1000) / 10
}

func gaussianCISimilarity(userScores, targetScores [6]float64) float64 {
	var logSum float64
	count := 0
	for i := 0; i < 6; i++ {
		if userScores[i] == 0 && targetScores[i] == 0 {
			continue
		}
		logSum += math.Log(gauss(math.Abs(userScores[i]-targetScores[i]), sigmaCI) + geomeanFloor)
		count++
	}
	if count == 0 {
		return 0
	}
	return math.Round(math.Exp(logSum/float64(count))*1000) / 10
}

type scoredUser struct {
	userID string
	sim    float64
}

type intScored struct {
	userID string
	sim    float64
	wvSim  float64
	ciSim  float64
}

func (c *TalentSearchController) fetchUserCards(ctx context.Context, scored []scoredUser) []talentCard {
	if len(scored) == 0 {
		return nil
	}
	uids := make([]pgtype.UUID, len(scored))
	simMap := make(map[string]float64, len(scored))
	for i, s := range scored {
		uids[i] = pgUUID(s.userID)
		simMap[s.userID] = s.sim
	}

	rows, err := c.pool.Query(ctx,
		`SELECT id, username, name, headline, avatar_url, profile_color, job_seeking_status
		 FROM users WHERE id = ANY($1) AND is_public = true`, uids)
	if err != nil {
		return nil
	}
	defer rows.Close()

	cardMap := make(map[string]*talentCard, len(scored))
	for rows.Next() {
		var uid pgtype.UUID
		var username, name string
		var headline, avatarURL, profileColor, seekingStatus pgtype.Text
		if err := rows.Scan(&uid, &username, &name, &headline, &avatarURL, &profileColor, &seekingStatus); err != nil {
			continue
		}
		card := &talentCard{
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
		sim := simMap[card.UserID]
		card.Similarity = &sim
		cardMap[card.UserID] = card
	}

	result := make([]talentCard, 0, len(scored))
	for _, s := range scored {
		if card, ok := cardMap[s.userID]; ok {
			result = append(result, *card)
		}
	}
	return result
}

func (c *TalentSearchController) getTeamAverageWVDisplayScores(ctx context.Context, companyID, teamID string) (map[string]float64, error) {
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
		`SELECT ws.value_id, AVG(ws.display_score) AS avg_score
		FROM work_values_scores ws
		JOIN (
			SELECT DISTINCT ON (s.user_id) s.id AS session_id
			FROM work_values_sessions s
			JOIN team_members tm ON tm.user_id = s.user_id
			WHERE tm.team_id = $1 AND tm.wv_status = 'completed' AND s.status = 'completed'
			ORDER BY s.user_id, s.completed_at DESC
		) latest ON ws.session_id = latest.session_id
		GROUP BY ws.value_id`, teamUUID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	scores := make(map[string]float64)
	for rows.Next() {
		var vid string
		var avg float64
		if err := rows.Scan(&vid, &avg); err == nil {
			scores[vid] = avg
		}
	}
	if len(scores) == 0 {
		return nil, pgx.ErrNoRows
	}
	return scores, nil
}

func (c *TalentSearchController) parseCustomWVDisplayScores(ctx echo.Context) map[string]float64 {
	scores := make(map[string]float64)
	hasAny := false
	for _, vid := range wvValueIDs {
		param := ctx.QueryParam("wv_" + vid)
		if param != "" {
			v, err := strconv.ParseFloat(param, 64)
			if err == nil {
				scores[vid] = v
				hasAny = true
			}
		}
	}
	if !hasAny {
		return nil
	}
	return scores
}

func (c *TalentSearchController) computeWVScores(ctx context.Context, targetWV map[string]float64) ([]scoredUser, error) {
	rows, err := c.pool.Query(ctx, `
SELECT DISTINCT ON (s.user_id) s.user_id, s.id AS session_id
FROM work_values_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'completed' AND u.is_public = true
ORDER BY s.user_id, s.completed_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type userSession struct {
		userID    string
		sessionID string
	}
	var sessions []userSession
	for rows.Next() {
		var uid, sid pgtype.UUID
		if err := rows.Scan(&uid, &sid); err == nil {
			sessions = append(sessions, userSession{pgUUIDToString(uid), pgUUIDToString(sid)})
		}
	}
	if len(sessions) == 0 {
		return nil, nil
	}

	sessionIDs := make([]pgtype.UUID, len(sessions))
	for i, s := range sessions {
		sessionIDs[i] = pgUUID(s.sessionID)
	}

	scoreRows, err := c.pool.Query(ctx,
		`SELECT session_id, value_id, display_score FROM work_values_scores WHERE session_id = ANY($1)`,
		sessionIDs)
	if err != nil {
		return nil, err
	}
	defer scoreRows.Close()

	sessionScores := make(map[string]map[string]float64)
	for scoreRows.Next() {
		var sid pgtype.UUID
		var vid string
		var ds float64
		if err := scoreRows.Scan(&sid, &vid, &ds); err == nil {
			sidStr := pgUUIDToString(sid)
			if sessionScores[sidStr] == nil {
				sessionScores[sidStr] = make(map[string]float64)
			}
			sessionScores[sidStr][vid] = ds
		}
	}

	var scored []scoredUser
	for _, s := range sessions {
		userScores := sessionScores[s.sessionID]
		if len(userScores) == 0 {
			continue
		}
		sim := gaussianWVSimilarity(userScores, targetWV)
		scored = append(scored, scoredUser{s.userID, sim})
	}
	return scored, nil
}

func (c *TalentSearchController) computeCIScores(ctx context.Context, target [6]float64) ([]scoredUser, error) {
	rows, err := c.pool.Query(ctx, `
SELECT DISTINCT ON (s.user_id) s.user_id, s.id AS session_id
FROM career_interest_sessions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'completed' AND u.is_public = true
ORDER BY s.user_id, s.completed_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type userSession struct {
		userID    string
		sessionID string
	}
	var sessions []userSession
	for rows.Next() {
		var uid, sid pgtype.UUID
		if err := rows.Scan(&uid, &sid); err == nil {
			sessions = append(sessions, userSession{pgUUIDToString(uid), pgUUIDToString(sid)})
		}
	}
	if len(sessions) == 0 {
		return nil, nil
	}

	sessionIDs := make([]pgtype.UUID, len(sessions))
	for i, s := range sessions {
		sessionIDs[i] = pgUUID(s.sessionID)
	}

	scoreRows, err := c.pool.Query(ctx,
		`SELECT session_id, type_id, score FROM career_interest_type_scores WHERE session_id = ANY($1)`,
		sessionIDs)
	if err != nil {
		return nil, err
	}
	defer scoreRows.Close()

	sessionScores := make(map[string][6]float64)
	for scoreRows.Next() {
		var sid pgtype.UUID
		var tid string
		var score float64
		if err := scoreRows.Scan(&sid, &tid, &score); err == nil {
			sidStr := pgUUIDToString(sid)
			scores := sessionScores[sidStr]
			if idx, ok := ciTypeIndex[tid]; ok {
				scores[idx] = score
			}
			sessionScores[sidStr] = scores
		}
	}

	var scored []scoredUser
	for _, s := range sessions {
		userScores, ok := sessionScores[s.sessionID]
		if !ok {
			continue
		}
		sim := gaussianCISimilarity(userScores, target)
		scored = append(scored, scoredUser{s.userID, sim})
	}
	return scored, nil
}
