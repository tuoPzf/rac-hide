/**
 * Map library, canvas and image-decoding errors onto i18n message keys.
 * Kept DOM-free so it can be unit-tested in Node.
 */

const SECRET_TOO_LARGE = 'secret image does not fit into this cover';
const COVER_TOO_SMALL = 'cover image is too small to embed anything';
const CANVAS_EXPORT = 'canvas.toBlob failed';
const PAYLOAD_OVER_CAPACITY = /payload of (\d+) B exceeds capacity of (-?\d+) B/;

export function describeError(error, { decode = false, exporting = false } = {}) {
  const message = error && typeof error.message === 'string' ? error.message.trim() : '';
  const name = error && typeof error.name === 'string' ? error.name : '';

  if (message.includes(SECRET_TOO_LARGE)) return { key: 'error.secretTooLarge' };
  if (message.includes(COVER_TOO_SMALL)) return { key: 'error.coverTooSmall' };

  const overCapacity = message.match(PAYLOAD_OVER_CAPACITY);
  if (overCapacity) {
    return {
      key: 'error.payloadTooLarge',
      vars: { payload: overCapacity[1], capacity: overCapacity[2] },
    };
  }

  if (message.includes(CANVAS_EXPORT)) return { key: 'error.canvas' };
  if (exporting && !decode) return { key: 'error.canvas' };

  // Upload/decode handlers pass `decode`; DOMException and the browser's
  // "could not be decoded" wording are also recognised on their own.
  if (
    decode ||
    name === 'EncodingError' ||
    name === 'InvalidStateError' ||
    /could not be decoded|image decode/i.test(message)
  ) {
    return { key: 'error.decodeImage' };
  }

  if (!message) return { key: 'error.decodeImage' };
  return { key: 'error.generic', vars: { message } };
}
