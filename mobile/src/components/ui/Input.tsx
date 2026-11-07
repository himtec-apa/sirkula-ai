import { useState, type ReactNode } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { COLORS, RADIUS, TYPOGRAPHY } from "@/config/theme";

export interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  leftIcon?: ReactNode;
  containerStyle?: object;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  containerStyle,
  onFocus,
  onBlur,
  multiline,
  editable = true,
  placeholderTextColor,
  style,
  ...textInputProps
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputContainer,
          multiline && styles.multilineContainer,
          focused && styles.focused,
          Boolean(error) && styles.errorBorder,
          !editable && styles.disabled,
        ]}
      >
        {leftIcon ? <View style={styles.iconWrapper}>{leftIcon}</View> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityState={{ disabled: !editable }}
          style={[
            styles.textInput,
            multiline && styles.multilineInput,
            style,
          ]}
          editable={editable}
          multiline={multiline}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={placeholderTextColor ?? COLORS.textMuted}
          textAlignVertical={multiline ? "top" : "center"}
          {...textInputProps}
        />
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {error}
        </Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  label: {
    ...TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    borderRadius: RADIUS.input,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
  },
  multilineContainer: {
    minHeight: 96,
    alignItems: "flex-start",
    paddingVertical: 10,
  },
  focused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  errorBorder: {
    borderColor: COLORS.error,
  },
  disabled: {
    opacity: 0.55,
    backgroundColor: COLORS.background,
  },
  iconWrapper: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.text,
    padding: 0,
  },
  multilineInput: {
    minHeight: 76,
  },
  errorText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.error,
    marginTop: 4,
  },
  helperText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 4,
  },
});
