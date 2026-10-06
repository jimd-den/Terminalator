/**
 * ManualCatalog - the installed manual pages (/usr/share/man) of every
 * host: NAME, SYNOPSIS and DESCRIPTION for each program in
 * DEFAULT_UTILITIES, plus a few file-format pages. A test keeps it in
 * sync with the utility catalog. man(1), apropos(1) and whatis(1) read it.
 */
export interface ManualPage {
    /** Names documented by the page; the first is the page name. */
    names: string[];
    section: string;
    summary: string;
    synopsis: string[];
    description: string[];
}

/** Section headers, as printed in the page header line. */
export const SECTION_TITLES: Record<string, string> = {
    '1': 'User Commands',
    '5': 'File Formats Manual',
    '7': 'Miscellaneous Information Manual',
    '8': 'System Manager\'s Manual',
};

const pages: ManualPage[] = [];

/** Adds a section 1 page. Synopsis lines are separated by '|'. */
function page(names: string | string[], summary: string, synopsis: string, ...description: string[]): void {
    pages.push({
        names: Array.isArray(names) ? names : [names],
        section: '1',
        summary,
        synopsis: synopsis.split(' | '),
        description,
    });
}

// --- Files and directories -------------------------------------------------
page('ls', 'list directory contents', 'ls [-ikqrs] [-glno] [-A|-a] [-C|-m|-x|-1] [-F|-p] [-H|-L] [-R|-d] [-S|-f|-t] [-c|-u] [file...]',
    'For each operand that names a file of a type other than directory, ls writes the name of the file and any requested associated information. For each operand that names a directory, ls writes the names of the files contained within it. With no operands, the current directory is listed.',
    '-l writes the long format (mode, links, owner, group, size, date, name); -a includes entries beginning with a period; -R lists subdirectories recursively; -t sorts by modification time; -S by size; -r reverses the sort order.');
page('cd', 'change the working directory', 'cd [-L|-P] [directory] | cd -',
    'Changes the working directory of the current shell execution environment. With no operand, the value of HOME is used. The operand - changes to the previous directory (OLDPWD) and writes its name. CDPATH is searched for relative operands. cd is a shell builtin.');
page('pwd', 'return working directory name', 'pwd [-L|-P]',
    'Writes the absolute pathname of the current working directory to standard output. -L (the default) uses PWD if it names the current directory; -P writes a path free of symbolic links.');
page('cat', 'concatenate and print files', 'cat [-u] [file...]',
    'Reads files in sequence and writes their contents to standard output in the same sequence. A file operand of - or no operand reads standard input. -u writes without delay (unbuffered).');
page('mkdir', 'make directories', 'mkdir [-p] [-m mode] dir...',
    'Creates the named directories. -p creates any missing intermediate directories and does not treat an existing directory as an error; -m sets the file mode of the new directories (as with chmod).');
page('touch', 'change file access and modification times', 'touch [-acm] [-r ref_file|-t time|-d date_time] file...',
    'Sets the access and modification times of each file to the current time, creating files that do not exist unless -c is given. -a and -m change only the access or modification time; -r copies the times of ref_file; -t uses [[CC]YY]MMDDhhmm[.SS].');
page('rm', 'remove directory entries', 'rm [-iRr] file... | rm -f [-iRr] [file...]',
    'Removes the directory entry specified by each file operand. -f ignores nonexistent files and never prompts; -i prompts before each removal; -R or -r removes file hierarchies recursively.');
page('cp', 'copy files', 'cp [-Pfip] source_file target_file | cp [-Pfip] source_file... target | cp -R [-H|-L|-P] [-fip] source_file... target',
    'Copies source_file to target_file, or each source_file into the existing directory target. -R copies file hierarchies; -p preserves owner, group, mode and times; -i prompts before overwriting; -f removes an unwritable destination first.');
page('mv', 'move files', 'mv [-if] source_file target_file | mv [-if] source_file... target_dir',
    'Moves (renames) source_file to target_file, or each source_file into the directory target_dir. Moves across file systems copy then remove. -i prompts before overwriting; -f does not prompt.');
page('chmod', 'change the file modes', 'chmod [-R] mode file...',
    'Changes the file mode bits of each file. mode is an octal number or a symbolic expression such as u+x, go-w or a=r. -R changes file hierarchies recursively.');
page('chown', 'change the file ownership', 'chown [-h] owner[:group] file... | chown -R [-H|-L|-P] owner[:group] file...',
    'Sets the user ID (and optionally the group ID) of each file. owner and group may be names or numeric IDs. Only the superuser may give a file away. -R recurses; -h changes symbolic links themselves.');
page('chgrp', 'change the file group ownership', 'chgrp [-h] group file... | chgrp -R [-H|-L|-P] group file...',
    'Sets the group ID of each file to group, a group name or numeric ID. The owner may change the group to any group they are a member of. -R recurses; -h changes symbolic links themselves.');
page('du', 'estimate file space usage', 'du [-a|-s] [-kx] [-H|-L] [file...]',
    'Writes the file space allocated to each file hierarchy, in 512-byte units (or 1024 with -k). -s writes only a total for each operand; -a writes an entry for every file; -x stays on one file system.');
page('df', 'report free disk space', 'df [-k] [-P|-t] [file...]',
    'Writes the amount of available space and the number of free file slots for the file systems containing the given files, or all mounted file systems. -k uses 1024-byte units; -P uses the portable output format.');
page('ln', 'link files', 'ln [-fs] [-L|-P] source_file target_file | ln [-fs] [-L|-P] source_file... target_dir',
    'Creates a new directory entry (link) for each source_file. -s creates symbolic links instead of hard links; -f removes existing destination files first.');
page('link', 'call link() function', 'link file1 file2',
    'Performs the link() function call to create a new hard link named file2 to the existing file file1.');
page('unlink', 'call the unlink() function', 'unlink file',
    'Performs the unlink() function call to remove the directory entry file.');
page('rmdir', 'remove directories', 'rmdir [-p] dir...',
    'Removes each named directory, which must be empty. -p also removes each parent component of the path that becomes empty.');
page('readlink', 'print the value of a symbolic link or canonical file name', 'readlink [-fn] file',
    'Writes the contents of the symbolic link file. -f canonicalizes by following every symbolic link in every component; -n omits the trailing newline.');
