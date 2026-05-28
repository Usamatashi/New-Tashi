import React from "react";
import { Platform, View, type ViewProps } from "react-native";
import {
  KeyboardAvoidingView,
  type KeyboardAvoidingViewProps,
} from "react-native-keyboard-controller";

type Props = KeyboardAvoidingViewProps & { children: React.ReactNode };

/** Keyboard-safe container for modals and full screens (prefer KeyboardAwareScrollViewCompat for forms). */
export function KeyboardAvoidingViewCompat({
  children,
  style,
  behavior = "padding",
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return <View style={[{ flex: 1 }, style] as ViewProps["style"]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView behavior={behavior} style={[{ flex: 1 }, style]} {...props}>
      {children}
    </KeyboardAvoidingView>
  );
}
