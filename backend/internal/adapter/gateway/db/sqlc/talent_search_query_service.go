package sqlc

import (
	"context"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TalentSearchQueryService struct {
	pool *pgxpool.Pool
}

var _ port.TalentSearchQueryService = (*TalentSearchQueryService)(nil)

func NewTalentSearchQueryService(pool *pgxpool.Pool) *TalentSearchQueryService {
	return &TalentSearchQueryService{pool: pool}
}

// talentFilterConditions renders f as an `AND ...` SQL tail against users u,
// numbering placeholders from startIdx, and returns the tail, its args and
// the next free placeholder index.
func talentFilterConditions(f talentsearch.Filter, startIdx int) (string, []any, int) {
	var sb strings.Builder
	var args []any
	idx := startIdx

	if f.Keyword != "" {
		sb.WriteString(` AND (u.name ILIKE $` + strconv.Itoa(idx) +
			` OR u.headline ILIKE $` + strconv.Itoa(idx) +
			` OR u.about ILIKE $` + strconv.Itoa(idx) + `)`)
		args = append(args, "%"+f.Keyword+"%")
		idx++
	}
	if f.Location != "" {
		sb.WriteString(` AND u.location = $` + strconv.Itoa(idx))
		args = append(args, f.Location)
		idx++
	}
	if f.Industry != "" {
		sb.WriteString(` AND u.industry = $` + strconv.Itoa(idx))
		args = append(args, f.Industry)
		idx++
	}
	if f.JobSeekingStatus != "" {
		sb.WriteString(` AND u.job_seeking_status = $` + strconv.Itoa(idx))
		args = append(args, f.JobSeekingStatus)
		idx++
	}
	if f.JobType != "" {
		sb.WriteString(` AND u.job_type = $` + strconv.Itoa(idx))
		args = append(args, f.JobType)
		idx++
	}
	if f.DiagnosedOnly {
		sb.WriteString(` AND (
			u.id IN (SELECT user_id FROM work_values_sessions WHERE status = 'completed')
			OR u.id IN (SELECT user_id FROM career_interest_sessions WHERE status = 'completed')
		)`)
	}
	if len(f.Skills) > 0 {
		sb.WriteString(` AND u.id IN (
			SELECT us.user_id FROM user_skills us
			JOIN skills s ON s.id = us.skill_id
			WHERE s.name = ANY($` + strconv.Itoa(idx) + `)
			GROUP BY us.user_id
			HAVING COUNT(DISTINCT s.name) = $` + strconv.Itoa(idx+1) + `)`)
		args = append(args, f.Skills, len(f.Skills))
		idx += 2
	}
	return sb.String(), args, idx
}

func scanTalentCard(rows interface {
	Scan(dest ...any) error
},
) (talentsearch.Card, error) {
	var uid pgtype.UUID
	var username, name string
	var headline, avatarURL, profileColor, seekingStatus pgtype.Text

	if err := rows.Scan(&uid, &username, &name, &headline, &avatarURL, &profileColor, &seekingStatus); err != nil {
		return talentsearch.Card{}, err
	}
	card := talentsearch.Card{
		UserID:   uuidToString(uid),
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
	return card, nil
}

func (s *TalentSearchQueryService) SearchCards(ctx context.Context, f talentsearch.Filter, limit, offset int) ([]talentsearch.Card, int, error) {
	cond, args, idx := talentFilterConditions(f, 1)

	var total int
	if err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM users u WHERE u.is_public = true`+cond, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	query := `
		SELECT u.id, u.username, u.name, u.headline, u.avatar_url, u.profile_color, u.job_seeking_status
		FROM users u
		WHERE u.is_public = true` + cond +
		` ORDER BY u.created_at DESC LIMIT $` + strconv.Itoa(idx) + ` OFFSET $` + strconv.Itoa(idx+1)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var cards []talentsearch.Card
	for rows.Next() {
		card, err := scanTalentCard(rows)
		if err != nil {
			continue
		}
		cards = append(cards, card)
	}

	if len(cards) > 0 {
		enrichTalentCards(ctx, s.pool, cards)
	}
	return cards, total, nil
}

func (s *TalentSearchQueryService) FilteredUserIDs(ctx context.Context, f talentsearch.Filter) ([]string, error) {
	cond, args, _ := talentFilterConditions(f, 1)
	rows, err := s.pool.Query(ctx, `SELECT u.id FROM users u WHERE u.is_public = true`+cond, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []string
	for rows.Next() {
		var uid pgtype.UUID
		if err := rows.Scan(&uid); err == nil {
			ids = append(ids, uuidToString(uid))
		}
	}
	return ids, nil
}

func (s *TalentSearchQueryService) TeamCompanyID(ctx context.Context, teamID string) (string, error) {
	var ownerID pgtype.UUID
	if err := s.pool.QueryRow(ctx,
		`SELECT company_id FROM teams WHERE id = $1`, lenientUUID(teamID)).Scan(&ownerID); err != nil {
		return "", err
	}
	return uuidToString(ownerID), nil
}

func (s *TalentSearchQueryService) TeamAverageWVDisplayScores(ctx context.Context, teamID string) (map[string]float64, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ws.value_id, AVG(ws.display_score) AS avg_score
		FROM work_values_scores ws
		JOIN (
			SELECT DISTINCT ON (s.user_id) s.id AS session_id
			FROM work_values_sessions s
			JOIN team_members tm ON tm.user_id = s.user_id
			WHERE tm.team_id = $1 AND tm.wv_status = 'completed' AND s.status = 'completed'
			ORDER BY s.user_id, s.completed_at DESC
		) latest ON ws.session_id = latest.session_id
		GROUP BY ws.value_id`, lenientUUID(teamID))
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
		return nil, domainerr.ErrNotFound
	}
	return scores, nil
}

