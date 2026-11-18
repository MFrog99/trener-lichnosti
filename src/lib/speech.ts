// Озвучка: в браузере и Windows — Web Speech API, на Android — системный синтезатор речи через плагин.
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { isCapacitor } from './config';

let voice: SpeechSynthesisVoice | null = null;
let token = 0;

const webSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function pickVoice() {
  if (!webSpeech()) return;
  const vs = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('ru'));
  voice = vs.find((v) => /natural|online|google|milena|irina|svetlana|dariya/i.test(v.name)) || vs[0] || null;
}
if (!isCapacitor && webSpeech()) {
  pickVoice();
  speechSynthesis.onvoiceschanged = pickVoice;
}

export const speechAvailable = () => isCapacitor || webSpeech();
export const hasRussianVoice = () => { if (isCapacitor) return true; pickVoice(); return !!voice; };

export function speak(text: string, opts: { rate?: number; onend?: () => void } = {}) {
  const my = ++token;
  const done = () => { if (my === token) opts.onend?.(); };
  if (isCapacitor) {
    TextToSpeech.stop().catch(() => {}).finally(() => {
      TextToSpeech.speak({ text, lang: 'ru-RU', rate: opts.rate ?? 0.9, pitch: 1, volume: 1, category: 'playback' })
        .then(done)
        .catch(done);
    });
    return;
  }
  if (!webSpeech()) { done(); return; }
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ru-RU';
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 0.9;
  u.onend = done;
  u.onerror = done;
  speechSynthesis.speak(u);
}

export function stopSpeech() {
  token++;
  if (isCapacitor) { TextToSpeech.stop().catch(() => {}); return; }
  if (webSpeech()) speechSynthesis.cancel();
}
