/**
 * Shared wiki slug normalization — used consistently across WikiContent, WikiGraph,
 * WikiIndexBrowser, and WikiBacklinks for correct link resolution.
 */

export function normalizeSlug(input: string): string {
  if (!input) return '';
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s/-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function resolveWikiSlug(
  target: string,
  allPages?: { title: string; slug: string }[]
): string {
  if (!target) return '';

  if (!allPages || allPages.length === 0) {
    return normalizeSlug(target);
  }

  const norm = target.trim().toLowerCase();
  const removeAccents = (str: string) =>
    str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const titleToSlug = new Map<string, string>();
  const slugToSlug = new Map<string, string>();
  const normalizedMap = new Map<string, string>();

  for (const p of allPages) {
    const lt = p.title.toLowerCase();
    const ls = p.slug.toLowerCase();
    titleToSlug.set(lt, p.slug);
    slugToSlug.set(ls, p.slug);
    normalizedMap.set(removeAccents(lt), p.slug);
    normalizedMap.set(removeAccents(ls), p.slug);
  }

  // 1. Direct slug/title match
  if (slugToSlug.has(norm)) return slugToSlug.get(norm)!;
  if (titleToSlug.has(norm)) return titleToSlug.get(norm)!;
  if (slugToSlug.has(`source/${norm}`)) return slugToSlug.get(`source/${norm}`)!;

  // 2. Accent-removed match
  const normNoAccents = removeAccents(norm);
  if (normalizedMap.has(normNoAccents)) return normalizedMap.get(normNoAccents)!;

  // 3. Slugified match
  const slugified = normalizeSlug(norm);
  if (slugToSlug.has(slugified)) return slugToSlug.get(slugified)!;
  if (slugToSlug.has(`source/${slugified}`)) return slugToSlug.get(`source/${slugified}`)!;

  // 4. Hyphen-stripped match (catches LLM hyphenation differences)
  const stripped = norm.replace(/-/g, '');
  for (const [key, val] of slugToSlug) {
    if (key.replace(/-/g, '') === stripped) return val;
  }

  // 5. Plural fallback
  for (const suffix of ['s', 'es']) {
    if (norm.endsWith(suffix)) {
      const singular = norm.slice(0, -suffix.length);
      if (slugToSlug.has(singular)) return slugToSlug.get(singular)!;
      if (titleToSlug.has(singular)) return titleToSlug.get(singular)!;
      const singularSlug = normalizeSlug(singular);
      if (slugToSlug.has(singularSlug)) return slugToSlug.get(singularSlug)!;
    }
  }

  // Fallback: normalize the raw target
  return normalizeSlug(target);
}

export function buildWikiHref(slug: string, workspaceId?: string): string {
  const base = `/wiki/${encodeURIComponent(slug)}`;
  if (workspaceId && workspaceId !== 'default-workspace' && workspaceId !== 'all') {
    return `${base}?workspaceId=${encodeURIComponent(workspaceId)}`;
  }
  return base;
}
