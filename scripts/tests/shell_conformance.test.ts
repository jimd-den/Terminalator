/** POSIX shell language conformance, differential against dash. */
import * as path from 'path';
import { SHELL_CASES } from './shell_conformance.cases';
import { differentialSuite } from './differential';

differentialSuite('POSIX shell conformance (vs dash)', SHELL_CASES, path.join(__dirname, 'golden', 'shell_conformance.json'));
