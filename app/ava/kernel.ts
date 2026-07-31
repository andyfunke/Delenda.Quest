/**
 * Compatibility entrypoint. The canonical Ava runtime is the Nexus.
 *
 * Existing adapters may keep their kernel imports while they migrate; both
 * names resolve to the same request/response and authority implementation.
 */
export * from "./nexus";
