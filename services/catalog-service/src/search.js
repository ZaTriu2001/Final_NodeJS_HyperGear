import { Product } from '@hypergear/core/models';
import { normalize } from '@hypergear/core/validation';
const base = process.env.ELASTICSEARCH_URL;
const index = process.env.ELASTICSEARCH_INDEX ?? 'hypergear-products';
let initialized = false; let syncing = false;
const seen = new Map();
async function elastic(path, options = {}) {
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('Elasticsearch HTTP ' + response.status);
  return response.json();
}
export async function syncSearch() {
  if (!base || syncing) return; syncing = true;
  try {
    if (!initialized) {
      const head = await fetch(base + '/' + index, { method: 'HEAD', signal: AbortSignal.timeout(3000) });
      if (head.status === 404) await elastic('/' + index, { method: 'PUT', body: JSON.stringify({ mappings: { properties: { name: { type: 'text' }, searchText: { type: 'text' }, active: { type: 'boolean' } } } }) });
      else if (!head.ok) throw new Error('Index unavailable');
      initialized = true;
    }
    const products = await Product.find().select('name brand category shortDescription searchText active updatedAt').lean();
    const changed = products.filter(p => seen.get(String(p._id)) !== String(p.updatedAt));
    if (changed.length) {
      const body = changed.flatMap(p => [JSON.stringify({ index: { _index: index, _id: String(p._id) } }), JSON.stringify({ name: p.name, searchText: normalize([p.name, p.brand, p.category, p.shortDescription].join(' ')), active: p.active })]).join('\n') + '\n';
      const result = await elastic('/_bulk?refresh=wait_for', { method: 'POST', headers: { 'Content-Type': 'application/x-ndjson' }, body });
      if (result.errors) throw new Error('Index bulk update failed');
      changed.forEach(p => seen.set(String(p._id), String(p.updatedAt)));
    }
  } finally { syncing = false; }
}
export async function searchIds(q) {
  if (!base) return null;
  // Exact tokens first: fuzzy Vietnamese short words otherwise match unrelated categories.
  const search = fuzziness => elastic('/' + index + '/_search', { method: 'POST', body: JSON.stringify({ size: 10000, _source: false, query: { bool: { filter: [{ term: { active: true } }], must: [{ multi_match: { query: normalize(q), fields: ['searchText', 'name^2'], fuzziness, operator: 'and' } }] } } }) });
  let result = await search(0);
  if (!result.hits.hits.length) result = await search('AUTO:4,7');
  return result.hits.hits.map(hit => hit._id);
}
