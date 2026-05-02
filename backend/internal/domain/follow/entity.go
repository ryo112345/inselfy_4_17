package follow

import "time"

type Follow struct {
	FollowerID  string
	FollowingID string
	CreatedAt   time.Time
}

type FollowWithUser struct {
	UserID    string
	Username  string
	Name      string
	AvatarURL *string
	Headline  *string
	CreatedAt time.Time
}

type FollowStatus struct {
	Following  bool `json:"following"`
	FollowedBy bool `json:"followedBy"`
}

type FollowCounts struct {
	FollowersCount int `json:"followersCount"`
	FollowingCount int `json:"followingCount"`
}