page('realpath', 'print the resolved path', 'realpath [-E|-e] file...',
    'Writes the canonical absolute pathname of each file, with every symbolic link, . and .. component resolved. -e requires every component to exist.');
page('find', 'find files', 'find [-H|-L] path... [operand_expression...]',
    'Recursively descends the directory hierarchy from each path, evaluating a Boolean expression for each file. Primaries include -name, -path, -type, -perm, -user, -group, -size, -mtime, -newer, -prune, -print, -exec and -ok; ! -a -o and parentheses combine them.');
page('file', 'determine file type', 'file [-dh] [-M file] [-m file] file... | file -i [-h] file...',
    'Performs a series of tests on each file to classify it: file system type, then magic numbers, then language and text tests. The result is written as "file: type".');
page('mkfifo', 'make FIFO special files', 'mkfifo [-m mode] file...',
    'Creates the FIFO special files named by the operands. -m sets the file permission bits of the new FIFOs.');
page('pathchk', 'check pathnames', 'pathchk [-p] [-P] pathname...',
    'Checks that each pathname is valid and portable: component and path lengths, and searchable directories. -p checks against the POSIX portable limits and filename character set; -P rejects empty names and leading hyphens.');
page('basename', 'return non-directory portion of a pathname', 'basename string [suffix]',
    'Deletes any prefix ending with the last slash from string, and a matching suffix if given, and writes the result to standard output.');
page('dirname', 'return the directory portion of a pathname', 'dirname string',
    'Writes the directory portion of string: everything up to (not including) the last slash, or . if there is no slash.');

// --- Text processing ---------------------------------------------------------
page('grep', 'search a file for a pattern', 'grep [-E|-F] [-c|-l|-q] [-insvx] -e pattern_list [-e pattern_list]... [-f pattern_file]... [file...] | grep [-E|-F] [-c|-l|-q] [-insvx] [-e pattern_list]... -f pattern_file [file...] | grep [-E|-F] [-c|-l|-q] [-insvx] pattern_list [file...]',
    'Searches the input files for lines containing a match to any of the patterns (basic regular expressions by default). -E uses extended and -F fixed-string patterns; -i ignores case; -v selects non-matching lines; -c counts, -l lists file names, -n numbers lines and -q is quiet. Exit status is 0 if a line was selected, 1 if none, and 2 on error.');
page('sed', 'stream editor', 'sed [-n] script [file...] | sed [-n] -e script [-e script]... [-f script_file]... [file...] | sed [-n] [-e script]... -f script_file [-f script_file]... [file...]',
    'Reads the input files, applies the editing commands of the script to each line in the pattern space, and writes the result to standard output. Commands include s (substitute), d, p, a, i, c, y, n, N, D, P, h, H, g, G, x, b, t, r, w, = and q. -n suppresses the default output.');
page('awk', 'pattern scanning and processing language', 'awk [-F sepstring] [-v assignment]... program [argument...] | awk [-F sepstring] -f progfile [-f progfile]... [-v assignment]... [argument...]',
    'Executes programs written in the awk language, specialised for text manipulation. Each input record is split into fields ($1, $2, ...) and matched against pattern { action } statements; BEGIN and END actions run before and after the input.');
page('cut', 'cut out selected fields of each line of a file', 'cut -b list [-n] [file...] | cut -c list [file...] | cut -f list [-d delim] [-s] [file...]',
    'Writes selected parts of each input line: bytes (-b), characters (-c) or delimiter-separated fields (-f, delimiter set by -d, default tab). list is a comma-separated list of numbers and ranges such as 1,3-5,7-.');
page('tr', 'translate characters', 'tr [-c|-C] [-s] string1 string2 | tr -s [-c|-C] string1 | tr -d [-c|-C] string1 | tr -ds [-c|-C] string1 string2',
    'Copies standard input to standard output, substituting or deleting selected characters. Characters in string1 are mapped to those in string2; -d deletes, -s squeezes repeats, -c complements string1. Ranges (a-z) and classes ([:alpha:]) are recognised.');
page('uniq', 'report or filter out repeated lines in a file', 'uniq [-c|-d|-u] [-f fields] [-s char] [input_file [output_file]]',
    'Reads the input, compares adjacent lines, and writes one copy of each run of identical lines. -c prefixes counts; -d writes only repeated lines; -u only unique ones; -f and -s skip leading fields and characters.');
page('sort', 'sort, merge, or sequence check text files', 'sort [-m] [-o output] [-bdfinru] [-t char] [-k keydef]... [file...] | sort [-c|-C] [-bdfinru] [-t char] [-k keydef] [file]',
    'Sorts the lines of all the named files together and writes the result to standard output. -n compares numerically, -r reverses, -u suppresses duplicates, -k selects sort keys, -t sets the field separator, -m merges sorted files and -c checks order.');
page('head', 'copy the first part of files', 'head [-n number] [file...] | head -c number [file...]',
    'Copies its input files to standard output, ending the output for each file at a designated point: the first number lines (default 10) or bytes.');
page('tail', 'copy the last part of a file', 'tail [-f] [-c number|-n number] [file]',
    'Copies its input to standard output beginning at a designated place: the last number lines (default 10), or with +number counted from the start. -c counts bytes; -f follows a growing file.');
page('wc', 'word, line, and byte or character count', 'wc [-c|-m] [-lw] [file...]',
    'Reads each input file and writes the number of newlines, words and bytes, followed by the file name. -l, -w, -c and -m select lines, words, bytes and characters. A total is written for multiple files.');
page('paste', 'merge corresponding or subsequent lines of files', 'paste [-s] [-d list] file...',
    'Concatenates corresponding lines of the input files, separated by tabs (or the characters of the -d list), and writes the result. -s pastes the lines of each file serially onto one line.');
page('tee', 'duplicate standard input', 'tee [-ai] [file...]',
    'Copies standard input to standard output, making a copy in each file. -a appends to the files instead of truncating them; -i ignores SIGINT.');
page('cmp', 'compare two files', 'cmp [-l|-s] file1 file2',
    'Compares two files byte by byte. Without options it writes the byte and line number of the first difference. -l lists every differing byte; -s writes nothing. Exit status 0 means identical, 1 different.');
page('comm', 'select or reject lines common to two files', 'comm [-123] file1 file2',
    'Reads two sorted files and writes three columns: lines only in file1, lines only in file2, and lines in both. -1, -2 and -3 suppress the corresponding column.');