func (s *TalentSearchQueryService) TeamAverageCIScores(ctx context.Context, teamID string) ([6]float64, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ts.type_id, AVG(ts.score) AS avg_score
		FROM career_interest_type_scores ts
		JOIN (
			SELECT DISTINCT ON (s.user_id) s.id AS session_id
			FROM career_interest_sessions s
			JOIN team_members tm ON tm.user_id = s.user_id
			WHERE tm.team_id = $1 AND tm.ci_status = 'completed' AND s.status = 'completed'
			ORDER BY s.user_id, s.completed_at DESC
		) latest ON ts.session_id = latest.session_id
		GROUP BY ts.type_id`, lenientUUID(teamID))
	if err != nil {
		return [6]float64{}, err
	}
	defer rows.Close()

	var scores [6]float64
	count := 0
	for rows.Next() {
		var typeID string
		var avgScore float64
		if err := rows.Scan(&typeID, &avgScore); err == nil {
			if idx, ok := talentsearch.CITypeIndex[typeID]; ok {
				scores[idx] = avgScore
				count++
			}
		}
	}
	if count == 0 {
		return [6]float64{}, domainerr.ErrNotFound
	}
	return scores, nil
}

// latestSessions maps public users' latest completed sessions for the given
// table, optionally restricted to filterUserIDs (nil = no restriction).
func (s *TalentSearchQueryService) latestSessions(ctx context.Context, table string, filterUserIDs []string) (userIDs, sessionIDs []string, err error) {
	query := `
SELECT DISTINCT ON (s.user_id) s.user_id, s.id AS session_id
FROM ` + table + ` s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'completed' AND u.is_public = true`
	var args []any
	if filterUserIDs != nil {
		query += ` AND s.user_id = ANY($1)`
		args = append(args, lenientUUIDs(filterUserIDs))
	}
	query += `
ORDER BY s.user_id, s.completed_at DESC`
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var uid, sid pgtype.UUID
		if err := rows.Scan(&uid, &sid); err == nil {
			userIDs = append(userIDs, uuidToString(uid))
			sessionIDs = append(sessionIDs, uuidToString(sid))
		}
	}
	return userIDs, sessionIDs, nil
}

func (s *TalentSearchQueryService) wvScoresBySession(ctx context.Context, sessionIDs []string) (map[string]map[string]float64, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT session_id, value_id, display_score FROM work_values_scores WHERE session_id = ANY($1)`,
		lenientUUIDs(sessionIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessionScores := make(map[string]map[string]float64)
	for rows.Next() {
		var sid pgtype.UUID
		var vid string
		var ds float64
		if err := rows.Scan(&sid, &vid, &ds); err == nil {
			sidStr := uuidToString(sid)
			if sessionScores[sidStr] == nil {
				sessionScores[sidStr] = make(map[string]float64)
			}
			sessionScores[sidStr][vid] = ds
		}
	}
	return sessionScores, nil
}

func (s *TalentSearchQueryService) ciScoresBySession(ctx context.Context, sessionIDs []string) (map[string][6]float64, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT session_id, type_id, score FROM career_interest_type_scores WHERE session_id = ANY($1)`,
		lenientUUIDs(sessionIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	sessionScores := make(map[string][6]float64)
	for rows.Next() {
		var sid pgtype.UUID
		var tid string
		var score float64
		if err := rows.Scan(&sid, &tid, &score); err == nil {
			sidStr := uuidToString(sid)
			scores := sessionScores[sidStr]
			if idx, ok := talentsearch.CITypeIndex[tid]; ok {
				scores[idx] = score
			}
			sessionScores[sidStr] = scores
		}
	}
	return sessionScores, nil
}

func (s *TalentSearchQueryService) PublicUserWVScores(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserWVScores, error) {
	userIDs, sessionIDs, err := s.latestSessions(ctx, "work_values_sessions", filterUserIDs)
	if err != nil {
		return nil, err
	}
	if len(userIDs) == 0 {
		return nil, nil
	}

	sessionScores, err := s.wvScoresBySession(ctx, sessionIDs)
	if err != nil {
		return nil, err
	}

	var result []talentsearch.UserWVScores
	for i, uid := range userIDs {
		scores := sessionScores[sessionIDs[i]]
		if len(scores) == 0 {
			continue
		}
		result = append(result, talentsearch.UserWVScores{UserID: uid, Scores: scores})
	}
	return result, nil
}

func (s *TalentSearchQueryService) PublicUserCIScores(ctx context.Context, filterUserIDs []string) ([]talentsearch.UserCIScores, error) {
	userIDs, sessionIDs, err := s.latestSessions(ctx, "career_interest_sessions", filterUserIDs)
	if err != nil {
		return nil, err
	}
	if len(userIDs) == 0 {
		return nil, nil
	}

	sessionScores, err := s.ciScoresBySession(ctx, sessionIDs)
	if err != nil {
		return nil, err
	}

	var result []talentsearch.UserCIScores
	for i, uid := range userIDs {
		scores, ok := sessionScores[sessionIDs[i]]
		if !ok {
			continue
		}
		result = append(result, talentsearch.UserCIScores{UserID: uid, Scores: scores})
	}
	return result, nil
}

func (s *TalentSearchQueryService) CardsByUserIDs(ctx context.Context, userIDs []string) ([]talentsearch.Card, error) {
	if len(userIDs) == 0 {
		return nil, nil
	}
	rows, err := s.pool.Query(ctx,
		`SELECT id, username, name, headline, avatar_url, profile_color, job_seeking_status
		 FROM users WHERE id = ANY($1) AND is_public = true`, lenientUUIDs(userIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	cardMap := make(map[string]talentsearch.Card, len(userIDs))
	for rows.Next() {
		card, err := scanTalentCard(rows)
		if err != nil {
			continue
		}
		cardMap[card.UserID] = card
	}

	cards := make([]talentsearch.Card, 0, len(userIDs))
	for _, uid := range userIDs {
		if card, ok := cardMap[uid]; ok {
			cards = append(cards, card)
		}
	}
	if len(cards) > 0 {
		enrichTalentCards(ctx, s.pool, cards)
	}
	return cards, nil
}

func (s *TalentSearchQueryService) WVScoresByUserIDs(ctx context.Context, userIDs []string) (map[string]map[string]float64, error) {
	userBySession, sessionIDs, err := s.latestSessionsByUser(ctx, "work_values_sessions", userIDs)
	if err != nil {
		return nil, err
	}
	if len(sessionIDs) == 0 {
		return map[string]map[string]float64{}, nil
	}

	sessionScores, err := s.wvScoresBySession(ctx, sessionIDs)
	if err != nil {
		return nil, err
	}

	result := make(map[string]map[string]float64, len(sessionScores))
	for sid, scores := range sessionScores {
		result[userBySession[sid]] = scores
	}
	return result, nil
}

func (s *TalentSearchQueryService) CIScoresByUserIDs(ctx context.Context, userIDs []string) (map[string][6]float64, error) {
	userBySession, sessionIDs, err := s.latestSessionsByUser(ctx, "career_interest_sessions", userIDs)
	if err != nil {
		return nil, err
	}
	if len(sessionIDs) == 0 {
		return map[string][6]float64{}, nil
	}

	sessionScores, err := s.ciScoresBySession(ctx, sessionIDs)
	if err != nil {
		return nil, err
	}

	result := make(map[string][6]float64, len(sessionScores))
	for sid, scores := range sessionScores {
		result[userBySession[sid]] = scores
	}
	return result, nil
}

// latestSessionsByUser maps the latest completed session per given user
// (no is_public join: callers already hold listed cards).
func (s *TalentSearchQueryService) latestSessionsByUser(ctx context.Context, table string, userIDs []string) (userBySession map[string]string, sessionIDs []string, err error) {
	rows, err := s.pool.Query(ctx, `
SELECT DISTINCT ON (s.user_id) s.user_id, s.id
FROM `+table+` s
WHERE s.user_id = ANY($1) AND s.status = 'completed'
ORDER BY s.user_id, s.completed_at DESC`, lenientUUIDs(userIDs))
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	userBySession = make(map[string]string)
	for rows.Next() {
		var uid, sid pgtype.UUID
		if rows.Scan(&uid, &sid) == nil {
			sidStr := uuidToString(sid)
			userBySession[sidStr] = uuidToString(uid)
			sessionIDs = append(sessionIDs, sidStr)
		}
	}
	return userBySession, sessionIDs, nil
}
