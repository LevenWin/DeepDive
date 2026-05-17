export function generateSlug(title) {
  const cleaned = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (cleaned.length > 0) return cleaned
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 6)
  return `id-${ts}-${rand}`
}
