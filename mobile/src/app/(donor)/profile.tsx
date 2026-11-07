import { ProfileEditor } from "@/components/layout/ProfileEditor";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ActorRole } from "@/types/sirkula";

export default function DonorProfileScreen() {
  return (
    <ScreenContainer
      title="Profil Donatur"
      subtitle="Kelola identitas, nomor WhatsApp, dan titik serah terima dapur."
    >
      <ProfileEditor role={ActorRole.DONOR} />
    </ScreenContainer>
  );
}
