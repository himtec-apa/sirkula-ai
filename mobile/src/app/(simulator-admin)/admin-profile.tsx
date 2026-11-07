import { ProfileEditor } from "@/components/layout/ProfileEditor";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ActorRole } from "@/types/sirkula";

export default function AdminProfileScreen() {
  return (
    <ScreenContainer
      title="Profil Administrator & Juri"
      subtitle="Akses kendali pusat simulasi dan monitoring sistem SIRKULA-AI."
    >
      <ProfileEditor role={ActorRole.SIMULATOR_ADMIN} />
    </ScreenContainer>
  );
}
