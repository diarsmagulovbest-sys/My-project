type NavigationSoundId = 'today' | 'goals' | 'roadmap' | 'settings';

type SoundProfile = {
  sparkleFrequency: number;
  bodyFrequency: number;
  accentFrequency: number;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const soundProfiles: Record<NavigationSoundId, SoundProfile> = {
  today: { sparkleFrequency: 1120, bodyFrequency: 164, accentFrequency: 1760 },
  goals: { sparkleFrequency: 980, bodyFrequency: 146, accentFrequency: 1540 },
  roadmap: { sparkleFrequency: 1240, bodyFrequency: 174, accentFrequency: 1880 },
  settings: { sparkleFrequency: 860, bodyFrequency: 130, accentFrequency: 1420 },
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new AudioContextConstructor();
  }

  return audioContext;
}

function scheduleTone(
  context: AudioContext,
  output: AudioNode,
  frequency: number,
  startTime: number,
  duration: number,
  peakVolume: number,
  type: OscillatorType,
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.72, startTime + duration);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakVolume, startTime + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function scheduleSnap(context: AudioContext, output: AudioNode, startTime: number) {
  const sampleRate = context.sampleRate;
  const bufferLength = Math.floor(sampleRate * 0.035);
  const buffer = context.createBuffer(1, bufferLength, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < bufferLength; index += 1) {
    const fade = 1 - index / bufferLength;
    channel[index] = (Math.random() * 2 - 1) * fade * 0.42;
  }

  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = context.createGain();

  filter.type = 'highpass';
  filter.frequency.setValueAtTime(1800, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.045, startTime + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.035);

  source.buffer = buffer;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(output);
  source.start(startTime);
}

function playSoundProfile(context: AudioContext, profile: SoundProfile) {
  const startTime = context.currentTime;
  const masterGain = context.createGain();
  const filter = context.createBiquadFilter();

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(5200, startTime);
  masterGain.gain.setValueAtTime(0.42, startTime);
  masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

  filter.connect(masterGain);
  masterGain.connect(context.destination);

  scheduleSnap(context, filter, startTime);
  scheduleTone(context, filter, profile.bodyFrequency, startTime, 0.105, 0.07, 'sine');
  scheduleTone(context, filter, profile.sparkleFrequency, startTime + 0.006, 0.075, 0.045, 'triangle');
  scheduleTone(context, filter, profile.accentFrequency, startTime + 0.026, 0.09, 0.026, 'sine');
}

export function playNavigationClickSound(soundId: NavigationSoundId) {
  try {
    const context = getAudioContext();

    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      void context.resume().then(() => {
        playSoundProfile(context, soundProfiles[soundId]);
      });
      return;
    }

    playSoundProfile(context, soundProfiles[soundId]);
  } catch {
    // Audio feedback should never block navigation.
  }
}
