import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Height of the floating bottom tab bar including its margin. */
export const TAB_BAR_BASE_HEIGHT = 72;

/** Dynamic layout tokens handling safe areas and offsets */
export const useLayoutTokens = () => {
  const insets = useSafeAreaInsets();
  return {
    tabBarHeight: TAB_BAR_BASE_HEIGHT + insets.bottom,
    tabBarBottom: insets.bottom > 0 ? insets.bottom : 2,
    scrollBottomPadding: TAB_BAR_BASE_HEIGHT + insets.bottom + 24,
  };
};
