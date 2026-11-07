import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { COLORS, FONTS, RADIUS, TYPOGRAPHY } from "@/config/theme";

export interface ExposureOption {
  label: string;
  hint: string;
  minutes: number;
}

export const EXPOSURE_OPTIONS: readonly ExposureOption[] = [
  { label: "Baru Matang", hint: "0m", minutes: 0 },
  { label: "2 Jam Lalu", hint: "120m", minutes: 120 },
  { label: "4 Jam Lalu", hint: "240m", minutes: 240 },
];

export interface ExposureSliderProps {
  value: number;
  onChange: (minutes: number) => void;
  isAcRoom: boolean;
  onAcRoomChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ExposureSlider({
  value,
  onChange,
  isAcRoom,
  onAcRoomChange,
  disabled = false,
}: ExposureSliderProps) {
  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Durasi Paparan Sejak Matang</Text>
        <Text style={styles.badgeHint}>Pilih Cepat</Text>
      </View>

      <View style={styles.optionsRow}>
        {EXPOSURE_OPTIONS.map((option) => {
          const selected = value === option.minutes;
          return (
            <Pressable
              key={option.minutes}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${option.label}, ${option.hint}`}
              disabled={disabled}
              onPress={() => onChange(option.minutes)}
              style={[
                styles.optionBtn,
                selected ? styles.optionBtnSelected : styles.optionBtnNormal,
              ]}
            >
              <Text
                style={[
                  styles.optionLabel,
                  selected && styles.optionLabelSelected,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.optionHint,
                  selected && styles.optionHintSelected,
                ]}
              >
                {option.hint}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.acRow}>
        <View style={styles.acTextCol}>
          <Text style={styles.acTitle}>Ruangan Ber-AC</Text>
          <Text style={styles.acSubtitle}>
            Suhu ruang lebih sejuk memperlambat laju pembusukan.
          </Text>
        </View>
        <Switch
          accessibilityLabel="Ruangan ber-AC"
          accessibilityHint="Aktifkan jika makanan disimpan di ruangan ber-AC"
          disabled={disabled}
          value={isAcRoom}
          onValueChange={onAcRoomChange}
          trackColor={{ false: COLORS.border, true: COLORS.primary }}
          thumbColor={COLORS.surface}
          ios_backgroundColor={COLORS.border}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.card,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabled: {
    opacity: 0.6,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    ...TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  badgeHint: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    fontSize: 11,
  },
  optionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: RADIUS.input,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  optionBtnNormal: {
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  optionBtnSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  optionLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: COLORS.text,
    textAlign: "center",
  },
  optionLabelSelected: {
    color: COLORS.surface,
  },
  optionHint: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  optionHintSelected: {
    color: COLORS.light,
  },
  acRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  acTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  acTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    color: COLORS.text,
  },
  acSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});
