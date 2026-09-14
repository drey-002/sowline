import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Lets tests import with the same "@/lib/..." aliases the app uses.
    tsconfigPaths: true,
  },
  test: {
    // Everything under test is pure logic, so no DOM is needed.
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
