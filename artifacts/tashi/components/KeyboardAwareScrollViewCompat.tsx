import React from "react";
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
} from "react-native-keyboard-controller";
import { Platform, ScrollView, type ScrollViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = KeyboardAwareScrollViewProps &
  ScrollViewProps & {
    /** Add ~72px for bottom tab bars on salesman/admin tab screens */
    includeTabBar?: boolean;
  };

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  bottomOffset: bottomOffsetProp,
  includeTabBar = false,
  extraKeyboardSpace = 24,
  contentContainerStyle,
  style,
  ...props
}: Props) {
  const insets = useSafeAreaInsets();
  const tabBarExtra = includeTabBar ? 72 : 0;
  const bottomOffset = bottomOffsetProp ?? insets.bottom + tabBarExtra + 16;

  if (Platform.OS === "web" || !KeyboardAwareScrollView) {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        contentContainerStyle={contentContainerStyle}
        style={[{ flex: 1 }, style]}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <KeyboardAwareScrollView
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      bottomOffset={bottomOffset}
      extraKeyboardSpace={extraKeyboardSpace}
      contentContainerStyle={contentContainerStyle}
      style={[{ flex: 1 }, style]}
      {...props}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
