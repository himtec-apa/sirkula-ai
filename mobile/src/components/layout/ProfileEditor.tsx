import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { ROLE_LABELS } from "@/lib/roles";
import { COLORS, TYPOGRAPHY } from "@/config/theme";
import { useActorStore } from "@/store/useActorStore";
import { ActorRole, type FieldRole } from "@/types/sirkula";

interface FormErrors {
  name?: string;
  phone?: string;
  address?: string;
  capacity?: string;
}

export function ProfileEditor({ role }: { role: FieldRole }) {
  const router = useRouter();
  const actor = useActorStore((state) => state.profiles[role]);
  const updateProfile = useActorStore((state) => state.updateProfile);
  const resetProfiles = useActorStore((state) => state.resetProfiles);
  const logout = useActorStore((state) => state.logout);
  const { showToast } = useToast();

  const [name, setName] = useState(actor.name);
  const [phone, setPhone] = useState(actor.phone_whatsapp);
  const [address, setAddress] = useState(actor.address_full);
  const [notes, setNotes] = useState(actor.handover_point_notes ?? "");
  const [capacity, setCapacity] = useState(
    actor.daily_capacity_kg?.toString() ?? "",
  );
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    setName(actor.name);
    setPhone(actor.phone_whatsapp);
    setAddress(actor.address_full);
    setNotes(actor.handover_point_notes ?? "");
    setCapacity(actor.daily_capacity_kg?.toString() ?? "");
  }, [
    actor.name,
    actor.phone_whatsapp,
    actor.address_full,
    actor.handover_point_notes,
    actor.daily_capacity_kg,
  ]);

  const isCapacityRole = role !== ActorRole.DONOR;

  const handleSave = () => {
    const nextErrors: FormErrors = {};
    const normalizedPhone = phone.replace(/[\s-]/g, "");
    const capacityValue = Number(capacity);

    if (name.trim().length === 0) {
      nextErrors.name = "Nama wajib diisi.";
    }
    if (!/^\+?[0-9]{9,15}$/.test(normalizedPhone)) {
      nextErrors.phone = "Nomor WhatsApp harus 9 sampai 15 digit angka.";
    }
    if (address.trim().length === 0) {
      nextErrors.address = "Alamat lengkap wajib diisi.";
    }
    if (
      isCapacityRole &&
      (!Number.isFinite(capacityValue) || capacityValue <= 0)
    ) {
      nextErrors.capacity = "Kapasitas harian harus lebih dari 0 kg.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      showToast({
        type: "warning",
        title: "Periksa Isian Form",
        message: "Beberapa kolom wajib belum terisi dengan benar.",
      });
      return;
    }

    updateProfile(role, {
      name: name.trim(),
      phone_whatsapp: normalizedPhone,
      address_full: address.trim(),
      handover_point_notes: notes.trim().length > 0 ? notes.trim() : null,
      daily_capacity_kg: isCapacityRole ? capacityValue : null,
    });

    showToast({
      type: "success",
      title: "Profil Berhasil Diperbarui",
      message: "Perubahan identitas tersimpan di perangkat lapangan.",
    });
  };

  const handleReset = () => {
    resetProfiles();
    setErrors({});
    showToast({
      type: "info",
      title: "Data Demo Dipulihkan",
      message: "Identitas profil kembali ke setelan awal.",
    });
  };

  const handleLogout = () => {
    Alert.alert(
      "Konfirmasi Keluar",
      "Keluar dari sesi lapangan dan kembali ke halaman pemilihan akun?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Keluar",
          style: "destructive",
          onPress: () => {
            logout();
            showToast({
              type: "info",
              title: "Sesi Berakhir",
              message: "Silakan pilih peran atau masuk kembali.",
            });
            router.replace("/login");
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Card padding="md">
        <Text style={styles.cardHeaderTitle}>Identitas Akun Mitra</Text>
        <Text style={styles.cardHeaderSub}>
          Peran Sistem: {ROLE_LABELS[role]}
        </Text>
        <Text style={styles.cardHeaderId}>ID Aktor: {actor.id}</Text>
      </Card>

      <Input
        label="Nama Mitra / Organisasi"
        value={name}
        onChangeText={setName}
        error={errors.name}
        placeholder="Nama resto, simpul warga, atau peternakan"
        autoCapitalize="words"
      />

      <Input
        label="Nomor WhatsApp"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        placeholder="+628123456789"
        keyboardType="phone-pad"
        autoComplete="tel"
      />

      <Input
        label="Alamat Lengkap Operasional"
        value={address}
        onChangeText={setAddress}
        error={errors.address}
        placeholder="Alamat titik penjemputan"
        multiline
      />

      {isCapacityRole ? (
        <>
          <Input
            label="Kapasitas Harian (kg)"
            value={capacity}
            onChangeText={setCapacity}
            error={errors.capacity}
            placeholder="50"
            keyboardType="decimal-pad"
            helperText="Kapasitas maksimal material yang dapat diterima per hari."
          />
          <Input
            label="Catatan Titik Serah Terima"
            value={notes}
            onChangeText={setNotes}
            placeholder="Contoh: Pintu loading dock B2 gerbang barat"
            multiline
            helperText="Catatan ini hanya dibuka kepada kurir setelah klaim dikonfirmasi."
          />
        </>
      ) : null}

      <View style={styles.buttonCol}>
        <Button label="Simpan Profil Mitra" onPress={handleSave} />
        <Button
          label="Pulihkan Data Demo Awal"
          variant="outline"
          onPress={handleReset}
        />
        <Button
          label="Keluar / Ganti Akun"
          variant="danger"
          leftIcon={
            <Ionicons name="log-out-outline" size={16} color={COLORS.surface} />
          }
          onPress={handleLogout}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginBottom: 20,
  },
  cardHeaderTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.text,
  },
  cardHeaderSub: {
    ...TYPOGRAPHY.caption,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  cardHeaderId: {
    ...TYPOGRAPHY.caption,
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  buttonCol: {
    gap: 8,
    marginTop: 8,
  },
});