page('diff', 'compare two files', 'diff [-c|-e|-f|-u|-C n|-U n] [-br] file1 file2',
    'Compares the contents of two files (or directories with -r) and writes a list of changes necessary to convert file1 into file2. -u and -c produce unified and context diffs; -e produces an ed script; -b ignores changes in white space.');
page('patch', 'apply changes to files', 'patch [-blNR] [-c|-e|-n|-u] [-d dir] [-D define] [-i patchfile] [-o outfile] [-p num] [-r rejectfile] [file]',
    'Reads a source file containing any of the diff output formats and applies the differences to the named or derived files. -p strips leading path components; -R reverses the patch; rejected hunks are written to file.rej.');
page('cksum', 'write file checksums and sizes', 'cksum [file...]',
    'Writes for each file its CRC-32 checksum (as defined by POSIX), its size in bytes and its name.');
page('fold', 'filter for folding lines', 'fold [-bs] [-w width] [file...]',
    'Breaks lines longer than width (default 80) columns. -b counts bytes rather than columns; -s breaks at the last blank within the width.');
page('join', 'relational database operator', 'join [-a file_number|-v file_number] [-e string] [-o list] [-t char] [-1 field] [-2 field] file1 file2',
    'Joins lines of two sorted files on a common field, writing one line for each pair with identical join fields. -1 and -2 select the join fields; -a also prints unpairable lines; -o selects output fields; -t sets the field separator.');
page('nl', 'line numbering filter', 'nl [-p] [-b type] [-d delim] [-f type] [-h type] [-i incr] [-l num] [-n format] [-s sep] [-v startnum] [-w width] [file]',
    'Reads lines from a file or standard input and writes them with line numbers. Logical pages have header, body and footer sections; -b selects which body lines are numbered (a all, t non-empty, n none, pBRE matching).');
page('printf', 'write formatted output', 'printf format [argument...]',
    'Writes the arguments to standard output under the control of format, as in the C printf function: %s, %d, %i, %o, %u, %x, %X, %c, %b, %e, %f, %g and %%, with flags, field width and precision. The format is reused until all arguments are consumed.');
page('echo', 'write arguments to standard output', 'echo [string...]',
    'Writes its arguments separated by single spaces and followed by a newline. XSI escape sequences such as \\n, \\t, \\c and \\0num in the strings are interpreted.');
page('split', 'split files into pieces', 'split [-l line_count] [-a suffix_length] [file [name]] | split -b n[k|m] [-a suffix_length] [file [name]]',
    'Reads a file and writes it in pieces of line_count lines (default 1000) or n bytes to files named name (default x) followed by aa, ab, ac and so on.');
page('csplit', 'split files based on context', 'csplit [-ks] [-f prefix] [-n number] file arg...',
    'Reads file and writes it to the files xx00, xx01, ... split at the lines given by the operands: line numbers, /regexp/[offset], %regexp%[offset] (skip) and {num} repetitions. Byte counts are written unless -s.');
page('strings', 'find printable strings in files', 'strings [-a] [-t format] [-n number] [file...]',
    'Writes sequences of at least four (or -n number) printable characters found in each file, typically binaries. -t prefixes each string with its offset in d, o or x format.');
page('expand', 'convert tabs to spaces', 'expand [-t tablist] [file...]',
    'Writes its input with tab characters replaced by the spaces needed to reach the next tab stop (every 8 columns, or as given by -t).');
page('unexpand', 'convert spaces to tabs', 'unexpand [-a|-t tablist] [file...]',
    'Writes its input with leading blanks (or all blanks with -a or -t) converted to tabs where possible.');
page('tsort', 'topological sort', 'tsort [file]',
    'Reads pairs of items from the input, each pair meaning the first precedes the second, and writes a totally ordered list consistent with the partial ordering. Cycles are reported.');
page('od', 'dump files in various formats', 'od [-v] [-A address_base] [-j skip] [-N count] [-t type_string]... [file...] | od [-bcdosx] [file] [[+]offset[.][b]]',
    'Writes the contents of its input files in the formats selected by -t (a, c, d, f, o, u, x with sizes) or the traditional -b, -c, -d, -o, -s and -x options, each line prefixed by its offset.');
page('pr', 'print files', 'pr [+page] [-column] [-adFmrt] [-e[char][gap]] [-h header] [-i[char][gap]] [-l lines] [-n[char][width]] [-o offset] [-s[char]] [-w width] [file...]',
    'Writes files paginated for printing: each page has a five-line header with date, file name and page number, and a five-line trailer. Options select multiple columns, merging, line numbering and page geometry.');
page('asa', 'interpret carriage-control characters', 'asa [file...]',
    'Writes its input with the FORTRAN carriage-control character of each line interpreted: space (single spacing), 0 (double), 1 (new page) and + (overprint).');
page('ed', 'edit text', 'ed [-p string] [-s] [file]',
    'A line-oriented text editor. Commands such as a, c, d, i, j, m, t, s, g, v, p, n, w, r, e and q operate on addressed lines of the buffer; addresses include numbers, ., $, /RE/, ?RE? and marks. -s suppresses byte counts and diagnostics.');
page('ex', 'text editor', 'ex [-rR] [-s|-v] [-c command] [-t tagstring] [-w size] [file...]',
    'The line-oriented mode of the vi editor: ex commands (with addresses) edit the buffer, and visual mode is entered with the vi command. Reads commands from standard input when it is not a terminal.');
page('vi', 'screen-oriented (visual) display editor', 'vi [-rR] [-c command] [-t tagstring] [-w size] [file...]',
    'A screen-oriented text editor based on ex. In command mode, keys move the cursor and operate on text; i, a and o enter insert mode and Escape leaves it. :w writes the file and :q quits.');
page('vim', 'Vi IMproved, a programmer\'s text editor', 'vim [options] [file...]',
    'A text editor upwards compatible with vi, with multi-level undo, syntax highlighting and visual selection. Opens the named files in the full-screen editor.');
page('more', 'display files on a page-by-page basis', 'more [-ceisu] [-n number] [-p command] [-t tagstring] [file...]',
    'Reads files and writes them to the terminal one screenful at a time, pausing after each. Space shows the next page, Return the next line, /pattern searches and q quits. When output is not a terminal the files are copied.');
