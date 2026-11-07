import { ProfileEditor } from "@/components/layout/ProfileEditor";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ActorRole } from "@/types/sirkula";

export default function CompostProfileScreen() {
  return (
    <ScreenContainer
      title="Profil Pengelola Kompos"
      subtitle="Kelola identitas dan kapasitas fasilitas biomasa organik harian."
    >
      <ProfileEditor role={ActorRole.TIER_3_COMPOST} />
    </ScreenContainer>
  );
}
