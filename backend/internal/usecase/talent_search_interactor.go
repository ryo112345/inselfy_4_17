package usecase

import (
	"context"
	"math"
	"sort"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// TalentSearchInteractor implements port.TalentSearchInputPort.
type TalentSearchInteractor struct {
	query port.TalentSearchQueryService
}

var _ port.TalentSearchInputPort = (*TalentSearchInteractor)(nil)

func NewTalentSearchInteractor(query port.TalentSearchQueryService) *TalentSearchInteractor {
	return &TalentSearchInteractor{query: query}
}

func (i *TalentSearchInteractor) Search(ctx context.Context, f talentsearch.Filter, limit, offset int) ([]talentsearch.Card, int, error) {
	return i.query.SearchCards(ctx, f, limit, offset)
}

type scoredCandidate struct {
	userID string
	sim    float64
}

type integratedCandidate struct {
	userID string
	sim    float64
	wvSim  float64
	ciSim  float64
}

func (i *TalentSearchInteractor) DiagnosticSearch(ctx context.Context, in talentsearch.DiagnosticSearchInput) ([]talentsearch.Card, int, error) {
	filterIDs, noMatch, err := i.filteredUserIDs(ctx, in.Filter)
	if err != nil {
		return nil, 0, err
	}
	if noMatch {
		return []talentsearch.Card{}, 0, nil
	}

	targetWV, err := i.resolveTargetWV(ctx, in)
	if err != nil {
		return nil, 0, err
	}

	userScores, err := i.query.PublicUserWVScores(ctx, filterIDs)
	if err != nil {
		return nil, 0, err
	}
	scored := make([]scoredCandidate, len(userScores))
	for idx, us := range userScores {
		scored[idx] = scoredCandidate{us.UserID, talentsearch.GaussianWVSimilarity(us.Scores, targetWV)}
	}
	sort.Slice(scored, func(a, b int) bool { return scored[a].sim > scored[b].sim })
	total := len(scored)

	page := paginate(scored, in.Offset, in.Limit)
	if len(page) == 0 {
		return []talentsearch.Card{}, total, nil
	}

	cards := i.cardsForScored(ctx, page)
	for idx := range cards {
		wv := *cards[idx].Similarity
		cards[idx].WVSimilarity = &wv
	}

	if len(cards) > 0 {
		var targetCI *[6]float64
		if in.TeamID != "" {
			if ci, err := i.teamAverageCI(ctx, in.CompanyID, in.TeamID); err == nil {
				targetCI = &ci
			}
		} else {
			targetCI = in.CustomCI
		}
		i.fillCISimilarity(ctx, cards, targetCI)
		fillIntegratedSimilarity(cards)
	}
	return cards, total, nil
}

func (i *TalentSearchInteractor) CIDiagnosticSearch(ctx context.Context, in talentsearch.DiagnosticSearchInput) ([]talentsearch.Card, int, error) {
	filterIDs, noMatch, err := i.filteredUserIDs(ctx, in.Filter)
	if err != nil {
		return nil, 0, err
	}
	if noMatch {
		return []talentsearch.Card{}, 0, nil
	}

	targetCI, err := i.resolveTargetCI(ctx, in)
	if err != nil {
		return nil, 0, err
	}

	userScores, err := i.query.PublicUserCIScores(ctx, filterIDs)
	if err != nil {
		return nil, 0, err
	}
	scored := make([]scoredCandidate, len(userScores))
	for idx, us := range userScores {
		scored[idx] = scoredCandidate{us.UserID, talentsearch.GaussianCISimilarity(us.Scores, targetCI)}
	}
	sort.Slice(scored, func(a, b int) bool { return scored[a].sim > scored[b].sim })
	total := len(scored)

	page := paginate(scored, in.Offset, in.Limit)
	if len(page) == 0 {
		return []talentsearch.Card{}, total, nil
	}

	cards := i.cardsForScored(ctx, page)
	for idx := range cards {
		ci := *cards[idx].Similarity
		cards[idx].CISimilarity = &ci
	}

	if len(cards) > 0 {
		var targetWV map[string]float64
		if in.TeamID != "" {
			if wv, err := i.teamAverageWV(ctx, in.CompanyID, in.TeamID); err == nil {
				targetWV = wv
			}
		} else {
			targetWV = in.CustomWV
		}
		i.fillWVSimilarity(ctx, cards, targetWV)
		fillIntegratedSimilarity(cards)
	}
	return cards, total, nil
}

func (i *TalentSearchInteractor) IntegratedDiagnosticSearch(ctx context.Context, in talentsearch.DiagnosticSearchInput) ([]talentsearch.Card, int, error) {
	filterIDs, noMatch, err := i.filteredUserIDs(ctx, in.Filter)
	if err != nil {
		return nil, 0, err
	}
	if noMatch {
		return []talentsearch.Card{}, 0, nil
	}

	var targetWV map[string]float64
	var targetCI [6]float64
	if in.TeamID != "" {
		wv, errWV := i.teamAverageWV(ctx, in.CompanyID, in.TeamID)
		ci, errCI := i.teamAverageCI(ctx, in.CompanyID, in.TeamID)
		switch {
		case errWV != nil && errCI != nil:
			return nil, 0, talentsearch.ErrTeamDiagUnavailable
		case errWV != nil:
			return nil, 0, talentsearch.ErrTeamWVMissing
		case errCI != nil:
			return nil, 0, talentsearch.ErrTeamCIMissing
		}
		targetWV, targetCI = wv, ci
	} else {
		if in.CustomWV == nil || in.CustomCI == nil {
			return nil, 0, talentsearch.ErrBothWeightsRequired
		}
		targetWV, targetCI = in.CustomWV, *in.CustomCI
	}

	wvUsers, err := i.query.PublicUserWVScores(ctx, filterIDs)
	if err != nil {
		return nil, 0, err
	}
	ciUsers, err := i.query.PublicUserCIScores(ctx, filterIDs)
	if err != nil {
		return nil, 0, err
	}

	ciSimByUser := make(map[string]float64, len(ciUsers))
	for _, us := range ciUsers {
		ciSimByUser[us.UserID] = talentsearch.GaussianCISimilarity(us.Scores, targetCI)
	}

	// Only users with both diagnostics completed are ranked.
	var scored []integratedCandidate
	for _, us := range wvUsers {
		ciSim, ok := ciSimByUser[us.UserID]
		if !ok {
			continue
		}
		wvSim := talentsearch.GaussianWVSimilarity(us.Scores, targetWV)
		overall := math.Round((wvSim+ciSim)/2.0*10) / 10
		scored = append(scored, integratedCandidate{us.UserID, overall, wvSim, ciSim})
	}
	sort.Slice(scored, func(a, b int) bool { return scored[a].sim > scored[b].sim })
	total := len(scored)

	page := paginate(scored, in.Offset, in.Limit)
	if len(page) == 0 {
		return []talentsearch.Card{}, total, nil
	}

	byUser := make(map[string]integratedCandidate, len(page))
	basic := make([]scoredCandidate, len(page))
	for idx, s := range page {
		byUser[s.userID] = s
		basic[idx] = scoredCandidate{s.userID, s.sim}
	}
	cards := i.cardsForScored(ctx, basic)
	for idx := range cards {
		s := byUser[cards[idx].UserID]
		wv := math.Round(s.wvSim*10) / 10
		ci := math.Round(s.ciSim*10) / 10
		cards[idx].WVSimilarity = &wv
		cards[idx].CISimilarity = &ci
		cards[idx].IntSimilarity = cards[idx].Similarity
	}
	return cards, total, nil
}

// filteredUserIDs resolves the condition filter. noMatch means the filter is
// active but matched nobody, so the caller returns an empty result up front.
func (i *TalentSearchInteractor) filteredUserIDs(ctx context.Context, f talentsearch.Filter) (ids []string, noMatch bool, err error) {
	if f.IsEmpty() {
		return nil, false, nil
	}
	ids, err = i.query.FilteredUserIDs(ctx, f)
	if err != nil {
		return nil, false, err
	}
	if len(ids) == 0 {
		return nil, true, nil
	}
	return ids, false, nil
}

func (i *TalentSearchInteractor) resolveTargetWV(ctx context.Context, in talentsearch.DiagnosticSearchInput) (map[string]float64, error) {
	if in.TeamID != "" {
		wv, err := i.teamAverageWV(ctx, in.CompanyID, in.TeamID)
		if err != nil {
			return nil, talentsearch.ErrTeamWVUnavailable
		}
		return wv, nil
	}
	if in.CustomWV == nil {
		return nil, talentsearch.ErrWVWeightsRequired
	}
	return in.CustomWV, nil
}

func (i *TalentSearchInteractor) resolveTargetCI(ctx context.Context, in talentsearch.DiagnosticSearchInput) ([6]float64, error) {
	if in.TeamID != "" {
		ci, err := i.teamAverageCI(ctx, in.CompanyID, in.TeamID)
		if err != nil {
			return [6]float64{}, talentsearch.ErrTeamCIUnavailable
		}
		return ci, nil
	}
	if in.CustomCI == nil {
		return [6]float64{}, talentsearch.ErrCIWeightsRequired
	}
	return *in.CustomCI, nil
}

// teamAverageWV returns the team's average WV display scores after checking
// the team belongs to companyID.
func (i *TalentSearchInteractor) teamAverageWV(ctx context.Context, companyID, teamID string) (map[string]float64, error) {
	if err := i.checkTeamOwnership(ctx, companyID, teamID); err != nil {
		return nil, err
	}
	return i.query.TeamAverageWVDisplayScores(ctx, teamID)
}

func (i *TalentSearchInteractor) teamAverageCI(ctx context.Context, companyID, teamID string) ([6]float64, error) {
	if err := i.checkTeamOwnership(ctx, companyID, teamID); err != nil {
		return [6]float64{}, err
	}
	return i.query.TeamAverageCIScores(ctx, teamID)
}

func (i *TalentSearchInteractor) checkTeamOwnership(ctx context.Context, companyID, teamID string) error {
	owner, err := i.query.TeamCompanyID(ctx, teamID)
	if err != nil {
		return err
	}
	if owner != companyID {
		return domainerr.ErrNotFound
	}
	return nil
}

// cardsForScored fetches enriched cards for the scored page and attaches the
// primary similarity. A failed fetch degrades to an empty page instead of an
// error (historical behavior).
func (i *TalentSearchInteractor) cardsForScored(ctx context.Context, page []scoredCandidate) []talentsearch.Card {
	ids := make([]string, len(page))
	simByUser := make(map[string]float64, len(page))
	for idx, s := range page {
		ids[idx] = s.userID
		simByUser[s.userID] = s.sim
	}
	cards, err := i.query.CardsByUserIDs(ctx, ids)
	if err != nil {
		return nil
	}
	for idx := range cards {
		sim := simByUser[cards[idx].UserID]
		cards[idx].Similarity = &sim
	}
	return cards
}

// fillWVSimilarity computes WV similarity against targetWV for cards that
// don't have one yet. Lookup failures degrade silently (historical behavior).
func (i *TalentSearchInteractor) fillWVSimilarity(ctx context.Context, cards []talentsearch.Card, targetWV map[string]float64) {
	if targetWV == nil {
		return
	}
	scores, err := i.query.WVScoresByUserIDs(ctx, cardUserIDs(cards))
	if err != nil {
		return
	}
	for idx := range cards {
		if cards[idx].WVSimilarity != nil {
			continue
		}
		if userScores, ok := scores[cards[idx].UserID]; ok {
			sim := talentsearch.GaussianWVSimilarity(userScores, targetWV)
			cards[idx].WVSimilarity = &sim
		}
	}
}

func (i *TalentSearchInteractor) fillCISimilarity(ctx context.Context, cards []talentsearch.Card, targetCI *[6]float64) {
	if targetCI == nil {
		return
	}
	scores, err := i.query.CIScoresByUserIDs(ctx, cardUserIDs(cards))
	if err != nil {
		return
	}
	for idx := range cards {
		if cards[idx].CISimilarity != nil {
			continue
		}
		if userScores, ok := scores[cards[idx].UserID]; ok {
			sim := talentsearch.GaussianCISimilarity(userScores, *targetCI)
			cards[idx].CISimilarity = &sim
		}
	}
}

// fillIntegratedSimilarity averages WV and CI similarity where both exist.
func fillIntegratedSimilarity(cards []talentsearch.Card) {
	for idx := range cards {
		if cards[idx].WVSimilarity != nil && cards[idx].CISimilarity != nil && cards[idx].IntSimilarity == nil {
			avg := (*cards[idx].WVSimilarity + *cards[idx].CISimilarity) / 2.0
			rounded := math.Round(avg*10) / 10
			cards[idx].IntSimilarity = &rounded
		}
	}
}

func cardUserIDs(cards []talentsearch.Card) []string {
	ids := make([]string, len(cards))
	for idx, card := range cards {
		ids[idx] = card.UserID
	}
	return ids
}

func paginate[T any](s []T, offset, limit int) []T {
	if offset >= len(s) {
		return nil
	}
	end := offset + limit
	if end > len(s) {
		end = len(s)
	}
	return s[offset:end]
}
