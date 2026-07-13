package presenter

import (
	"github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/search"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
)

// SearchAllResponse builds the blended cross-content search response.
func SearchAllResponse(r *search.Result) *openapi.ModelsSearchAllResponse {
	return &openapi.ModelsSearchAllResponse{
		Users:    *SearchUserListResponse(r.Users),
		Articles: *SearchArticleListResponse(r.Articles),
		Posts:    *SearchPostListResponse(r.Posts),
		Jobs:     *SearchJobListResponse(r.Jobs),
	}
}

func SearchUserListResponse(p search.Page[search.UserHit]) *openapi.ModelsSearchUserListResponse {
	items := make([]openapi.ModelsSearchUserItem, len(p.Items))
	for i, u := range p.Items {
		items[i] = openapi.ModelsSearchUserItem{
			Id:           u.ID,
			Username:     u.Username,
			Name:         u.Name,
			Headline:     u.Headline,
			AvatarUrl:    u.AvatarURL,
			ProfileColor: u.ProfileColor,
		}
	}
	return &openapi.ModelsSearchUserListResponse{Items: items, Total: cast.Int32(p.Total)}
}

func SearchArticleListResponse(p search.Page[search.ArticleHit]) *openapi.ModelsSearchArticleListResponse {
	items := make([]openapi.ModelsSearchArticleItem, len(p.Items))
	for i, a := range p.Items {
		items[i] = openapi.ModelsSearchArticleItem{
			Id:          a.ID,
			Title:       a.Title,
			Excerpt:     a.Excerpt,
			AuthorName:  a.AuthorName,
			Tags:        emptySliceIfNil(a.Tags),
			IsPaid:      a.IsPaid,
			PublishedAt: a.PublishedAt,
		}
	}
	return &openapi.ModelsSearchArticleListResponse{Items: items, Total: cast.Int32(p.Total)}
}

func SearchPostListResponse(p search.Page[search.PostHit]) *openapi.ModelsSearchPostListResponse {
	items := make([]openapi.ModelsSearchPostItem, len(p.Items))
	for i, po := range p.Items {
		items[i] = openapi.ModelsSearchPostItem{
			Id:        po.ID,
			UserId:    po.UserID,
			Username:  po.Username,
			Name:      po.Name,
			Content:   po.Content,
			CreatedAt: po.CreatedAt,
		}
	}
	return &openapi.ModelsSearchPostListResponse{Items: items, Total: cast.Int32(p.Total)}
}

func SearchJobListResponse(p search.Page[search.JobHit]) *openapi.ModelsSearchJobListResponse {
	items := make([]openapi.ModelsSearchJobItem, len(p.Items))
	for i, j := range p.Items {
		items[i] = openapi.ModelsSearchJobItem{
			Id:             j.ID,
			Title:          j.Title,
			CompanyName:    j.CompanyName,
			CompanyLogoUrl: j.CompanyLogoURL,
			EmploymentType: j.EmploymentType,
			Location:       j.Location,
			CreatedAt:      j.CreatedAt,
		}
	}
	return &openapi.ModelsSearchJobListResponse{Items: items, Total: cast.Int32(p.Total)}
}
