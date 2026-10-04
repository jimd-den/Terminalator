/** Utility conformance, differential against the host's GNU/POSIX tools. */
import * as path from 'path';
import { UTILITY_CASES } from './utility_conformance.cases';
import { differentialSuite } from './differential';

differentialSuite('Utility conformance (vs GNU/POSIX tools)', UTILITY_CASES, path.join(__dirname, 'golden', 'utility_conformance.json'));
