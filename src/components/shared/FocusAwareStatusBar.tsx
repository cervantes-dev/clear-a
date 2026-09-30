import { useFocusEffect } from "expo-router";
import { StatusBar, StatusBarProps } from "expo-status-bar";
import { useCallback, useState } from "react";

/**
 * Drop-in replacement for expo-status-bar's <StatusBar> on tab screens.
 *
 * <StatusBar> is a mount-order stack, and tab screens stay mounted after you
 * navigate away, so whichever screen mounted last keeps controlling the
 * status bar even when it isn't visible. This only renders the real
 * <StatusBar> while the screen is focused: it mounts (and applies its style)
 * on focus and unmounts on blur, so the stack falls back to the previous
 * screen's style.
 */
export default function FocusAwareStatusBar(props: StatusBarProps) {
  const [focused, setFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );

  return focused ? <StatusBar {...props} /> : null;
}