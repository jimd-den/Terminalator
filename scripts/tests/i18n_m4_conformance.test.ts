/** m4 and i18n utility conformance, differential against GNU m4, GNU gettext and glibc. */
import * as path from 'path';
import { I18N_M4_CASES } from './i18n_m4_conformance.cases';
import { differentialSuite } from './differential';

differentialSuite('m4 / i18n conformance (vs GNU m4, gettext, glibc)', I18N_M4_CASES, path.join(__dirname, 'golden', 'i18n_m4_conformance.json'));
