import { ProfileEditor } from "@/components/layout/ProfileEditor";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ActorRole } from "@/types/sirkula";

export default function FarmerProfileScreen() {
  return (
    <ScreenContainer
      title="Profil Peternak"
      subtitle="Kelola identitas dan kapasitas tampung pakan organik harian."
    >
      <ProfileEditor role={ActorRole.TIER_2_FARMER} />
    </ScreenContainer>
  );
}
