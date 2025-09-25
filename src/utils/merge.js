export function deepMerge(target = {}, source = {}) {
  const output = Array.isArray(target) ? [...target] : { ...target };
  if (Array.isArray(source)) {
    const base = Array.isArray(target) ? target : [];
    return Array.from(new Set([...base, ...source]));
  }
  Object.entries(source || {}).forEach(([key, value]) => {
    const existing = output[key];
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      output[key] = deepMerge(existing, value);
    } else if (Array.isArray(value)) {
      const combined = Array.isArray(existing) ? existing : [];
      output[key] = Array.from(new Set([...combined, ...value]));
    } else {
      output[key] = value;
    }
  });
  return output;
}
