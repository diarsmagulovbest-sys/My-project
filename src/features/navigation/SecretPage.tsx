import { useEffect, useRef, useState } from 'react';
import jumpCharacterImage from '../../assets/ui/secret-jumpscare-character.png';

const jumpScreenDurationMs = 5000;

function makeDistortionCurve(amount: number) {
  const sampleCount = 44100;
  const curve = new Float32Array(sampleCount);
  const deg = Math.PI / 180;

  for (let index = 0; index < sampleCount; index += 1) {
    const x = (index * 2) / sampleCount - 1;
    curve[index] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
  }

  return curve;
}

function playJumpScream() {
  if (!window.AudioContext) {
    return;
  }

  const audioContext = new AudioContext();
  const endTime = audioContext.currentTime + jumpScreenDurationMs / 1000;
  const bufferSize = audioContext.sampleRate * 2;
  const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let index = 0; index < bufferSize; index += 1) {
    output[index] = Math.random() * 2 - 1;
  }

  const noise = audioContext.createBufferSource();
  const scream = audioContext.createOscillator();
  const panic = audioContext.createOscillator();
  const distortion = audioContext.createWaveShaper();
  const gain = audioContext.createGain();

  noise.buffer = noiseBuffer;
  noise.loop = true;
  scream.type = 'sawtooth';
  panic.type = 'square';
  distortion.curve = makeDistortionCurve(520);
  distortion.oversample = '4x';

  scream.frequency.setValueAtTime(620, audioContext.currentTime);
  scream.frequency.exponentialRampToValueAtTime(1450, audioContext.currentTime + 0.16);
  scream.frequency.exponentialRampToValueAtTime(860, audioContext.currentTime + 0.38);
  scream.frequency.exponentialRampToValueAtTime(1760, endTime);
  panic.frequency.setValueAtTime(42, audioContext.currentTime);
  panic.frequency.exponentialRampToValueAtTime(87, endTime);

  gain.gain.setValueAtTime(0.001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.74, audioContext.currentTime + 0.05);
  gain.gain.setValueAtTime(0.74, endTime - 0.16);
  gain.gain.exponentialRampToValueAtTime(0.001, endTime);

  noise.connect(distortion);
  scream.connect(distortion);
  panic.connect(distortion);
  distortion.connect(gain);
  gain.connect(audioContext.destination);
  noise.start();
  scream.start();
  panic.start();
  noise.stop(endTime);
  scream.stop(endTime);
  panic.stop(endTime);

  window.setTimeout(() => void audioContext.close(), jumpScreenDurationMs + 250);
}

export function SecretPage() {
  const [isJumpScreenVisible, setIsJumpScreenVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current !== null) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  function handleLearnEverything() {
    setIsJumpScreenVisible(true);
    playJumpScream();

    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }

    hideTimerRef.current = window.setTimeout(() => {
      setIsJumpScreenVisible(false);
    }, jumpScreenDurationMs);
  }

  return (
    <section className="secret-page" aria-label="Secret page">
      <button className="secret-learn-button" type="button" onClick={handleLearnEverything}>
        learn everything
      </button>

      {isJumpScreenVisible ? (
        <div className="jump-screen" role="alert" aria-live="assertive">
          <img className="jump-screen-character" src={jumpCharacterImage} alt="" aria-hidden="true" />
        </div>
      ) : null}
    </section>
  );
}
