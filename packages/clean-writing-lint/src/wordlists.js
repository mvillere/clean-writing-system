// Word lists for the anti-slop rules.
//
// These mirror the delete lists and substitution tables in
// writing-systems/ste.md. Change both together.
//
// Every entry is matched case-insensitively on a word boundary, so multi-word
// phrases work. Do not add regex syntax here; entries are escaped.

export const MARKETING = [
  'seamless', 'seamlessly', 'robust', 'powerful', 'blazing fast',
  'blazingly fast', 'lightning-fast', 'lightning fast', 'cutting-edge',
  'state-of-the-art', 'next-generation', 'next-gen', 'revolutionary',
  'game-changing', 'game changer', 'world-class', 'best-in-class',
  'industry-leading', 'enterprise-grade', 'battle-tested', 'production-grade',
  'turnkey', 'elegant', 'elegantly', 'delightful', 'effortless', 'effortlessly',
  'intuitive', 'comprehensive', 'comprehensively', 'first-class',
  'unparalleled', 'sensible defaults', 'minimal friction', 'vendor lock-in',
  'supercharge', 'supercharges', 'unlock', 'unlocks', 'unleash', 'unleashes',
  'empower', 'empowers', 'streamline', 'streamlines', 'revolutionize',
  'harness', 'harnesses', 'elevate', 'elevates',
];

export const BANNED = [
  'begin', 'begins', 'commence', 'commences', 'initiate', 'initiates',
  'utilize', 'utilizes', 'utilizing', 'utilization',
  'leverage', 'leverages', 'leveraging',
  'facilitate', 'facilitates', 'facilitating',
  'ensure', 'ensures', 'ensuring',
  'prior to', 'subsequent to',
  'obtain', 'obtains', 'acquire', 'acquires',
  'demonstrate', 'demonstrates', 'showcase', 'showcases',
  'terminate', 'terminates',
  'additionally', 'furthermore', 'moreover', 'consequently',
  'nevertheless', 'notwithstanding', 'henceforth', 'therein', 'aforementioned',
  'whilst', 'amongst',
  'numerous', 'myriad', 'plethora', 'multitude',
  'in order to', 'for the purpose of', 'by means of',
  'a variety of', 'a range of', 'the vast majority of',
  'in the event that', 'due to the fact that', 'owing to the fact that',
  'at this point in time', 'in the near future',
  'with respect to', 'with regard to', 'in terms of',
  'mitigate', 'mitigates', 'consolidate', 'consolidates',
  'instantiate', 'instantiates', 'orchestrate', 'orchestrates',
  'methodology', 'functionality',
];

export const PHRASAL = [
  'spin up', 'spins up', 'spun up', 'spinning up',
  'spin down', 'tear down', 'tears down',
  'reach out', 'reaches out', 'reaching out',
  'dive into', 'dives into', 'diving into', 'deep dive',
  'kick off', 'kicks off', 'kicking off',
  'roll out', 'rolls out', 'rolling out',
  'ramp up', 'ramps up', 'circle back', 'drill down',
  'wire up', 'wires up', 'hook up', 'hooks up',
  'level up', 'double down', 'unpack',
];

export const FILLER = [
  'it is important to note', "it's important to note",
  'it should be noted', 'it is worth noting', "it's worth noting",
  'please note that', 'as mentioned above', 'as noted above',
  'needless to say', 'at the end of the day', 'that being said',
  'in essence', 'essentially', 'basically', 'fundamentally',
  'in conclusion', 'in summary', 'to summarize',
  'when it comes to', 'it goes without saying',
];

// Hedges and intensifiers that add nothing. Kept separate from FILLER so a
// project can switch one off without losing the other.
// "rather" is left out on purpose. "rather than" and "would rather" are both
// normal English, and the intensifier sense is rare in technical prose.
export const INTENSIFIER = [
  'very', 'quite', 'really', 'actually', 'simply', 'truly',
  'extremely', 'incredibly', 'absolutely', 'literally',
];

// Shapes, not words. Each entry is a real regex with the global and
// case-insensitive flags applied by the rule.
export const CONSTRUCTIONS = [
  {
    id: 'negation-flip',
    source: String.raw`\b(?:it|this|that)(?:['’]s| is| was| are|['’]re)\s+not\s+just\s+`,
    message: 'The "not just X, it is Y" construction',
  },
  {
    id: 'scene-opener',
    source: String.raw`\bin\s+today['’]?s?\s+[\w-]+[- ]paced\b`,
    message: 'The "in today\'s fast-paced world" opener',
  },
  {
    id: 'audience-sweep',
    source: String.raw`\bwhether\s+you(?:['’]re|\s+are)\s+(?:a|an|new|just)\b`,
    message: 'The "whether you are a beginner or an expert" sweep',
  },
  {
    id: 'invitation',
    source: String.raw`\b(?:let['’]s|let\s+us)\s+(?:dive|jump|get\s+started|take\s+a\s+look)\b`,
    message: 'The "let us dive in" invitation',
  },
  {
    id: 'setup-line',
    source: String.raw`\bhere(?:['’]s|\s+is)\s+the\s+(?:thing|kicker|catch)\b|\bthe\s+best\s+part\s*[?:]`,
    message: 'A setup line that delays the fact',
  },
  {
    id: 'question-heading',
    source: String.raw`^#{1,6}\s+(?:what|why|how|who|when|where|is|are|do|does|can|should)\b[^\n]*\?\s*$`,
    message: 'A heading written as a question',
    multiline: true,
  },
];

// Past participles that read as adjectives after "to be". These produce
// passive-voice false positives, so they are skipped by default.
export const PASSIVE_IGNORE = [
  'allowed', 'banned', 'copyrighted', 'deprecated', 'related', 'based',
  'required', 'licensed', 'limited', 'supported', 'expected', 'detailed',
  'disabled', 'enabled', 'undefined', 'unused', 'reserved', 'intended',
  'interested', 'involved', 'pleased', 'tired', 'closed', 'located',
];

// Adverbs that can sit between "to be" and a past participle.
export const PASSIVE_ADVERBS = [
  'not', 'also', 'already', 'often', 'always', 'never', 'only', 'now', 'then',
  'still', 'generally', 'typically', 'usually', 'automatically', 'explicitly',
  'implicitly', 'silently', 'currently', 'therefore', 'thus', 'first', 'later',
];

// Irregular past participles. Regular ones are caught by the \w+ed pattern.
export const IRREGULAR_PARTICIPLES = [
  'done', 'made', 'sent', 'read', 'built', 'kept', 'held', 'set', 'put', 'run',
  'written', 'shown', 'given', 'taken', 'found', 'got', 'gotten', 'seen',
  'known', 'thrown', 'drawn', 'left', 'lost', 'meant', 'paid', 'told',
  'brought', 'caught', 'chosen', 'driven', 'forgotten', 'hidden', 'split',
  'spent', 'sold', 'dealt', 'felt', 'kept', 'sent', 'cut', 'hit', 'let',
];

// Words whose apostrophe-s is a contraction, not a possessive. Everything else
// ending in 's is treated as possessive. This is the fix for the false
// positives in the original Python linter, which flagged "project's".
export const CONTRACTION_S_STEMS = [
  'it', 'that', 'what', 'there', 'here', 'he', 'she', 'who', 'let', 'one',
  'this', 'where', 'how', 'why', 'everyone', 'everything', 'someone',
  'something', 'nobody', 'nothing',
];
