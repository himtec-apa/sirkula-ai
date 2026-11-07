import { useMemo } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActorRole,
  type Actor,
  type FieldRole,
} from "@/types/sirkula";

const SEED_ACTORS: Record<FieldRole, Actor> = {
  DONOR: {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Sasana Budaya Ganesha (Sabuga)",
    role: ActorRole.DONOR,
    phone_whatsapp: "+6281200000001",
    email: "catering@sabuga.itb.ac.id",
    location: {
      type: "Point",
      coordinates: [107.6080, -6.8863],
    },
    address_full: "Jl. Tamansari No.73, Lb. Siliwangi, Coblong, Kota Bandung",
    handover_point_notes: "Pintu Bongkar Muat Belakang Gedung Sabuga (Loading Dock Sayap Barat)",
    daily_capacity_kg: 200,
    priority_score: 50,
    expo_push_token: null,
    is_verified: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00.000Z",
    updated_at: "2026-11-07T13:20:00.000Z",
  },
  TIER_1_HUB: {
    id: "b0000000-0000-0000-0000-000000000001",
    name: "DKM Masjid Al-Ukhuwah Balai Kota",
    role: ActorRole.TIER_1_HUB,
    phone_whatsapp: "+6281200000011",
    email: "marbot@alukhuwah-bandung.org",
    location: {
      type: "Point",
      coordinates: [107.6095, -6.9115],
    },
    address_full: "Jl. Wastukencana No.27, Babakan Ciamis, Kota Bandung",
    handover_point_notes: "Posko Relawan DKM Serambi Kanan",
    daily_capacity_kg: 80,
    priority_score: 95,
    expo_push_token: null,
    is_verified: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00.000Z",
    updated_at: "2026-11-07T13:20:00.000Z",
  },
  TIER_2_FARMER: {
    id: "c0000000-0000-0000-0000-000000000001",
    name: "Bio-Larva Maggot BSF Mandiri Cibiru",
    role: ActorRole.TIER_2_FARMER,
    phone_whatsapp: "+6281200000021",
    email: "maggot.cibiru@gmail.com",
    location: {
      type: "Point",
      coordinates: [107.7120, -6.9320],
    },
    address_full: "Jl. Cilengkrang 1 No.28, Cisurupan, Cibiru, Kota Bandung",
    handover_point_notes: "Fasilitas Biokonversi Maggot Kandang A",
    daily_capacity_kg: 500,
    priority_score: 50,
    expo_push_token: null,
    is_verified: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00.000Z",
    updated_at: "2026-11-07T13:20:00.000Z",
  },
  TIER_3_COMPOST: {
    id: "d0000000-0000-0000-0000-000000000001",
    name: "Bank Sampah Induk Bandung Bersih Babakan Siliwangi",
    role: ActorRole.TIER_3_COMPOST,
    phone_whatsapp: "+6281200000031",
    email: "banksampah.baksil@bandung.go.id",
    location: {
      type: "Point",
      coordinates: [107.6105, -6.8835],
    },
    address_full: "Jl. Siliwangi No.14, Lb. Siliwangi, Coblong, Kota Bandung",
    handover_point_notes: "Area Penerimaan Biomasa Organik & Komposter Aerob",
    daily_capacity_kg: 1000,
    priority_score: 40,
    expo_push_token: null,
    is_verified: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00.000Z",
    updated_at: "2026-11-07T13:20:00.000Z",
  },
  ESG_AUDITOR: {
    id: "e0000000-0000-0000-0000-000000000001",
    name: "Auditor ESG & DLH Kota Bandung",
    role: ActorRole.ESG_AUDITOR,
    phone_whatsapp: "+6281200000041",
    email: "auditor@dlh.bandung.go.id",
    location: {
      type: "Point",
      coordinates: [107.6186, -6.9039],
    },
    address_full: "Kantor Dinas Lingkungan Hidup Kota Bandung, Gedung B Lantai 3",
    handover_point_notes: "Meja Verifikasi Audit Karbon & Metana",
    daily_capacity_kg: 1000,
    priority_score: 100,
    expo_push_token: null,
    is_verified: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00.000Z",
    updated_at: "2026-11-07T13:20:00.000Z",
  },
  SIMULATOR_ADMIN: {
    id: "f0000000-0000-0000-0000-000000000001",
    name: "Dewan Juri & Simulator Administrator",
    role: ActorRole.SIMULATOR_ADMIN,
    phone_whatsapp: "+6281200000051",
    email: "admin@sirkula.ai",
    location: {
      type: "Point",
      coordinates: [107.6080, -6.8863],
    },
    address_full: "Command Center HIMTEC ITB Bandung",
    handover_point_notes: "Ruang Kontrol Simulasi & Monitoring",
    daily_capacity_kg: 5000,
    priority_score: 100,
    expo_push_token: null,
    is_verified: true,
    is_active: true,
    created_at: "2026-11-01T08:00:00.000Z",
    updated_at: "2026-11-07T13:20:00.000Z",
  },
};

export interface ActorHeaders {
  "x-actor-id": string;
  "x-actor-role": FieldRole;
  Authorization?: string;
}

