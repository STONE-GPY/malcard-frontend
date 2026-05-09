// Rerun /analysis/full against the user's last recorded wav so the dev panel
// shows fresh real-backend output without needing the user to re-record.
import { readFileSync } from 'node:fs';

const WAV = process.argv[2] ?? 'G:/DEV/src/malcard-backend/malcard-backend/artifacts/20260509_214821_523486/20260509_214821_523486.wav';
const REF = process.argv[3] ?? '어디서 내려요?';

const form = new FormData();
form.append('audio', new Blob([readFileSync(WAV)], { type: 'audio/wav' }), 'record.wav');
form.append('reference_text', REF);
form.append('profile', 'ru');
form.append('save_artifacts', 'false');

const t0 = Date.now();
const res = await fetch('http://127.0.0.1:8000/analysis/full', { method: 'POST', body: form });
console.log(`HTTP ${res.status} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
const data = await res.json();

const llm = data.phoneme_result?.llm_feedback_input;
console.log('\nIssues:', JSON.stringify(llm?.issues, null, 2));
console.log('\nScore:', llm?.score_breakdown?.overall);
