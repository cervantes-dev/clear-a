// Height a floating-tab-bar screen's scrollable content must clear so its
// last item isn't hidden behind the bar. Mirrors AppTabBar's own layout
// constants (bar height + max bottom offset + breathing room) -- single
// source of truth so every screen and the tab bar itself stay in sync.
export const TAB_BAR_CLEARANCE = 64 + 40 + 24; // 128