page('m4', 'macro processor', 'm4 [-s] [-D name[=val]]... [-U name]... file...',
    'Reads its input and writes it with macros expanded. Built-in macros include define, undefine, ifdef, ifelse, include, incr, eval, len, index, substr, translit, dnl, divert and undivert.');
page('iconv', 'codeset conversion', 'iconv [-cs] -f frommap -t tomap [file...] | iconv -f fromcode [-cs] [-t tocode] [file...] | iconv -l',
    'Converts the encoding of characters in the input files from one codeset to another. -c omits characters that cannot be converted; -l lists the supported codesets.');
page('seq', 'print a sequence of numbers', 'seq [-f format] [-s string] [-w] [first [increment]] last',
    'Prints the numbers from first to last in steps of increment, one per line. -s sets the separator, -f a printf-style format and -w pads with leading zeros to equal width.');

// --- Shell and process control -----------------------------------------------
page(['sh', 'dash'], 'shell, the standard command language interpreter', 'sh [-abCefhimnuvx] [-o option]... [+abCefhimnuvx] [+o option]... [command_file [argument...]] | sh -c [-abCefhimnuvx] [-o option]... command_string [command_name [argument...]] | sh -s [-abCefhimnuvx] [-o option]... [argument...]',
    'The standard command language interpreter. It reads commands from a command string (-c), a file, or standard input, and executes them with parameter expansion, command substitution, arithmetic expansion, field splitting, pathname expansion, redirection, pipelines, lists and compound commands (if, case, while, until, for, functions).');
page('bash', 'GNU Bourne-Again SHell', 'bash [options] [command_string | file]',
    'An sh-compatible command language interpreter that executes commands read from the standard input or from a file. On this system it runs the POSIX shell.');
page('alias', 'define or display aliases', 'alias [alias-name[=string]...]',
    'Creates or redefines alias definitions, or writes the values of existing ones. With no operands, all aliases are written in a form suitable for re-input to the shell. A shell builtin.');
page('unalias', 'remove alias definitions', 'unalias alias-name... | unalias -a',
    'Removes the definition of each named alias, or all aliases with -a. A shell builtin.');
page('type', 'write a description of command type', 'type name...',
    'Indicates how each name would be interpreted if used as a command name: alias, keyword, function, special builtin, builtin or the pathname of a utility found in PATH.');
page('command', 'execute a simple command', 'command [-p] command_name [argument...] | command [-p][-v|-V] command_name',
    'Runs command_name, suppressing shell function lookup. -v writes the pathname or name the shell would use; -V writes a description like type; -p uses a default PATH guaranteed to find the standard utilities.');
page('hash', 'remember or report utility locations', 'hash [utility...] | hash -r',
    'Adds the location of each utility to the shell\'s list of remembered locations, or with no operands reports the remembered locations. -r forgets them all.');
page('read', 'read from standard input into shell variables', 'read [-r] var...',
    'Reads a line from standard input, splits it into fields as in the shell, and assigns the fields to the named variables, the last receiving the remainder. Backslash escapes the next character unless -r is given. Exit status is nonzero at end-of-file.');
page('getopts', 'parse utility options', 'getopts optstring name [arg...]',
    'Parses the positional parameters (or the args) as options according to optstring, placing the next option letter in name, its argument in OPTARG and the index of the next argument in OPTIND. Used in a while loop in shell scripts.');
page('test', 'evaluate expression', 'test [expression] | [ [expression] ]',
    'Evaluates the expression and indicates the result by its exit status: 0 for true, 1 for false, more than 1 for an error. Primaries test files (-e, -f, -d, -r, -w, -x, -s, -L, ...), strings (-z, -n, =, !=) and integers (-eq, -ne, -lt, -le, -gt, -ge); ! negates.');
pages[pages.length - 1].names.push('[');
page('true', 'return true value', 'true',
    'Does nothing, successfully: the exit status is 0.');
page('false', 'return false value', 'false',
    'Does nothing, unsuccessfully: the exit status is 1.');
page('expr', 'evaluate arguments as an expression', 'expr operand...',
    'Evaluates the expression formed by its arguments and writes the result. Operators include | & = > >= < <= != + - * / % and the regular-expression match operator :, with parentheses for grouping. Exit status is 1 if the result is null or zero.');
page('env', 'set the environment for command invocation', 'env [-i] [name=value]... [utility [argument...]]',
    'Obtains the current environment, modifies it according to its arguments, then invokes utility with the modified environment, or writes the environment if no utility is given. -i starts with an empty environment.');
page('sleep', 'suspend execution for an interval', 'sleep time',
    'Suspends execution for at least the number of seconds given by time.');
page('time', 'time a simple command', 'time [-p] utility [argument...]',
    'Invokes utility and, when it completes, writes to standard error the elapsed (real), user and system times. -p uses the portable "real %f\\nuser %f\\nsys %f" format.');
page('timeout', 'execute a command with a time limit', 'timeout [-fp] [-k time] [-s signal] duration utility [argument...]',
    'Runs utility and sends it a signal (TERM by default) if it is still running after duration. -k sends KILL if it is still running a further time after the first signal. Exit status 124 means the time limit was reached.');
page('nohup', 'invoke a utility immune to hangups', 'nohup utility [argument...]',
    'Invokes utility with SIGHUP ignored. If standard output is a terminal it is appended to nohup.out in the current directory (or $HOME/nohup.out).');
page('nice', 'invoke a utility with an altered nice value', 'nice [-n increment] utility [argument...]',
    'Invokes utility with its nice value increased by increment (default 10). Only the superuser may lower the nice value.');
page('renice', 'set nice values of running processes', 'renice [-g|-p|-u] -n increment ID...',
    'Changes the nice value of running processes, process groups (-g) or all processes of users (-u) by increment. Only the superuser may lower nice values.');
page('kill', 'terminate or signal processes', 'kill -s signal_name pid... | kill -l [exit_status] | kill [-signal_name] pid... | kill [-signal_number] pid...',
    'Sends a signal (TERM by default) to the processes or job IDs (%n) given as operands. -l lists the signal names. A process ID of 0 means the process group of the sender.');
page('ps', 'report process status', 'ps [-aA] [-defl] [-g grouplist] [-G grouplist] [-n namelist] [-o format]... [-p proclist] [-t termlist] [-u userlist] [-U userlist]',
    'Writes information about processes. By default, processes associated with the current terminal and user are shown. -A or -e selects all processes; -f and -l give full and long listings; -o selects the output columns.');
