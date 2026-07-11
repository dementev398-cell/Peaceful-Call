export * from "./generated/api";
export * from "./generated/types";

// A handful of Orval-generated parameter type names in "./generated/types"
// collide with same-named Zod schemas from "./generated/api" (both wildcard
// re-exports above), which TypeScript treats as an ambiguous re-export error.
// Explicit named re-exports below win over the ambiguous wildcard exports and
// resolve the collision; the Zod schema from "./generated/api" is the one
// actually used for request validation, so it takes precedence here.
export { DeleteChatMessageParams } from "./generated/api";
export type {
  ListHadithsParams,
  ListChatUsersParams,
} from "./generated/types";
export * from './generated/api';
export * from './generated/types';
