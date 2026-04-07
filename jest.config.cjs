/** @type {import('jest').Config} */
module.exports = {
  roots: ["<rootDir>/packages"],
  testMatch: ["**/tests/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.base.json" }]
  },
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverage: false
};
