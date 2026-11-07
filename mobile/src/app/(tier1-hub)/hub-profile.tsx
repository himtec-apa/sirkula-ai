import { ProfileEditor } from "@/components/layout/ProfileEditor";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ActorRole } from "@/types/sirkula";

export default function HubProfileScreen() {
  return (
    <ScreenContainer
      title="Profil Simpul Warga"
      subtitle="Kelola identitas dan kapasitas penerimaan material harian."
    >
      <ProfileEditor role={ActorRole.TIER_1_HUB} />
    </ScreenContainer>
  );
}
