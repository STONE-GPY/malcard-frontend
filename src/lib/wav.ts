// MediaRecorder produces webm/opus on Chrome/Edge and mp4 on Safari, neither
// of which the backend's prosody pipeline (parselmouth/Praat) can read.
// Decode the recorded blob via the Web Audio API and re-encode as 16 kHz
// mono PCM WAV — the format the backend natively understands.

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

function getAudioContextCtor(): typeof AudioContext {
  const Ctx =
    window.AudioContext ??
    (window as WindowWithWebkitAudio).webkitAudioContext;
  if (!Ctx) throw new Error('AudioContext unsupported in this browser');
  return Ctx;
}

export async function blobToWav(
  blob: Blob,
  targetSampleRate = 16000,
): Promise<Blob> {
  const arrayBuf = await blob.arrayBuffer();

  const Ctx = getAudioContextCtor();
  const decodeCtx = new Ctx();
  let decoded: AudioBuffer;
  try {
    // decodeAudioData mutates the buffer on some implementations — pass a copy.
    decoded = await decodeCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    decodeCtx.close().catch(() => undefined);
  }

  // Mix down to mono (average across channels) and resample to targetSampleRate.
  const targetLen = Math.max(1, Math.ceil(decoded.duration * targetSampleRate));
  const offline = new OfflineAudioContext(1, targetLen, targetSampleRate);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();

  return encodeWavMono16(rendered.getChannelData(0), targetSampleRate);
}

// Encode raw mic-captured Float32 PCM (at the capture sample rate) to a 16 kHz
// mono PCM WAV. We resample the *already-captured* samples via OfflineAudioContext
// — this is a deterministic operation on known-good data, unlike decodeAudioData
// of a MediaRecorder webm/opus blob (which intermittently returned silent
// buffers). The recorder taps the same mic source as the level meter, so what
// the user sees as input level is exactly what gets encoded here.
export async function float32ToWav(
  samples: Float32Array,
  sourceSampleRate: number,
  targetSampleRate = 16000,
): Promise<Blob> {
  if (samples.length === 0) {
    return encodeWavMono16(new Float32Array(0), targetSampleRate);
  }
  if (sourceSampleRate === targetSampleRate) {
    return encodeWavMono16(samples, targetSampleRate);
  }
  const targetLen = Math.max(
    1,
    Math.ceil((samples.length * targetSampleRate) / sourceSampleRate),
  );
  const offline = new OfflineAudioContext(1, targetLen, targetSampleRate);
  const buffer = offline.createBuffer(1, samples.length, sourceSampleRate);
  buffer.getChannelData(0).set(samples);
  const src = offline.createBufferSource();
  src.buffer = buffer;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return encodeWavMono16(rendered.getChannelData(0), targetSampleRate);
}

function encodeWavMono16(samples: Float32Array, sampleRate: number): Blob {
  const numFrames = samples.length;
  const dataSize = numFrames * 2; // 16-bit mono
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  let offset = 0;

  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset++, s.charCodeAt(i));
  };
  const writeUint32 = (v: number) => {
    view.setUint32(offset, v, true);
    offset += 4;
  };
  const writeUint16 = (v: number) => {
    view.setUint16(offset, v, true);
    offset += 2;
  };

  writeString('RIFF');
  writeUint32(36 + dataSize);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);            // PCM fmt chunk size
  writeUint16(1);             // format = PCM
  writeUint16(1);             // channels
  writeUint32(sampleRate);
  writeUint32(sampleRate * 2); // byte rate (mono * 16-bit)
  writeUint16(2);             // block align
  writeUint16(16);            // bits per sample
  writeString('data');
  writeUint32(dataSize);

  for (let i = 0; i < numFrames; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}
