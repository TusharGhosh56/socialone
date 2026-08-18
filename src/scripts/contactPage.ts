// Get in Touch page (contact.astro) — two independent behaviours:
//  1. Office pill switcher: clicking an office swaps the address text + the
//     key-free Google Maps embed (https://www.google.com/maps?q=...&output=embed)
//     without a page reload. A no-op if there's only one office (no pills render).
//  2. Contact form: posts the full payload as JSON to the APLYD notification
//     Lambda (API Gateway → aplyd-notify-prod). The endpoint comes from
//     PUBLIC_CONTACT_API_URL — a public HTTPS URL, no credential; SES config
//     and the SMTP secret never leave AWS.
import {
  COUNTER_VISIBLE_FROM,
  FIELD_LABELS,
  FIELD_LIMITS,
  MAX_PAYLOAD_BYTES,
  type ContactField,
} from '../data/contactLimits';

// The deployed endpoint — the `ContactApiUrl` output of the `aplyd-notify`
// CloudFormation stack (us-east-1). Committed as the default on purpose: it's
// a public URL carrying no credential, and leaving it env-only meant any build
// that forgot the variable shipped a dead form. PUBLIC_CONTACT_API_URL still
// overrides it, which is how you point a build at a different stage.
const DEFAULT_API_URL = 'https://w5vsxr9dx3.execute-api.us-east-1.amazonaws.com/prod/contact';

const API_URL: string = import.meta.env.PUBLIC_CONTACT_API_URL || DEFAULT_API_URL;

// The Lambda's own timeout is 10s; this leaves margin for the round trip
// before we stop waiting and tell the user something is wrong.
const SUBMIT_TIMEOUT_MS = 15_000;

// Fallback route offered whenever the request can't be delivered, so a
// failed submission is never a dead end. Mirrors contactInfo.ts.
const FALLBACK_EMAIL = 'contact@aplyd.com';

// Only used if the thank-you panel is missing from the markup — see showSuccess.
const THANK_YOU_TEXT = "Thank you — we've received your message and will be in touch shortly.";

const REQUIRED_FIELDS: readonly ContactField[] = ['name', 'email', 'lookingFor', 'message'];

// Invisible C0/C1 controls, minus \n and \r which carry meaning in the
// message. They arrive from pasted rich text and can make SES reject an
// otherwise fine email, so they're dropped rather than reported — there is
// nothing for the user to see or fix.
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;

// Only these may be focused from a server response, so a `field` value can't
// be used to build an arbitrary selector.
const FOCUSABLE_FIELDS = new Set<string>(Object.keys(FIELD_LIMITS));

interface ContactPayload {
  name: string;
  email: string;
  organisation: string;
  lookingFor: string;
  message: string;
  companyWebsite: string;
  submittedAt: string;
  userAgent: string;
  pageUrl: string;
  timeZone: string;
}

type StatusState = 'idle' | 'pending' | 'success' | 'error';

export function initContactPage(): void {
  bindOfficeSwitcher();
  bindContactForm();
}

function bindOfficeSwitcher(): void {
  const list = document.querySelector<HTMLElement>('[data-office-list]');
  const map = document.querySelector<HTMLIFrameElement>('[data-office-map]');
  const addressEl = document.querySelector<HTMLElement>('[data-office-address] span');
  if (!list || !map) return;

  const pills = Array.from(list.querySelectorAll<HTMLButtonElement>('.office-pill'));
  const addresses = pills.map((p) => p.dataset.officeAddress ?? '');
  const queries = pills.map((p) => p.dataset.officeQuery ?? '');

  pills.forEach((pill, i) => {
    pill.addEventListener('click', () => {
      pills.forEach((p, j) => p.setAttribute('aria-pressed', String(i === j)));
      if (addressEl && addresses[i]) addressEl.textContent = addresses[i];
      if (queries[i]) map.src = `https://www.google.com/maps?q=${encodeURIComponent(queries[i])}&output=embed`;
    });
  });
}

function bindContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-contact-form]');
  if (!form) return;

  const status = document.querySelector<HTMLElement>('[data-contact-form-status]');
  const success = document.querySelector<HTMLElement>('[data-contact-success]');
  const submitBtn = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]');
  const idleLabel = submitLabel?.textContent ?? 'Send message';

  bindSuccessReset(form, success);
  bindMessageCounter(form);

  // Disabling the button alone doesn't prevent a second submit — pressing
  // Enter in a text field still fires the event.
  let isSubmitting = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const payload = readPayload(form);

    // Re-check after trimming and control-stripping: HTML5 `required` is
    // satisfied by a field of spaces, and `maxlength` counts UTF-16 units
    // while the Lambda's byte cap counts encoded bytes — so both can pass and
    // the request still be rejected. Catching it here keeps the user's typing.
    const problem = validate(payload);
    if (problem) {
      setStatus(status, 'error', problem.message);
      focusField(form, problem.field);
      return;
    }

    isSubmitting = true;
    setBusy(submitBtn, submitLabel, true, idleLabel);
    setStatus(status, 'pending', 'Sending…');

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), SUBMIT_TIMEOUT_MS);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      // A CORS failure or an HTML error page both land here as null rather
      // than throwing on the JSON parse.
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; message?: string; field?: string }
        | null;

      if (res.ok && data?.ok) {
        form.reset();
        showSuccess(form, success, status);
      } else if (res.status === 400) {
        // The Lambda names the offending field and gives a message written
        // for the submitter; "Invalid submission." is its catch-all for a
        // malformed body, which means nothing to a user.
        const serverMessage = data?.message;
        setStatus(
          status,
          'error',
          serverMessage && serverMessage !== 'Invalid submission.'
            ? serverMessage
            : 'Some of those details look incomplete. Please check the form and try again.',
        );
        focusField(form, data?.field);
      } else {
        setStatus(
          status,
          'error',
          `We couldn't send your message just now. Please try again in a moment, or email us at ${FALLBACK_EMAIL}.`,
        );
      }
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === 'AbortError';
      setStatus(
        status,
        'error',
        timedOut
          ? `That took longer than expected. Please try again, or email us at ${FALLBACK_EMAIL}.`
          : `We couldn't reach the server. Check your connection and try again, or email us at ${FALLBACK_EMAIL}.`,
      );
    } finally {
      window.clearTimeout(timeout);
      isSubmitting = false;
      setBusy(submitBtn, submitLabel, false, idleLabel);
    }
  });
}

// Swap the form out for the thank-you panel. Falls back to the inline status
// line if the panel isn't in the markup, so the confirmation is never lost.
function showSuccess(
  form: HTMLFormElement,
  panel: HTMLElement | null,
  status: HTMLElement | null,
): void {
  if (!panel) {
    setStatus(status, 'success', THANK_YOU_TEXT);
    return;
  }

  setStatus(status, 'idle', '');
  form.hidden = true;
  panel.hidden = false;
  panel.focus();
}

function bindSuccessReset(form: HTMLFormElement, panel: HTMLElement | null): void {
  const reset = panel?.querySelector<HTMLButtonElement>('[data-contact-reset]');

  reset?.addEventListener('click', () => {
    panel!.hidden = true;
    form.hidden = false;
    form.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  });
}

function readPayload(form: HTMLFormElement): ContactPayload {
  const data = new FormData(form);

  // Single-line fields: fold every kind of whitespace (including the
  // non-breaking and ideographic spaces that survive a paste) to one space,
  // matching what the Lambda does so the counts agree.
  const field = (name: string): string =>
    String(data.get(name) ?? '')
      .replace(CONTROL_CHARACTERS, '')
      .split(/\s+/)
      .join(' ')
      .trim();

  // The message keeps its line breaks; only controls and trailing space go.
  const messageField = (name: string): string =>
    String(data.get(name) ?? '')
      .replace(CONTROL_CHARACTERS, '')
      .split(/\r\n|[\n\r\u2028\u2029]/)
      .map((line) => line.split(/[^\S\n]+/).join(' ').trim())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  return {
    name: field('name'),
    email: field('email'),
    organisation: field('organisation'),
    lookingFor: field('lookingFor'),
    message: messageField('message'),
    // Honeypot — must stay empty. Read by attribute, not by name: the input
    // is named `ref` in the DOM so browser autofill won't recognise it (see
    // contact.astro), while the payload key the Lambda checks stays the same.
    companyWebsite: form.querySelector<HTMLInputElement>('[data-honeypot]')?.value.trim() ?? '',
    submittedAt: new Date().toISOString(),
    userAgent: navigator.userAgent,
    pageUrl: window.location.href,
    timeZone: resolveTimeZone(),
  };
}

function resolveTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? '';
  } catch {
    return '';
  }
}

interface ValidationProblem {
  message: string;
  field?: ContactField;
}

// Mirrors the Lambda's own checks so a rejection is caught before the round
// trip. The Lambda still re-validates — this is convenience, not security.
function validate(payload: ContactPayload): ValidationProblem | null {
  const missing = REQUIRED_FIELDS.filter((key) => !payload[key]);
  if (missing.length) {
    const labels = missing.map((key) => FIELD_LABELS[key]);
    const list =
      labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0];
    return { message: `Please complete ${list} before sending.`, field: missing[0] };
  }

  // ASCII only: a Unicode local part needs SMTPUTF8, which the mail path
  // can't negotiate, so it would fail after we'd claimed success.
  if (!/^[\x20-\x7e]+$/.test(payload.email)) {
    return {
      message: 'Enter an email address using standard (ASCII) characters.',
      field: 'email',
    };
  }

  for (const key of Object.keys(FIELD_LIMITS) as ContactField[]) {
    const length = payload[key].length;
    if (length > FIELD_LIMITS[key]) {
      return {
        message: `${FIELD_LABELS[key]} must be ${FIELD_LIMITS[key].toLocaleString()} characters or fewer. Yours is ${length.toLocaleString()}.`,
        field: key,
      };
    }
  }

  // Byte length, not character count: the cap is on the encoded body, so a
  // message inside the character limit can still be too big in a non-Latin
  // script (3 bytes per character) or with emoji (4).
  if (new TextEncoder().encode(JSON.stringify(payload)).length > MAX_PAYLOAD_BYTES) {
    return {
      message: 'Your message is too long to send. Please shorten it and try again.',
      field: 'message',
    };
  }

  return null;
}

function focusField(form: HTMLFormElement, field?: string): void {
  if (!field || !FOCUSABLE_FIELDS.has(field)) return;
  form.querySelector<HTMLElement>(`[name="${field}"]`)?.focus();
}

// Silent until the message nears its cap — a counter sitting at "5,000 left"
// on an empty field is noise, and reads as a demand for length.
function bindMessageCounter(form: HTMLFormElement): void {
  const message = form.querySelector<HTMLTextAreaElement>('[name="message"]');
  const counter = form.querySelector<HTMLElement>('[data-message-counter]');
  if (!message || !counter) return;

  const update = (): void => {
    const used = message.value.length;
    if (used < COUNTER_VISIBLE_FROM) {
      counter.textContent = '';
      counter.removeAttribute('data-state');
      return;
    }

    const remaining = FIELD_LIMITS.message - used;
    counter.textContent = `${remaining.toLocaleString()} characters remaining`;
    counter.dataset.state = remaining <= 0 ? 'error' : 'warn';
  };

  message.addEventListener('input', update);
  update();
}

function setBusy(
  button: HTMLButtonElement | null,
  label: HTMLElement | null,
  busy: boolean,
  idleLabel: string,
): void {
  if (button) {
    button.disabled = busy;
    button.setAttribute('aria-busy', String(busy));
  }
  if (label) label.textContent = busy ? 'Sending…' : idleLabel;
}

// State drives the colour via CSS (see contact.astro) rather than class
// juggling here, so the script's only job is the text.
function setStatus(el: HTMLElement | null, state: StatusState, text: string): void {
  if (!el) return;
  el.dataset.state = state;
  el.textContent = text;
}
