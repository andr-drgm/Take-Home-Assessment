// Items utilities
function normalize(text) {
  return String(text || '')
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // strip accents/diacritics
}

module.exports = { normalize };

