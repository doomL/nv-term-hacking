import type { TFunction } from 'i18next';

/** Map server/engine lastMessage strings to localized CRT footer text. */
export function localizeLastMessage(message: string, t: TFunction): string {
  if (!message) return '';

  const likeness = /^(\d+)\/(\d+) correct\.$/.exec(message);
  if (likeness) {
    return `${likeness[1]}/${likeness[2]} ${t('game.correct')}.`;
  }

  switch (message) {
    case 'ACCESS GRANTED':
      return t('game.accessGranted');
    case 'TERMINAL LOCKED':
      return t('game.terminalLocked');
    case 'ATTEMPTS REPLENISHED':
      return t('game.attemptsReplenished');
    default:
      return message;
  }
}
