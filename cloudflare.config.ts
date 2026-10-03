import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "an-visuals",
    compatibilityDate: "2026-10-01",
    domains: ["an-visuals.cinne.dev"],
  }
});
