package sqlc

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

// lenientUUID mirrors the historical controller behavior: an unparsable id
// becomes an invalid (NULL) pgtype.UUID instead of an error, so queries
// simply match nothing / fail at the DB layer.
func lenientUUID(id string) pgtype.UUID {
	parsed, err := uuid.Parse(id)
	if err != nil {
		return pgtype.UUID{}
	}
	return pgtype.UUID{Bytes: parsed, Valid: true}
}

func lenientUUIDs(ids []string) []pgtype.UUID {
	result := make([]pgtype.UUID, len(ids))
	for i, id := range ids {
		result[i] = lenientUUID(id)
	}
	return result
}

// enrichTalentCards fills skills, recent experiences and top WV/CI labels
// for each card. Enrichment errors are swallowed: a card without extras is
// better than a failed listing.
func enrichTalentCards(ctx context.Context, pool *pgxpool.Pool, cards []talentsearch.Card) {
	uids := make([]pgtype.UUID, len(cards))
	uidMap := make(map[string]int, len(cards))
	for i, card := range cards {
		uids[i] = lenientUUID(card.UserID)
		uidMap[card.UserID] = i
	}

	expRows, err := pool.Query(ctx,
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
				id := uuidToString(uid)
				if idx, ok := uidMap[id]; ok {
					cards[idx].Experiences = append(cards[idx].Experiences, talentsearch.Experience{
						CompanyName: companyName,
						Title:       title,
					})
				}
			}
		}
		expRows.Close()
	}

	skillRows, err := pool.Query(ctx,
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
				id := uuidToString(uid)
				if idx, ok := uidMap[id]; ok {
					cards[idx].Skills = append(cards[idx].Skills, skillName)
				}
			}
		}
		skillRows.Close()
	}

	wvRows, err := pool.Query(ctx,
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
					id := uuidToString(uid)
					if idx, ok := uidMap[id]; ok {
						top3 := workvalues.TopNeedIDs(mu, 3)
						cards[idx].TopWVLabels = workvalues.NeedLabels(top3)
					}
				}
			}
		}
		wvRows.Close()
	}

	ciRows, err := pool.Query(ctx,
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
		for ciRows.Next() {
			var uid pgtype.UUID
			var typeID string
			var rank int
			if err := ciRows.Scan(&uid, &typeID, &rank); err == nil {
				id := uuidToString(uid)
				if idx, ok := uidMap[id]; ok {
					if label, ok := careerinterest.TypeLabels[typeID]; ok {
						cards[idx].TopCILabels = append(cards[idx].TopCILabels, label)
					}
				}
			}
		}
		ciRows.Close()
	}

	for i := range cards {
		if cards[i].Experiences == nil {
			cards[i].Experiences = []talentsearch.Experience{}
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
