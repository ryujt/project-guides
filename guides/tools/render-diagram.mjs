import { readFileSync } from 'node:fs';
import { navigationToMermaid } from './diagram/navigation.mjs';
import { stateToMermaid } from './diagram/state.mjs';
import jobflow from './diagram/jobflow.mjs';

const converters = new Map([
  ['navigation', navigationToMermaid],
  ['state', stateToMermaid],
  ['jobflow', input => jobflow.generateSVG(input)],
]);
const convert = converters.get(process.argv[2]);
if (!convert || process.argv.length !== 3) {
  console.error('Usage: node render-diagram.mjs <navigation|state|jobflow> < input.dsl');
  process.exit(1);
}
const input = readFileSync(0, 'utf8').trim();
if (!input) {
  console.error('Empty diagram input');
  process.exit(1);
}
console.log(convert(input));
