import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ScrollViewProps,
  StyleSheet,
} from "react-native";

type Props = ScrollViewProps & {
  bottomOffset?: number;
};

/**
 * Cross-platform keyboard-aware scroll view.
 * Uses built-in React Native APIs — fully compatible with Expo Go.
 */
export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  bottomOffset = 16,
  style,
  contentContainerStyle,
  ...props
}: Props) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={bottomOffset}
    >
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        style={style}
        contentContainerStyle={contentContainerStyle}
        {...props}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
