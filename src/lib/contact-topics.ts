/**
 * Shared between the form and the endpoint that validates it.
 *
 * A route file can only export route handlers, so this can't live there — and
 * duplicating the list is how the two halves drift until a legitimate topic
 * starts being silently rewritten to "Something else".
 */
export const CONTACT_TOPICS = [
  "Order or delivery question",
  "Return or refund",
  "Custom printing quote",
  "Wholesale or bulk pricing",
  "Something else",
] as const;

export type ContactTopic = (typeof CONTACT_TOPICS)[number];