page('jobs', 'display status of jobs in the current session', 'jobs [-l|-p] [job_id...]',
    'Writes the status of the jobs the shell has started in the background or stopped. -l adds process IDs; -p writes only process group IDs.');
page('fg', 'run jobs in the foreground', 'fg [job_id]',
    'Moves a background or stopped job to the foreground, making it the current job, and continues it. Without job_id the current job is used.');
page('bg', 'run jobs in the background', 'bg [job_id...]',
    'Resumes each suspended job in the background, as if it had been started with &.');
page('wait', 'await process completion', 'wait [pid...]',
    'Waits until the given processes or jobs terminate and returns the exit status of the last one. With no operands it waits for all known child processes.');
page('umask', 'get or set the file mode creation mask', 'umask [-S] [mask]',
    'Sets the file mode creation mask of the current shell to mask (octal or symbolic). With no operand, writes the current mask; -S writes it in symbolic form.');
page('times', 'write process times', 'times',
    'Writes the accumulated user and system times for the shell and for all of its child processes.');
page('ulimit', 'report or set resource limits', 'ulimit [-H|-S] -a | ulimit [-H|-S] [-cdfnstv] [limit]',
    'Reports or sets the resource limits in effect for the shell and its children: -f file size, -n open files, -c core size, -s stack, -t CPU time and others. -H and -S select hard and soft limits.');
page('fc', 'process the command history list', 'fc [-r] [-e editor] [first [last]] | fc -l [-nr] [first [last]] | fc -s [old=new] [first]',
    'Lists (-l), edits and re-executes (-e), or re-executes with substitution (-s) commands from the shell\'s history list.');
page('xargs', 'construct argument lists and invoke utility', 'xargs [-ptx] [-E eofstr] [-I replstr|-L number|-n number] [-s size] [utility [argument...]]',
    'Reads blank- or newline-separated arguments from standard input and invokes utility (default echo) one or more times with those arguments appended. -n limits arguments per invocation; -I replaces replstr in the arguments; -t traces commands.');
page('fuser', 'list process IDs of all processes that have one or more files open', 'fuser [-cfu] file...',
    'Writes the process IDs of the processes using each file, with a letter for the kind of use. -u adds the login name of each process\'s owner; -c treats the file as a mount point.');

// --- Users, terminals and communication ----------------------------------------
page('id', 'return user identity', 'id [user] | id -G [-n] [user] | id -g [-nr] [user] | id -u [-nr] [user]',
    'Writes the user and group IDs and names of the invoking process or of user. -u, -g and -G restrict the output to the user ID, group ID or all group IDs; -n writes names; -r real IDs.');
page('whoami', 'print effective user name', 'whoami',
    'Writes the user name associated with the current effective user ID.');
page('logname', 'return the user\'s login name', 'logname',
    'Writes the login name of the user who started the session.');
page('who', 'display who is on the system', 'who [-mTu] [-abdHlprt] [file] | who [-mu] -s [-bHlprt] [file] | who -q [file] | who am i',
    'Lists users currently logged in: name, terminal line and login time. -H prints headings; -q lists names and a count; -b shows the last boot time; am i reports the invoking terminal only.');
page('tty', 'return user\'s terminal name', 'tty [-s]',
    'Writes the name of the terminal open on standard input, or "not a tty". -s only sets the exit status.');
page('mesg', 'permit or deny messages', 'mesg [y|n]',
    'Controls whether other users may write to your terminal with write or talk by changing its group write permission. With no operand reports the current state ("is y" or "is n").');
page('write', 'write to another user', 'write user_name [terminal]',
    'Reads lines from standard input and writes them to the terminal of user_name, preceded by a header identifying the sender. The recipient must permit messages (mesg y).');
page('talk', 'talk to another user', 'talk address [terminal]',
    'A two-way, screen-oriented communication program: what each user types appears on the other\'s terminal. The other user must answer the request and permit messages.');
page('newgrp', 'change to a new group', 'newgrp [-l] [group]',
    'Starts a new shell with the real and effective group ID changed to group, which the user must be a member of (or know its password). Without an operand the group is reset to the login group.');
page('uname', 'return system name', 'uname [-amnrsv]',
    'Writes the name of the operating system implementation (-s, the default), the node name (-n), release (-r), version (-v) and hardware type (-m); -a writes all of them.');
page('date', 'write the date and time', 'date [-u] [+format] | date [-u] mmddhhmm[[cc]yy]',
    'Writes the current date and time. A +format operand selects the output with conversion specifications such as %Y, %m, %d, %H, %M, %S, %a and %b. -u uses Coordinated Universal Time.');
page('cal', 'print a calendar', 'cal [[month] year]',
    'Writes a calendar for the current month, a given month of a year, or a whole year.');
page('bc', 'arbitrary-precision arithmetic language', 'bc [-l] [file...]',
    'An interactive processor for a language of arbitrary-precision arithmetic, with variables, arrays, functions, if/while/for and the scale, ibase and obase registers. -l loads the math library (s, c, a, l, e, j).');
page('getconf', 'get configuration values', 'getconf [-v specification] system_var | getconf [-v specification] path_var pathname | getconf -a',
    'Writes the value of a system configuration variable (such as ARG_MAX, CHILD_MAX, PAGESIZE) or of a pathname variable (such as NAME_MAX, PATH_MAX) for the given path.');
page('locale', 'get locale-specific information', 'locale [-a|-m] | locale [-ck] name...',
    'Writes information about the current locale environment (LANG, LC_*), the available locales (-a) or charmaps (-m), or the values of locale keywords and categories.');
page('localedef', 'define locale environment', 'localedef [-c] [-f charmap] [-i sourcefile] [-u code_set_name] name',
    'Converts locale source definitions into a locale database usable by setlocale(), stored as name.');
page('logger', 'log messages', 'logger string...',
    'Saves its arguments as a message in the system log, tagged with the invoking user name.');
page('stty', 'set the options for a terminal', 'stty [-a|-g] | stty operand...',
    'Sets or reports terminal I/O characteristics for the device on standard input: speeds, control characters (intr, erase, kill, eof), and input, output, control and local modes such as echo and icanon.');
