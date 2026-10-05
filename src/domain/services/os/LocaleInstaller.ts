/**
 * LocaleInstaller - installs the internationalisation data of a system:
 *   /usr/share/i18n/locales/*   locale definition sources (localedef -i)
 *   /usr/share/i18n/charmaps/*  charmaps (localedef -f, locale -m)
 *   /usr/lib/locale/C.utf8/     the compiled C.UTF-8 locale (locale -a)
 *   /usr/share/locale/          message catalogs (gettext, msgfmt)
 */
import { FileSystemService } from '../FileSystemService';
import { LOCALE_SOURCES } from '../../utils/i18n/LocaleSources';
import { CHARMAPS, GENERIC_SOURCES } from '../../utils/i18n/Charmaps';
import { builtinTables, LOCALE_CATEGORIES, renderCategory } from '../../utils/i18n/LocaleDefinition';

const MESSAGE_LANGUAGES = ['de', 'en_GB', 'es', 'fr', 'it', 'ja'];

export class LocaleInstaller {
    install(fs: FileSystemService): void {
        const dirs = ['/usr/share/i18n', '/usr/share/i18n/locales', '/usr/share/i18n/charmaps', '/usr/lib/locale',
            '/usr/lib/locale/C.utf8', '/usr/lib/locale/C.utf8/LC_MESSAGES', '/usr/share/locale',
            ...MESSAGE_LANGUAGES.flatMap(l => [`/usr/share/locale/${l}`, `/usr/share/locale/${l}/LC_MESSAGES`])];
        for (const d of dirs) if (!fs.resolve(d, '/')) fs.mkdirp(d, 0o755, 0, 0);

        for (const [name, text] of Object.entries({ ...GENERIC_SOURCES, ...LOCALE_SOURCES })) {
            this.write(fs, `/usr/share/i18n/locales/${name}`, text);
        }
        for (const [name, text] of Object.entries(CHARMAPS)) this.write(fs, `/usr/share/i18n/charmaps/${name}`, text);

        const cUtf8 = builtinTables('C.UTF-8');
        for (const cat of LOCALE_CATEGORIES) {
            const path = cat === 'LC_MESSAGES' ? '/usr/lib/locale/C.utf8/LC_MESSAGES/SYS_LC_MESSAGES' : `/usr/lib/locale/C.utf8/${cat}`;
            this.write(fs, path, renderCategory(cUtf8[cat]));
        }
    }

    private write(fs: FileSystemService, path: string, content: string) {
        if (fs.resolve(path, '/')) return;
        fs.writeFile(path, content, 'w', 0, 0, '/');
        fs.chmod(path, 0o644, '/');
    }
}
