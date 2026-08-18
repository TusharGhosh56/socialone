// Contact form field caps. These mirror the constants in
// Lambda/backend/lambda/handler.py — keep the two in sync. The Lambda
// re-validates everything regardless; enforcing here only spares the user a
// round trip and a rejection they could have seen while typing.
export const FIELD_LIMITS = {
  name: 120,
  email: 254,
  organisation: 160,
  lookingFor: 160,
  message: 5000,
} as const;

export type ContactField = keyof typeof FIELD_LIMITS;

// Human labels, used in validation messages and to match the Lambda's own
// wording so client- and server-side rejections read identically.
export const FIELD_LABELS: Record<ContactField, string> = {
  name: 'Name',
  email: 'Email',
  organisation: 'Organisation',
  lookingFor: 'What are you looking for',
  message: 'Message',
};

// MAX_REQUEST_BYTES in handler.py. Measured on the encoded JSON body, which
// is why a message well under the character limit can still be too large:
// non-Latin scripts run 3 bytes per character and emoji 4.
export const MAX_PAYLOAD_BYTES = 65_536;

// Below this many characters remaining, the message counter starts showing.
export const COUNTER_VISIBLE_FROM = 4500;
