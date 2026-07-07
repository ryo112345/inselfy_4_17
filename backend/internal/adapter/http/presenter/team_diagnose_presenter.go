package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

// DiagnoseInfoResponse builds the team-diagnose info API response.
func DiagnoseInfoResponse(info *company.TeamDiagnoseInfo) *openapi.ModelsDiagnoseInfoResponse {
	return &openapi.ModelsDiagnoseInfoResponse{
		MemberId:    info.MemberID,
		MemberName:  info.MemberName,
		TeamName:    info.TeamName,
		CompanyName: info.CompanyName,
		UserId:      info.UserID,
		WvStatus:    openapi.ModelsTeamDiagnosisStatus(info.WVStatus),
		CiStatus:    openapi.ModelsTeamDiagnosisStatus(info.CIStatus),
		Email:       info.Email,
	}
}
