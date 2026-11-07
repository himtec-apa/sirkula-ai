import { View } from "react-native";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

export type StateViewKind = "loading" | "empty" | "error";

export interface StateViewProps {
  kind: StateViewKind;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function StateView({
  kind,
  title,
  message,
  actionLabel,
  onAction,
}: StateViewProps) {
  if (kind === "loading") {
    return (
      <View style={{ gap: 12 }}>
        <Skeleton height={110} borderRadius={16} />
        <Skeleton height={110} borderRadius={16} />
        <Skeleton height={110} borderRadius={16} />
      </View>
    );
  }

  if (kind === "error") {
    return (
      <ErrorBanner
        title={title}
        message={message}
        onRetry={onAction}
        retryLabel={actionLabel}
      />
    );
  }

  return (
    <EmptyState
      title={title ?? "Belum ada data di sini"}
      message={message ?? "Data akan muncul otomatis saat tersedia."}
      actionLabel={actionLabel}
      onAction={onAction}
    />
  );
}
