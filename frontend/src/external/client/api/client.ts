import { client } from "./generated/client.gen";

const baseUrl =
  typeof window === "undefined"
    ? process.env.INTERNAL_API_URL ?? "http://localhost:8080"
    : "";

client.setConfig({ baseUrl });

export { client };
