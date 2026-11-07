import { ProfileEditor } from "@/components/layout/ProfileEditor";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ActorRole } from "@/types/sirkula";

export default function AuditorProfileScreen() {
  return (
    <ScreenContainer
      title="Profil Auditor ESG"
      subtitle="Identitas instansi pengawas lingkungan hidup dan verifikasi kepatuhan regulasi."
    >
      <ProfileEditor role={ActorRole.ESG_AUDITOR} />
    </ScreenContainer>
  );
}
