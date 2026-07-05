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
import "./models/scout-template.tsp";
import "./models/notification.tsp";
import "./models/follow.tsp";
import "./models/auth.tsp";
import "./models/company-auth.tsp";
import "./models/career-interest.tsp";
import "./models/work-values.tsp";
import "./models/post.tsp";
import "./models/scout.tsp";
import "./models/candidate-scout.tsp";
import "./models/job-application.tsp";
import "./models/messaging.tsp";
import "./models/article.tsp";
import "./routes/users.tsp";
import "./routes/experiences.tsp";
import "./routes/educations.tsp";
import "./routes/skills.tsp";
import "./routes/scout-settings.tsp";
import "./routes/similar-users.tsp";
import "./routes/team-diagnose.tsp";
import "./routes/scout-templates.tsp";
import "./routes/notifications.tsp";
import "./routes/follows.tsp";
import "./routes/auth.tsp";
import "./routes/company-auth.tsp";
import "./routes/career-interest.tsp";
import "./routes/work-values.tsp";
import "./routes/posts.tsp";
import "./routes/scouts.tsp";
import "./routes/candidate-scouts.tsp";
import "./routes/job-applications.tsp";
import "./routes/messaging.tsp";
import "./routes/articles.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service({
  title: "inselfy API",
})
@server("http://localhost:8081", "Development server")
namespace Inselfy;
