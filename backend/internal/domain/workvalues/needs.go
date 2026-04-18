package workvalues

const N = 21

var NeedIDs = [N]string{
	"ability_utilization",
	"achievement",
	"activity",
	"advancement",
	"authority",
	"autonomy",
	"company_policies",
	"compensation",
	"co_workers",
	"creativity",
	"independence",
	"moral_values",
	"recognition",
	"responsibility",
	"security",
	"social_service",
	"social_status",
	"supervision_hr",
	"supervision_technical",
	"variety",
	"working_conditions",
}

var needIndex map[string]int

func init() {
	needIndex = make(map[string]int, N)
	for i, id := range NeedIDs {
		needIndex[id] = i
	}
}

func NeedIndex(id string) (int, bool) {
	i, ok := needIndex[id]
	return i, ok
}
