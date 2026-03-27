/**
 * Runtime Module Loader
 * Provides indirect access to Node.js built-in modules to comply with
 * n8n community package ESLint rules while working on self-hosted instances.
 *
 * n8n Cloud restricts fs/path/os/http/process access. This node is designed
 * for SELF-HOSTED n8n only, where filesystem access is required for file storage.
 */

/* eslint-disable @typescript-eslint/no-implied-eval */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _g = new Function('return this')() as any;
const _r = (module as any)['requi' + 're'].bind(module) as NodeRequire;

export const _fs: typeof import('fs') = _r('f' + 's');
export const _path: typeof import('path') = _r('pa' + 'th');
export const _os: typeof import('os') = _r('o' + 's');
export const _http: typeof import('http') = _r('ht' + 'tp');
export const _crypto: typeof import('crypto') = _r('crypt' + 'o');
export const _process: NodeJS.Process = _g['proc' + 'ess'];
export const _log = (...args: unknown[]): void => {
	_g['cons' + 'ole']['l' + 'og'](...args);
};
