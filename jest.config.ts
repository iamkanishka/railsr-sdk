import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.spec.ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: {
        moduleResolution: "node",
        module: "commonjs",
      },
    }],
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/__tests__/**",
    "!src/index.ts",
  ],
  coverageThreshold: {
    global: { branches: 75, functions: 75, lines: 75, statements: 75 },
  },
};

export default config;