page('tabs', 'set terminal tabs', 'tabs [-n|-a|-a2|-c|-c2|-c3|-f|-p|-s|-u] [+m[n]] [-T type] | tabs [-T type] [+m[n]] n1[,n2,...]',
    'Sets tab stops on the user\'s terminal, every n columns (default 8) or at the listed columns, or to a canned format for a programming language.');
page('tput', 'change terminal characteristics', 'tput [-T type] clear | tput [-T type] init | tput [-T type] reset',
    'Uses the terminfo database to make terminal-dependent capabilities available to the shell: clear the screen, initialise or reset the terminal.');
page('clear', 'clear the terminal screen', 'clear',
    'Clears the terminal screen and moves the cursor to the top left corner.');
page('mail', 'read and manage system messages', 'mail [message-number]',
    'Lists the operator\'s incoming messages and assignments, or displays the given message.');
page('mailx', 'process messages', 'mailx [-s subject] address... | mailx -e | mailx [-HiNn] [-F] [-u user] | mailx -f [-HiNn] [-F] [file]',
    'Sends mail to the addresses (send mode), reading the message body from standard input; -s sets the subject, -c and -b carbon copies. In receive mode it reads the system mailbox or file: a header summary is written and commands (p, d, h, s, q, x) are read from standard input. -e only tests whether mail is present.');
page('man', 'display system documentation', 'man [-k] [-f] [-w] [-a] [-s section] [section] name...',
    'Writes the manual page for each name. A section number restricts the search to that section of the manual. -k searches the page names and summaries for keywords (as apropos); -f writes the summary line (as whatis); -w writes the location of the page. Exit status 16 means a page was not found.');
page('apropos', 'search the manual page names and descriptions', 'apropos [-e|-r] [-a] keyword...',
    'Searches the short descriptions and names of the manual pages for each keyword, taken as a regular expression matched case-insensitively, and writes the matching summary lines. -e matches exact words; -a requires all keywords to match.');
page('whatis', 'display one-line manual page descriptions', 'whatis [-s section] name...',
    'Writes the one-line summary of each manual page whose name matches name exactly.');

// --- Scheduling, printing and UUCP ----------------------------------------------
page(['at', 'batch', 'atq', 'atrm'], 'queue, examine, or delete jobs for later execution', 'at [-m] [-f file] [-q queuename] -t time_arg | at [-m] [-f file] [-q queuename] timespec... | at -r at_job_id... | at -l [-q queuename] | at -c at_job_id... | atq [-q queuename] | atrm at_job_id... | batch [-m] [-f file] [-q queuename]',
    'at reads commands from standard input (or -f file) and queues them for execution by sh at a later time; batch queues them for when the system load permits. Times are given as HH:MM, HHMM, noon, midnight or teatime, optionally followed by a date (today, tomorrow, a weekday, month day [year], MM/DD/YY) and an increment such as now + 2 hours. atq (at -l) lists queued jobs, atrm (at -r) removes them and at -c prints a job. The job number and time are written to standard error.');
page('crontab', 'schedule periodic background work', 'crontab [-u user] [file] | crontab [-u user] -e | -l | -r',
    'Creates, replaces, edits, lists or removes the user\'s crontab file, which lists commands to run at regular times (see crontab(5)). A file operand of - reads standard input. -e edits the crontab with $VISUAL or $EDITOR; -l lists it; -r removes it. Invalid entries are reported and the table is not installed.');
page('lp', 'send files to a printer', 'lp [-c] [-d dest] [-n copies] [-msw] [-o option]... [-t title] [file...]',
    'Submits files (or standard input) to a print queue and writes the request ID, such as "request id is lp-1 (1 file(s))". -d selects the destination (default LPDEST, PRINTER or the system default); -n sets the number of copies; -t a banner title; -c copies the files at submission; -s suppresses messages.');
page('lpstat', 'print printer and job status information', 'lpstat [-dlrRst] [-a [destination...]] [-o [destination...]] [-p [printer...]] [-u [user...]] [-v [printer...]]',
    'Writes status information about the print system: queued requests (default, or -o), printers (-p), destinations accepting requests (-a), the default destination (-d), scheduler state (-r), devices (-v), a summary (-s) or everything (-t).');
page('cancel', 'cancel print requests', 'cancel [-a] [-u user] [request-ID...] [destination...]',
    'Cancels print requests: the requests named by request-ID, the current request on each named destination, all of the user\'s requests (-a), or all requests of a user (-u).');
page('uucp', 'system-to-system copy', 'uucp [-cCdfjmr] [-n user] [-g grade] source-file... destination-file',
    'Copies files between systems. A file name of the form system!path names a file on a remote system listed in /etc/uucp/sys; a plain path is local. Remote transfers are queued in /var/spool/uucp; local copies are made at once. -j writes the job ID; -m mails the requester on completion; -n notifies a remote user; -r queues the job without starting a transfer; -C copies the source to the spool.');
page('uux', 'remote command execution', 'uux [-jnp] [-g grade] command-string',
    'Gathers files from various systems, then executes a command on a specified system. The command string is a command name prefixed by system! and arguments; arguments of the form system!file name files. Commands for the local system run at once; others are queued for transmission. -p or - reads standard input for the command; -j writes the job ID; -n suppresses notification.');
page('uustat', 'uucp status inquiry and job control', 'uustat [-q|-k jobid|-r jobid] | uustat [-s system] [-u user]',
    'Writes the status of, or cancels, previously specified uucp and uux requests. With no options, the invoking user\'s queued jobs are listed. -a lists all jobs; -s and -u restrict the listing to a system or user; -q summarises the queue per system; -k kills a job; -r rejuvenates it.');

// --- Archives and compression ------------------------------------------------------
page('tar', 'an archiving utility', 'tar -c|-r|-t|-u|-x [-vfzmop] [archive] [file...]',
    'Saves and restores files to and from a tape archive. -c creates an archive, -t lists it, -x extracts it, -r appends and -u updates; -f names the archive file; -v is verbose; -z filters through gzip.');
page('pax', 'portable archive interchange', 'pax [-dv] [-c|-n] [-f archive] [-s replstr]... [pattern...] | pax -r [-cdiknuv] [-f archive] [-o options]... [-p string]... [-s replstr]... [pattern...] | pax -w [-dituvX] [-b blocksize] [-a] [-f archive] [-o options]... [-s replstr]... [-x format] [file...] | pax -r -w [-diklntuvX] [-p string]... [-s replstr]... [file...] directory',
    'Reads, writes and lists the members of an archive file (ustar, pax or cpio formats), and copies directory hierarchies. Without -r or -w, lists the archive contents.');