export type ActorProfilePatch = Partial<
  Pick<
    Actor,
    | "name"
    | "phone_whatsapp"
    | "address_full"
    | "handover_point_notes"
    | "daily_capacity_kg"
  >
>;

interface ActorStoreState {
  activeRole: FieldRole;
  profiles: Record<FieldRole, Actor>;
  currentActor: Actor | null;
  token: string | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  hasCompletedOnboarding: boolean;
  setActiveRole: (role: FieldRole) => void;
  updateProfile: (role: FieldRole, patch: ActorProfilePatch) => void;
  resetProfiles: () => void;
  setAuthSession: (auth: { token: string; actor: Actor }) => void;
  loginAsRole: (role: FieldRole, customName?: string) => void;
  login: (role: FieldRole, name?: string, actor?: Actor, token?: string) => void;
  logout: () => void;
  completeOnboarding: () => void;
  syncActorsFromApi: (actors: Actor[]) => void;
}

function createInitialProfiles(): Record<FieldRole, Actor> {
  return {
    DONOR: { ...SEED_ACTORS.DONOR },
    TIER_1_HUB: { ...SEED_ACTORS.TIER_1_HUB },
    TIER_2_FARMER: { ...SEED_ACTORS.TIER_2_FARMER },
    TIER_3_COMPOST: { ...SEED_ACTORS.TIER_3_COMPOST },
    ESG_AUDITOR: { ...SEED_ACTORS.ESG_AUDITOR },
    SIMULATOR_ADMIN: { ...SEED_ACTORS.SIMULATOR_ADMIN },
  };
}

export function buildActorHeaders(
  actorId: string,
  role: FieldRole,
): ActorHeaders {
  const token = useActorStore.getState().token;
  return {
    "x-actor-id": actorId,
    "x-actor-role": role,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const useActorStore = create<ActorStoreState>()(
  persist(
    (set) => ({
      activeRole: ActorRole.DONOR,
      profiles: createInitialProfiles(),
      currentActor: null,
      token: null,
      isAuthenticated: false,
      hasOnboarded: false,
      hasCompletedOnboarding: false,
      setActiveRole: (role) =>
        set((state) => ({
          activeRole: role,
          currentActor: state.profiles[role] ?? state.currentActor,
        })),
      syncActorsFromApi: (actors) =>
        set((state) => {
          const newProfiles = { ...state.profiles };
          actors.forEach((act) => {
            const r = act.role as FieldRole;
            if (r && newProfiles[r]) {
              newProfiles[r] = { ...newProfiles[r], ...act };
            }
          });
          return {
            profiles: newProfiles,
            currentActor: newProfiles[state.activeRole] ?? state.currentActor,
          };
        }),
      updateProfile: (role, patch) =>
        set((state) => ({
          profiles: {
            ...state.profiles,
            [role]: { ...state.profiles[role], ...patch },
          },
          currentActor:
            state.currentActor && state.currentActor.role === role
              ? { ...state.currentActor, ...patch }
              : state.currentActor,
        })),
      resetProfiles: () => set({ profiles: createInitialProfiles(), currentActor: null, token: null }),
      setAuthSession: ({ token, actor }) =>
        set((state) => {
          const role = (actor.role as FieldRole) ?? state.activeRole;
          return {
            token,
            currentActor: actor,
            activeRole: role,
            isAuthenticated: true,
            hasOnboarded: true,
            hasCompletedOnboarding: true,
            profiles: {
              ...state.profiles,
              [role]: actor,
            },
          };
        }),
      loginAsRole: (role, customName) =>
        set((state) => ({
          activeRole: role,
          isAuthenticated: true,
          hasOnboarded: true,
          hasCompletedOnboarding: true,
          profiles: customName
            ? {
                ...state.profiles,
                [role]: { ...state.profiles[role], name: customName },
              }
            : state.profiles,
        })),
      login: (role, customName, actor, token) =>
        set((state) => {
          const resolvedActor = actor ?? (customName ? { ...state.profiles[role], name: customName } : state.profiles[role]);
          return {
            activeRole: role,
            token: token ?? state.token,
            currentActor: resolvedActor,
            isAuthenticated: true,
            hasOnboarded: true,
            hasCompletedOnboarding: true,
            profiles: {
              ...state.profiles,
              [role]: resolvedActor,
            },
          };
        }),
      logout: () =>
        set({
          isAuthenticated: false,
          token: null,
          currentActor: null,
        }),
      completeOnboarding: () =>
        set({
          hasOnboarded: true,
          hasCompletedOnboarding: true,
        }),
    }),
    {
      name: "sirkula.actor.session.v4",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeRole: state.activeRole,
        profiles: state.profiles,
        currentActor: state.currentActor,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        hasOnboarded: state.hasOnboarded,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
      }),
    },
  ),
);

export function useActorHeaders(): ActorHeaders {
  const role = useActorStore((state) => state.activeRole);
  const currentActor = useActorStore((state) => state.currentActor);
  const profileActorId = useActorStore((state) => state.profiles[state.activeRole]?.id);
  const actorId = currentActor?.id ?? profileActorId;
  return useMemo(() => buildActorHeaders(actorId, role), [actorId, role]);
}
