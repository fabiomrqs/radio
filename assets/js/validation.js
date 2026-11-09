/** Validações e máscaras do cadastro. O backend deve repetir todas estas validações. */

export const onlyDigits = (v) => String(v || '').replace(/\D/g, '');

export const masks = {
  date(v) {
    const d = onlyDigits(v).slice(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  },
  cpf(v) {
    const d = onlyDigits(v).slice(0, 11);
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1-$2');
  },
  phone(v) {
    const d = onlyDigits(v).slice(0, 11);
    if (!d.length) return '';
    if (d.length < 3) return `(${d}`;
    const ddd = d.slice(0, 2), rest = d.slice(2);
    if (rest.length <= 4) return `(${ddd}) ${rest}`;
    const split = rest.length === 9 ? 5 : 4;
    return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
  },
};

/** "dd/mm/aaaa" → "aaaa-mm-dd" ou null. */
export function parseBirthDate(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v || '');
  if (!m) return null;
  const [, dd, mm, yyyy] = m.map(Number);
  const dt = new Date(yyyy, mm - 1, dd);
  if (dt.getFullYear() !== yyyy || dt.getMonth() !== mm - 1 || dt.getDate() !== dd) return null;
  if (yyyy < 1900 || dt > new Date()) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function ageFrom(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

export function isValidCPF(v) {
  const c = onlyDigits(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  for (let t = 9; t < 11; t++) {
    let sum = 0;
    for (let i = 0; i < t; i++) sum += Number(c[i]) * (t + 1 - i);
    if (((sum * 10) % 11) % 10 !== Number(c[t])) return false;
  }
  return true;
}

export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());

export function isValidPhone(v) {
  const d = onlyDigits(v);
  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false;          // DDDs começam em 11
  if (d.length === 11 && d[2] !== '9') return false;     // celular começa com 9
  return true;
}

/** Valida um campo do cadastro. Retorna a mensagem de erro ou ''. */
export function validateField(name, value, { minAge = null } = {}) {
  const v = String(value || '').trim();
  switch (name) {
    case 'nome':
      if (!v) return 'Informe seu nome completo.';
      if (v.split(/\s+/).length < 2) return 'Informe nome e sobrenome.';
      if (v.length > 120) return 'Use no máximo 120 caracteres.';
      return '';
    case 'nascimento': {
      if (!v) return 'Informe sua data de nascimento.';
      const iso = parseBirthDate(v);
      if (!iso) return 'Use uma data válida no formato dd/mm/aaaa.';
      if (minAge && ageFrom(iso) < minAge) return `É preciso ter ${minAge} anos ou mais para participar.`;
      return '';
    }
    case 'cpf':
      if (!v) return 'Informe seu CPF.';
      return isValidCPF(v) ? '' : 'CPF inválido. Confira os 11 números.';
    case 'email':
      if (!v) return 'Informe seu e-mail.';
      return isValidEmail(v) ? '' : 'Confira o e-mail: algo como nome@email.com.';
    case 'telefone':
      if (!v) return 'Informe seu telefone.';
      return isValidPhone(v) ? '' : 'Informe DDD e número, ex.: (11) 98765-4321.';
    case 'cidade':
      if (!v) return 'Informe sua cidade.';
      return v.length > 80 ? 'Use no máximo 80 caracteres.' : '';
    default:
      return '';
  }
}
