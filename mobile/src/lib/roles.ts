import { type FieldRole } from "@/types/sirkula";
import { COLORS } from "@/config/theme";

export const ROLE_LABELS: Record<FieldRole, string> = {
  DONOR: "Donatur Resto & Katering",
  TIER_1_HUB: "Simpul Warga Tier 1",
  TIER_2_FARMER: "Mitra Peternak Tier 2",
  TIER_3_COMPOST: "Pengelola Kompos Tier 3",
  ESG_AUDITOR: "Auditor ESG & DLH",
  SIMULATOR_ADMIN: "Admin & Kontrol Simulasi",
};

export const ROLE_SHORT_LABELS: Record<FieldRole, string> = {
  DONOR: "Donatur",
  TIER_1_HUB: "Simpul",
  TIER_2_FARMER: "Peternak",
  TIER_3_COMPOST: "Kompos",
  ESG_AUDITOR: "Auditor",
  SIMULATOR_ADMIN: "Admin",
};

export const ROLE_DESCRIPTIONS: Record<FieldRole, string> = {
  DONOR: "Rilis surplus makanan dari dapur & katering.",
  TIER_1_HUB: "Jemput makanan yang masih aman dikonsumsi manusia.",
  TIER_2_FARMER: "Ambil biomasa organik untuk pakan maggot BSF & ternak.",
  TIER_3_COMPOST: "Penyelamatan biomasa terdegradasi lanjut untuk pupuk kompos.",
  ESG_AUDITOR: "Inspeksi telemetri metana, CO2e, dan kepatuhan sertifikat digital.",
  SIMULATOR_ADMIN: "Pengendali simulasi God-Mode, time-warp, dan percepatan waktu.",
};

export const ROLE_HOME_ROUTE: Record<FieldRole, string> = {
  DONOR: "/(donor)",
  TIER_1_HUB: "/(tier1-hub)",
  TIER_2_FARMER: "/(tier2-farmer)",
  TIER_3_COMPOST: "/(tier3-compost)",
  ESG_AUDITOR: "/(esg-auditor)",
  SIMULATOR_ADMIN: "/(simulator-admin)",
};

export const ROLE_ACCENT: Record<
  FieldRole,
  { surface: string; onSurface: string; tabActive: string }
> = {
  DONOR: {
    surface: COLORS.primary,
    onSurface: COLORS.surface,
    tabActive: COLORS.primary,
  },
  TIER_1_HUB: {
    surface: COLORS.success,
    onSurface: COLORS.surface,
    tabActive: COLORS.primaryDark,
  },
  TIER_2_FARMER: {
    surface: COLORS.accent,
    onSurface: COLORS.surface,
    tabActive: COLORS.accent,
  },
  TIER_3_COMPOST: {
    surface: COLORS.warning,
    onSurface: COLORS.surface,
    tabActive: COLORS.warning,
  },
  ESG_AUDITOR: {
    surface: COLORS.info,
    onSurface: COLORS.surface,
    tabActive: COLORS.info,
  },
  SIMULATOR_ADMIN: {
    surface: COLORS.primaryDark,
    onSurface: COLORS.surface,
    tabActive: COLORS.primaryDark,
  },
};
