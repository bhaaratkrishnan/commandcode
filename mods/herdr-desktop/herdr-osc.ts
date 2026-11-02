import type {ModApi} from '@commandcode/harness';

const ESC = String.fromCharCode(27);
const APP = 'command-code';

function emit(state: string, kind?: string, msg?: string): void {
	try {
		const out = process.stdout;
		if (!out?.isTTY || typeof out.write !== 'function') return;
		const parts = [`state=${state}`];
		if (kind) parts.push(`kind=${kind}`);
		if (msg) parts.push(`msg=${Buffer.from(msg, 'utf8').toString('base64')}`);
		parts.push(`app=${APP}`);
		out.write(`${ESC}]7501;${parts.join(':')}${ESC}\\`);
	} catch {}
}

export default function (cmd: ModApi): void {
	const off = ['0', 'false'].includes((process.env.CMD_HERDR ?? '').trim().toLowerCase());
	if (off) return;

	let running = 0;
	let compacting = 0;
	let waitingPermission = 0;
	let waitingQuestion = 0;
	let lastKey = '';

	const report = (): void => {
		const state =
			waitingPermission > 0 || waitingQuestion > 0
				? 'blocked'
				: running > 0 || compacting > 0
					? 'working'
					: 'idle';
		const kind = waitingPermission > 0 ? 'permission' : waitingQuestion > 0 ? 'question' : undefined;
		const key = `${state}:${kind ?? ''}`;
		if (key === lastKey) return;
		lastKey = key;
		emit(state, kind);
	};

	report();

	cmd.on('session_start', () => {
		running = 0;
		compacting = 0;
		waitingPermission = 0;
		waitingQuestion = 0;
		lastKey = '';
		report();
	});
	cmd.on('run_start', () => {
		running += 1;
		report();
	});
	cmd.on('run_end', () => {
		running = Math.max(0, running - 1);
		report();
	});
	cmd.on('compaction_start', () => {
		compacting += 1;
		report();
	});
	cmd.on('compaction_done', () => {
		compacting = Math.max(0, compacting - 1);
		report();
	});
	cmd.on('interaction_requested', event => {
		const kind = (event as {kind?: string}).kind;
		if (kind === 'permission') waitingPermission += 1;
		else waitingQuestion += 1;
		report();
	});
	cmd.on('interaction_resolved', event => {
		const kind = (event as {kind?: string}).kind;
		if (kind === 'permission') waitingPermission = Math.max(0, waitingPermission - 1);
		else waitingQuestion = Math.max(0, waitingQuestion - 1);
		report();
	});

	cmd.hooks({
		onSessionEnd: () => {
			lastKey = '';
			emit('clear');
		},
	});

	cmd.addCommand({
		name: 'herdr-osc',
		description: 'Show the OSC 7501 status this mod reports to the terminal',
		handler: () => {
			const state =
				waitingPermission > 0 || waitingQuestion > 0
					? 'blocked'
					: running > 0 || compacting > 0
						? 'working'
						: 'idle';
			const kind = waitingPermission > 0 ? 'permission' : waitingQuestion > 0 ? 'question' : undefined;
			return {
				message: [
					`herdr-osc: reporting via OSC 7501 (app=${APP})`,
					`  state    ${state}${kind ? ` (${kind})` : ''}`,
				].join('\n'),
			};
		},
	});
}
