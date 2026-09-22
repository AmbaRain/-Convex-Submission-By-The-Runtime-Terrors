/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as alerts from "../alerts.js";
import type * as applications from "../applications.js";
import type * as deadlineReminders from "../deadlineReminders.js";
import type * as firecrawl from "../firecrawl.js";
import type * as init from "../init.js";
import type * as integrations_agentmail from "../integrations/agentmail.js";
import type * as integrations_firecrawl from "../integrations/firecrawl.js";
import type * as integrations_openai from "../integrations/openai.js";
import type * as matches from "../matches.js";
import type * as opportunities from "../opportunities.js";
import type * as savedOpportunities from "../savedOpportunities.js";
import type * as searchHistory from "../searchHistory.js";
import type * as types from "../types.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  alerts: typeof alerts;
  applications: typeof applications;
  deadlineReminders: typeof deadlineReminders;
  firecrawl: typeof firecrawl;
  init: typeof init;
  "integrations/agentmail": typeof integrations_agentmail;
  "integrations/firecrawl": typeof integrations_firecrawl;
  "integrations/openai": typeof integrations_openai;
  matches: typeof matches;
  opportunities: typeof opportunities;
  savedOpportunities: typeof savedOpportunities;
  searchHistory: typeof searchHistory;
  types: typeof types;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  staticHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"staticHosting">;
};
