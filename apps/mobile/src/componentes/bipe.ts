import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

let player: AudioPlayer | null = null;

/** Bipe curto de leitura (1,8 kHz, 90 ms). Nunca deve quebrar o fluxo de venda se o áudio falhar. */
export function tocarBipe(): void {
  try {
    player ??= createAudioPlayer(require('../../assets/bipe.wav') as number);
    void Promise.resolve(player.seekTo(0)).catch(() => undefined);
    player.play();
  } catch {
    player = null;
  }
}
