export { buildPlan, SYSTEMS, selfVersion, detectIndent } from './plan.js';
export { applyPlan } from './apply.js';
export { detect, TARGETS, TARGET_IDS, FALLBACK } from './targets.js';
export {
  upsertBlock,
  hasBlock,
  fence,
  stamp,
  readStamp,
  START,
  END,
} from './managed.js';
export { main } from './cli.js';
