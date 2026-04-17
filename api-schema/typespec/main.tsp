import "@typespec/http";
import "@typespec/openapi3";
import "./models/common.tsp";
import "./models/user.tsp";
import "./models/experience.tsp";
import "./models/education.tsp";
import "./models/skill.tsp";
import "./routes/users.tsp";
import "./routes/experiences.tsp";
import "./routes/educations.tsp";
import "./routes/skills.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service({
  title: "inselfy API",
})
@server("http://localhost:8081", "Development server")
namespace Inselfy;
