import JSON5 from 'json5';

export default function jparse(lines) {
  const str = lines.join('\n');
  try {
    return JSON.parse(str);
  } catch (_) {
    return JSON5.parse(str);
  }
}
