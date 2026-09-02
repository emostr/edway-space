import { randomBytes, randomInt } from 'node:crypto';

// Алфавит Крокфорда: из него выброшены I, L, O и U — при переписывании кода
// с бумаги их путают с 1, 0 и V. Остальные 32 символа однозначны.
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

function pick(alphabet: string, length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[randomInt(alphabet.length)];
  }
  return out;
}

/** Код бланка: 8 символов, на листе печатается как XXXX-XXXX. */
export function generateWorkCode(): string {
  return pick(CROCKFORD, 8);
}

export function formatWorkCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Приводит код, набранный руками с листа, к каноничному виду. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/[IL]/g, '1')
    .replace(/O/g, '0')
    .replace(/U/g, 'V');
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}
