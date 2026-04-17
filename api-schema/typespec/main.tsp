import "@typespec/http";
import "@typespec/openapi3";
import "./models/common.tsp";
import "./models/user.tsp";
import "./routes/users.tsp";

using TypeSpec.Http;
using TypeSpec.OpenAPI;

@service({
  title: "inselfy API",
})
@server("http://localhost:8081", "Development server")
namespace Inselfy;
