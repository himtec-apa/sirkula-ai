import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOWS, TYPOGRAPHY } from "@/config/theme";

export type ToastType = "success" | "warning" | "error" | "info";

export interface ToastOptions {
  type?: ToastType;
  kind?: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose?: () => void;
}

interface ToastState extends ToastOptions {
  id: number;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

const TOAST_META: Record<
  ToastType,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bgColor: string }
> = {
  success: {
    icon: "checkmark-circle",
    color: COLORS.success,
    bgColor: COLORS.successLight,
  },
  warning: {
    icon: "warning",
    color: COLORS.warning,
    bgColor: COLORS.amberLight,
  },
  error: {
    icon: "alert-circle",
    color: COLORS.error,
    bgColor: COLORS.errorLight,
  },
  info: {
    icon: "information-circle",
    color: COLORS.info,
    bgColor: COLORS.infoLight,
  },
};

const AUTO_DISMISS_MS = 4000;
const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastRef = useRef<ToastOptions | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearTimer();
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      toastRef.current?.onClose?.();
      toastRef.current = null;
      setToast(null);
    });
  }, [clearTimer, opacity, translateY]);

  const showToast = useCallback(
    (options: ToastOptions) => {
      clearTimer();
      toastRef.current = options;
      const resolvedType = options.type ?? options.kind ?? "info";
      setToast({ ...options, type: resolvedType, id: Date.now() });

      translateY.setValue(-60);
      opacity.setValue(0);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      const duration = options.duration ?? AUTO_DISMISS_MS;
      if (duration > 0) {
        timerRef.current = setTimeout(hideToast, duration);
      }
    },
    [clearTimer, hideToast, opacity, translateY],
  );

  useEffect(() => () => clearTimer(), [clearTimer]);

  const value = useMemo(
    () => ({ showToast, hideToast }),
    [hideToast, showToast],
  );

  const meta = toast ? TOAST_META[toast.type] : null;

  return (
    <ToastContext.Provider value={value}>
      <View style={styles.flexContainer}>
        {children}
        {toast && meta ? (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.toastWrapper,
              {
                top: insets.top + 8,
                transform: [{ translateY }],
                opacity,
              },
            ]}
          >
            <View
              accessible
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              style={[styles.toastBox, { borderLeftColor: meta.color }]}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: meta.bgColor }]}
              >
                <Ionicons name={meta.icon} size={20} color={meta.color} />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.toastTitle}>{toast.title}</Text>
                {toast.message ? (
                  <Text style={styles.toastMessage}>{toast.message}</Text>
                ) : null}
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tutup notifikasi"
                hitSlop={12}
                onPress={hideToast}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </Pressable>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast harus digunakan di dalam ToastProvider.");
  }
  return context;
}

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
  },
  toastWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    padding: 12,
    ...SHADOWS.md,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  toastTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 14,
    color: COLORS.text,
  },
  toastMessage: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