page('cpio', 'copy files to and from archives', 'cpio -o [-aBcLv] | cpio -i [-BcdfmrtuvS] [pattern...] | cpio -p [-adlLmuv] directory',
    'Copy-out mode (-o) reads file names from standard input and writes an archive; copy-in mode (-i) extracts files from an archive; pass mode (-p) copies files into a directory tree.');
page('ar', 'create and maintain library archives', 'ar -d [-v] archive file... | ar -p [-v][-s] archive [file...] | ar -q [-cv] archive file... | ar -r [-cuv] [-a|-b|-i posname] archive file... | ar -t [-v][-s] archive [file...] | ar -x [-v][-sCT] archive [file...]',
    'Creates and maintains groups of files combined into an archive, typically object-file libraries: delete (-d), print (-p), quick append (-q), replace (-r), table of contents (-t) and extract (-x).');
page('compress', 'compress data', 'compress [-fv] [-b bits] [file...] | compress [-cfv] [-b bits] [file]',
    'Reduces the size of files with adaptive Lempel-Ziv coding, replacing each file with file.Z. -c writes to standard output; -b sets the maximum code width; -f forces compression.');
page('uncompress', 'expand compressed data', 'uncompress [-cfv] [file...]',
    'Restores files compressed by compress, removing the .Z suffix. -c writes to standard output.');
page('zcat', 'expand and concatenate data', 'zcat [file...]',
    'Writes the uncompressed form of compressed files to standard output, as uncompress -c.');
page('gzip', 'compress or expand files', 'gzip [-cdfklnNqrtv1-9] [-S suffix] [file...]',
    'Reduces the size of files with Lempel-Ziv (LZ77) coding, replacing each with file.gz. -d decompresses; -c writes to standard output; -k keeps the input; -1 to -9 trade speed for compression.');
page('gunzip', 'expand gzip-compressed files', 'gunzip [-cfkNqrtv] [-S suffix] [file...]',
    'Restores files compressed by gzip (or compress), removing the .gz suffix. -c writes to standard output; -t tests integrity.');
page('uuencode', 'encode a binary file', 'uuencode [-m] [file] decode_pathname',
    'Writes an encoded version of the file (or standard input) using only printable characters, with a header naming decode_pathname. -m uses Base64 encoding.');
page('uudecode', 'decode a binary file', 'uudecode [-o outfile] [file]',
    'Reads a file encoded by uuencode and recreates the original file with the pathname and mode given in its header, or outfile.');
page('dd', 'convert and copy a file', 'dd [operand...]',
    'Copies its input to its output with possible conversions, controlled by operands such as if=file, of=file, bs=n, ibs=n, obs=n, count=n, skip=n, seek=n and conv=ucase,lcase,swab,notrunc,sync.');

// --- Programming ---------------------------------------------------------------------
page('make', 'maintain, update, and regenerate groups of programs', 'make [-einpqrst] [-f makefile]... [-k|-S] [macro=value...] [target_name...]',
    'Reads a makefile of targets, prerequisites and commands, and runs the commands needed to bring each target up to date with respect to its prerequisites, using modification times. Supports macros, inference rules and the special targets .PHONY, .SUFFIXES and .DEFAULT.');
page(['c17', 'gcc'], 'compile standard C programs', 'c17 [options...] pathname [[pathname] [-I directory] [-L directory] [-l library]]...',
    'The interface to the C compilation system: compiles C source files (.c) and links them with object files and libraries into an executable (a.out or -o outfile). -c compiles only; -D and -U define macros; -O optimises; -g adds debugging information.');
page('lex', 'generate programs for lexical tasks', 'lex [-t] [-n|-v] [file...]',
    'Reads a specification of regular expressions and actions and generates a C program, lex.yy.c, that recognises them (a lexical analyser). -t writes to standard output.');
page('yacc', 'yet another compiler compiler', 'yacc [-dltv] [-b file_prefix] [-p sym_prefix] grammar',
    'Reads a description of a context-free grammar with actions and writes a C parser, y.tab.c, implementing it. -d writes the y.tab.h header of token definitions; -v writes a description of the parsing tables to y.output.');
page('nm', 'write the name list of an object file', 'nm [-APv] [-g|-u] [-t format] file...',
    'Writes the symbol table of each object file or library: names, types (T text, D data, B bss, U undefined, ...) and values. -g writes external symbols only; -u undefined symbols only; -P uses the portable format.');
page('strip', 'remove unnecessary information from strippable files', 'strip file...',
    'Removes the symbol table, debugging information and line numbers from object files and executables, reducing their size.');
page('ctags', 'create a tags file', 'ctags [-a] [-f tagsfile] pathname... | ctags -x pathname...',
    'Writes a tags file locating the function, macro and type definitions in C (and other) source files, for use by ex and vi. -x writes a cross-reference listing to standard output.');
page('cflow', 'generate a C-language flowgraph', 'cflow [-r] [-d num] [-D name[=def]]... [-i incl] [-I dir]... [-U dir]... file...',
    'Analyses C source files and writes a graph of external function references: which functions call which. -r reverses the graph (callers of each function); -d limits the depth.');
page('cxref', 'generate a C-language program cross-reference table', 'cxref [-cs] [-o file] [-w num] [-D name[=def]]... [-I dir]... [-U name]... file...',
    'Analyses C source files and writes a cross-reference table of every symbol: the files and line numbers where it is defined and referenced.');
page('gencat', 'generate a formatted message catalog', 'gencat catfile msgfile...',
    'Merges the message text source files into a formatted message catalog catfile for use by catopen() and catgets().');
page('gettext', 'retrieve text string from messages object', 'gettext [-d textdomain] [-e] [-n] [-s] [textdomain] msgid',
    'Retrieves the translation of msgid from the message catalog of the text domain for the current locale and writes it, or msgid itself if there is no translation.');
page('ngettext', 'retrieve text string from messages object with plural form', 'ngettext [-d textdomain] [-e] [textdomain] msgid msgid_plural n',
    'Retrieves the translation of msgid or msgid_plural appropriate for the count n from the message catalog of the text domain.');
page('msgfmt', 'create messages objects from portable messages object files', 'msgfmt [-c] [-D dir]... [-o outfile] pofile...',
    'Compiles portable object (.po) message files into binary message objects for use by gettext. -c checks the format strings; -o names the output file.');
