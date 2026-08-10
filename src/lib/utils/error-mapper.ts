import type { FirebaseError } from "firebase/app";

const NETWORK_ERROR_MESSAGE = "Network error. Please check your connection and try again.";

// Reference to the internal AsyncFunction constructor, obtained once at
// module load. Used to reliably detect async functions without relying
// on constructor.name (which can be mangled by minifiers in production).
const AsyncFunctionConstructor = (async () => {}).constructor;

/**
 * Firebase error codes that indicate a network/connectivity failure
 * rather than a business-logic or permission error.
 */
const NETWORK_ERROR_CODES = new Set([
  "unavailable",
  "deadline-exceeded",
  "aborted",
  "failed-precondition",
  "network-request-failed",
  "internal",
]);

/**
 * Inspects a thrown error and, if it represents a network/connectivity failure,
 * returns a user-friendly message. Returns `null` for non-network errors so
 * callers can keep the original error message (e.g. permission-denied, not-found).
 *
 * Works with both `FirebaseError` (from the Firebase Web SDK) and generic
 * `TypeError`/`DOMException` errors that browsers throw on network failures.
 */
export function friendlyNetworkMessage(error: unknown): string | null {
  // FirebaseError — check the error code
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as FirebaseError).code;
    // Firebase codes are prefixed with "firestore/", "auth/", etc.
    const bareCode = code?.split("/").pop() ?? code;
    if (NETWORK_ERROR_CODES.has(bareCode)) {
      return NETWORK_ERROR_MESSAGE;
    }
    return null;
  }

  // Generic browser network failures (fetch() throws TypeError on network errors)
  if (error instanceof TypeError) {
    return NETWORK_ERROR_MESSAGE;
  }

  // DOMException with network-related names
  if (error instanceof DOMException) {
    if (error.name === "NetworkError" || error.name === "AbortError") {
      return NETWORK_ERROR_MESSAGE;
    }
  }

  return null;
}

/**
 * Wraps an async function so that network-related rejections are replaced
 * with a user-friendly error message. Non-network errors pass through unchanged.
 */
export async function withFriendlyNetworkError<T>(
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const friendly = friendlyNetworkMessage(error);
    if (friendly) throw new Error(friendly);
    throw error;
  }
}

/**
 * Wraps a service object so that async method calls have their
 * network-related rejections replaced with a user-friendly error message.
 * Synchronous methods (e.g. `getCurrentUserId()`, `onAuthStateChanged()`)
 * are passed through unchanged to preserve their return types.
 * Non-network errors pass through unchanged. Uses a JS Proxy so the
 * original object's prototype chain and property descriptors are preserved.
 *
 * Usage:
 * ```ts
 * const groupService = withNetworkErrorMapping(new FirebaseGroupService());
 * ```
 */
export function withNetworkErrorMapping<T extends object>(service: T): T {
  return new Proxy(service, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== "function") return value;

      // Only wrap async functions. Synchronous methods are returned as-is
      // to preserve their return type. This is critical for methods like
      // getCurrentUserId() and onAuthStateChanged() which must return
      // synchronously — wrapping them in async would break callers that
      // use the return value directly (e.g. `if (auth.getCurrentUserId())`).
      //
      // We compare against the AsyncFunction constructor reference directly
      // (not constructor.name) to be safe under production minification,
      // which can mangle function name strings.
      const isAsync = value.constructor === AsyncFunctionConstructor;
      if (!isAsync) return value;

      return async (...args: unknown[]) => {
        try {
          return await value.apply(target, args);
        } catch (error) {
          const friendly = friendlyNetworkMessage(error);
          if (friendly) throw new Error(friendly);
          throw error;
        }
      };
    },
  });
}
