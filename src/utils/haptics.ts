import * as Haptics from "expo-haptics";

// Haptics are a nicety, never a failure: unsupported devices and simulators
// just reject, so swallow it.
const safe = (fn: () => Promise<void>) => {
  fn().catch(() => {});
};

export const haptics = {
  /** Light tap: add to cart, primary buttons. */
  tap: () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** Tick: toggles, hearts, steppers, tab presses. */
  select: () => safe(() => Haptics.selectionAsync()),
  /** Success buzz: order placed, order ready. */
  success: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Warning buzz: errors, blocked actions. */
  warning: () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
};