page('xgettext', 'extract gettext call strings', 'xgettext [-ajns] [-c tag] [-d default_domain] [-k keyword]... [-o outfile] [-p pathname] [-X exclude_file] file...',
    'Extracts the translatable strings (arguments of gettext and similar calls) from C and shell source files and writes them as a portable object template.');
page('ipcrm', 'remove an XSI message queue, semaphore set, or shared memory segment identifier', 'ipcrm [-q msgid|-Q msgkey|-s semid|-S semkey|-m shmid|-M shmkey]...',
    'Removes the XSI interprocess communication objects (message queues, semaphore sets, shared memory segments) given by ID or key.');
page('ipcs', 'report XSI interprocess communication facilities status', 'ipcs [-qms] [-a|-bcopt]',
    'Writes information about the active message queues (-q), shared memory segments (-m) and semaphore sets (-s).');
page('what', 'identify SCCS files', 'what [-s] file...',
    'Searches the files for the SCCS identification pattern @(#) and writes the text that follows it, up to a quote, >, newline, backslash or NUL. -s stops after the first occurrence in each file.');
page('sccs', 'front end for the SCCS subsystem', 'sccs [-r] [-d path] [-p path] command [options...] [operands...]',
    'A front end to the SCCS programs (admin, get, delta, prs, ...) that looks for s. files in an SCCS subdirectory and adds pseudo-commands such as edit, create, delget and info.');
page('admin', 'create and administer SCCS files', 'admin -i[name] [-n] [-a login] [-d flag] [-e login] [-f flag] [-m mrlist] [-r rel] [-t[name]] [-y[comment]] newfile | admin -n [-a login] [-d flag] [-e login] [-f flag] [-m mrlist] [-t[name]] [-y[comment]] newfile... | admin [-a login] [-d flag] [-m mrlist] [-r rel] [-t[name]] file... | admin -h file... | admin -z file...',
    'Creates new SCCS files (s.name) and changes their parameters: flags, authorised users, descriptive text. -h checks the file\'s structure; -z recomputes its checksum.');
page('get', 'get a version of an SCCS file', 'get [-begkmnlLpst] [-c cutoff] [-i list] [-r SID] [-x list] file...',
    'Generates a text file from each SCCS file according to the requested SID (default the latest). -e retrieves it for editing (later delta); -p writes to standard output; -k suppresses keyword expansion.');
page('delta', 'make a delta (change) to an SCCS file', 'delta [-nps] [-g list] [-m mrlist] [-r SID] [-y[comment]] file...',
    'Permanently introduces into the SCCS file the changes made to the file retrieved by get -e, creating a new delta (version) with a comment.');
page('prs', 'print an SCCS file', 'prs [-a] [-d dataspec] [-r[SID]] file... | prs [-a] [-c cutoff] [-d dataspec] [-e|-l] file...',
    'Writes part or all of an SCCS file in a user-supplied format (-d) or a default format describing each delta.');
page('rmdel', 'remove a delta from an SCCS file', 'rmdel -r SID file...',
    'Removes the delta specified by SID from each SCCS file, provided it is the latest on its branch and not checked out for editing.');
page('sact', 'print current SCCS file-editing activity', 'sact file...',
    'Writes, for each SCCS file, the deltas being edited: the SID retrieved, the new SID, the user and the date of the get -e.');
page('unget', 'undo a previous get of an SCCS file', 'unget [-ns] [-r SID] file...',
    'Reverses the effect of a get -e done before a delta was made, removing the lock and (unless -n) the retrieved file.');
page('val', 'validate SCCS files', 'val - | val [-s] [-m name] [-r SID] [-y type] file...',
    'Checks whether each file is an SCCS file meeting the characteristics given by the options, writing a diagnostic and setting the exit status bits for each failure.');

// --- Network and game programs -----------------------------------------------------
page('scp', 'secure copy (remote file copy program)', 'scp [-pr] [[user@]host1:]file1 ... [[user@]host2:]file2',
    'Copies files between hosts on the network. Files on remote hosts are written as host:path. -r copies directories recursively; -p preserves modes and times.');
page('ssh', 'remote login client', 'ssh [user@]hostname',
    'Connects to and logs into the specified host, switching the terminal to a shell on the remote system.');
page('check-comms', 'synchronize with network nodes', 'check-comms',
    'Forces a synchronization with the network nodes, fetching pending transmissions and assignments.');
page('compile', 'compile a program', 'compile file',
    'Compiles the named source file with the built-in toolchain and reports the result.');
page('scheme', 'Scheme language interpreter', 'scheme [file]',
    'Evaluates programs written in a dialect of the Lisp language Scheme, from a file or interactively.');
page('asm', 'RISC-V assembly simulator', 'asm [file]',
    'Assembles and runs RISC-V assembly language programs on a simulated processor, showing registers and memory as the program executes.');
page('settings', 'open the terminal settings', 'settings',
    'Opens the terminal options screen: theme, font size and other preferences.');
page('tutor', 'typing tutor', 'tutor [lesson]',
    'Starts the interactive typing and command-line lessons.');

// --- File formats --------------------------------------------------------------------
pages.push({
    names: ['crontab'],
    section: '5',
    summary: 'tables for driving cron',
    synopsis: [],
    description: [
        'A crontab file contains instructions for the cron daemon of the general form: run this command at this time on this date. Each user has their own crontab, installed with crontab(1). Blank lines, leading spaces and tabs are ignored, and lines whose first non-space character is # are comments.',
        'An active line is either an environment setting of the form name = value, or a cron command made of five time and date fields followed by the command: minute (0-59), hour (0-23), day of month (1-31), month (1-12 or names) and day of week (0-7, 0 or 7 is Sunday, or names). A field may be an asterisk, a number, a range (8-11), a list (1,2,5,9) or a step (*/2 or 0-23/2).',
        'Instead of the five fields one of these special strings may appear: @reboot, @yearly (or @annually), @monthly, @weekly, @daily (or @midnight) and @hourly.',
    ],
});

export const MANUAL_PAGES: readonly ManualPage[] = pages;

/** Location of a page's source file, as man -w reports it. */
export function manualPath(p: ManualPage): string {
    return `/usr/share/man/man${p.section.charAt(0)}/${p.names[0]}.${p.section}.gz`;
}
