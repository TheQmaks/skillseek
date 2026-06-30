import MiniSearch from "minisearch";

const FIELDS = ["name", "namespace", "description", "displayName"];
const STORE_FIELDS = ["displayName", "name", "namespace", "description", "source", "path"];
const SEARCH_OPTS = { boost: { name: 3, namespace: 2, displayName: 2, description: 1 }, fuzzy: 0.2, prefix: true, combineWith: "OR" };

// Common English function words. Dropped at BOTH index and query time so that
// chatty prompts ("what time is it now", "thanks that works") don't match skills
// on filler alone — the single biggest source of false-positive injections.
export const STOPWORDS = new Set(
  ("a an the and or of to for in on at by from as is are be been being am was were do does did " +
   "this that these those it its they them their there here then than so just only also " +
   "what when how why where which who whom whose with without into onto over under about above below " +
   "i me my we us our you your he she his her him they i'm i'll you're it's " +
   "can could would should will shall may might must not no yes ok okay please thanks thank " +
   "now today again still yet some any all each every more most much many few " +
   "help want need get got make made use using have has had let lets " +
   "run continue go going show tell give take put").split(" ")
);

function processTerm(term) {
  const w = term.toLowerCase();
  return (w.length < 2 || STOPWORDS.has(w)) ? null : w;
}

function makeIndex() {
  return new MiniSearch({
    fields: FIELDS,
    storeFields: STORE_FIELDS,
    idField: "path",
    processTerm,
    extractField: (doc, f) => (doc[f] == null ? "" : String(doc[f])),
  });
}

export function createSearcher(skills) {
  const mini = makeIndex();
  mini.addAll(skills);
  return wrap(mini);
}

function wrap(mini) {
  return {
    search(query, { topK = 5 } = {}) {
      if (!query || !query.trim()) return [];
      return mini.search(query, SEARCH_OPTS).slice(0, topK).map(r => ({
        displayName: r.displayName, name: r.name, namespace: r.namespace,
        description: r.description, source: r.source, path: r.path, score: r.score,
      }));
    },
  };
}

// Pollution-safety policy: keep only strong, novel matches, capped.
export function selectForInjection(results, { threshold = 1, topK = 3, exclude = new Set() } = {}) {
  return results
    .filter(r => r.score >= threshold && !exclude.has(r.displayName))
    .slice(0, topK);
}
