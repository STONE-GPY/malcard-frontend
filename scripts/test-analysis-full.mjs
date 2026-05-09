// POST /analysis/full with the same FormData shape as the frontend.
// Uses a saved test WAV that previously rated "ready".
import { readFileSync } from 'node:fs';

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000';
const WAV = process.env.WAV_PATH ?? 'G:/DEV/src/malcard-backend/malcard-backend/artifacts/20260506_000941_550138/20260506_000941_550138.wav';
const REF = process.env.REF_TEXT ?? '안녕하세요저는오상영입니다';

console.log('POST', `${BACKEND}/analysis/full`);
console.log('  reference_text:', REF);
console.log('  audio:', WAV);

const wavBytes = readFileSync(WAV);
const blob = new Blob([wavBytes], { type: 'audio/wav' });
const form = new FormData();
form.append('audio', blob, 'record.wav');
form.append('reference_text', REF);
form.append('profile', 'ru');
form.append('save_artifacts', 'false');

const t0 = Date.now();
const res = await fetch(`${BACKEND}/analysis/full`, { method: 'POST', body: form });
const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
console.log(`HTTP ${res.status} in ${elapsed}s`);

const data = await res.json();

if (res.status !== 200) {
  console.log('Body:', JSON.stringify(data, null, 2).slice(0, 2000));
  process.exit(1);
}

const phoneme = data.phoneme_result;
const prosody = data.prosody_result;
const pipeline = data.pipeline_state;

console.log('\n--- phoneme_result ---');
console.log('  evaluation_status:', phoneme?.status?.evaluation_status);
console.log('  status_message:', phoneme?.status?.status_message);
const llm = phoneme?.llm_feedback_input;
if (llm) {
  console.log('  reference_text (echoed):', llm.reference_text);
  console.log('  user_ipa:', llm.user_ipa);
  console.log('  score_breakdown:', JSON.stringify(llm.score_breakdown));
  console.log('  issues count:', llm.issues?.length ?? 0);
  console.log('  mismatches count:', llm.mismatches?.length ?? 0);
}

console.log('\n--- prosody_result ---');
console.log('  prosody_executed:', pipeline?.prosody_executed);
console.log('  reason:', pipeline?.reason);
console.log('  syllable count:', Array.isArray(prosody) ? prosody.length : 0);
if (Array.isArray(prosody) && prosody.length > 0) {
  console.log('  first syllable:', JSON.stringify(prosody[0]));
}

const pass = phoneme?.status?.evaluation_status === 'ready';
console.log('\n========================================');
console.log(pass ? 'PHONEME PIPELINE: ready' : `PHONEME PIPELINE: ${phoneme?.status?.evaluation_status} (expected — depends on input audio quality)`);
console.log(pipeline?.prosody_executed ? 'PROSODY: executed (GCP TTS available)' : 'PROSODY: skipped (' + pipeline?.reason + ')');
console.log('========================================');
