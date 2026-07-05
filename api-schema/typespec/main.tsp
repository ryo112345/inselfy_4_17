import "@typespec/http";
import "@typespec/openapi3";
import "./models/common.tsp";
import "./models/user.tsp";
import "./models/experience.tsp";
import "./models/education.tsp";
import "./models/skill.tsp";
import "./models/scout-settings.tsp";
import "./models/similar-users.tsp";
import "./models/team-diagnose.tsp";
import "./routes/users.tsp";
import "./routes/experiences.tsp";
import "./routes/educations.tsp";
import "./routes/skills.tsp";
import "./routes/scout-settings.tsp";
import "./routes/similar-users.tsp";
import "./routes/team-diagnose.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service({
  title: "inselfy API",
})
@server("http://localhost:8081", "Development server")
namespace Inselfy;
