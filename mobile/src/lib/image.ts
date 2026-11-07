import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";

const MAX_DIMENSION = 1024;
const MAX_BYTES = 800 * 1024;
const QUALITY_STEPS = [0.8, 0.65, 0.5, 0.35, 0.25];

export interface CompressibleImage {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string | null;
}

export interface CapturedImage {
  uri: string;
  name: string;
  type: string;
  width: number;
  height: number;
  sizeBytes: number;
}

function buildResizeActions(
  width?: number,
  height?: number,
): Array<{ resize: { width?: number; height?: number } }> {
  if (!width || !height || width <= 0 || height <= 0) {
    return [];
  }
  if (width >= height && width > MAX_DIMENSION) {
    return [{ resize: { width: MAX_DIMENSION } }];
  }
  if (height > width && height > MAX_DIMENSION) {
    return [{ resize: { height: MAX_DIMENSION } }];
  }
  return [];
}

function resolveFileName(input: CompressibleImage): string {
  const fromUri = input.uri?.split("/").pop()?.split("?")[0];
  const candidate = input.fileName ?? fromUri ?? `sirkula-${Date.now()}.jpg`;
  return candidate.endsWith(".jpg") || candidate.endsWith(".jpeg")
    ? candidate
    : `${candidate}.jpg`;
}

export async function compressImage(
  input: CompressibleImage,
): Promise<CapturedImage> {
  const width = input.width && input.width > 0 ? input.width : 800;
  const height = input.height && input.height > 0 ? input.height : 600;
  const actions = buildResizeActions(width, height);
  const fileName = resolveFileName(input);

  for (const quality of QUALITY_STEPS) {
    try {
      const result = await ImageManipulator.manipulateAsync(input.uri, actions, {
        compress: quality,
        format: ImageManipulator.SaveFormat.JPEG,
      });

      let sizeBytes = 0;
      if (Platform.OS === "web") {
        try {
          const res = await fetch(result.uri);
          const blob = await res.blob();
          sizeBytes = blob.size;
        } catch {
          sizeBytes = 150 * 1024;
        }
      } else {
        try {
          const info = await FileSystem.getInfoAsync(result.uri);
          sizeBytes = info.exists && typeof info.size === "number" ? info.size : 0;
        } catch {
          sizeBytes = 150 * 1024;
        }
      }

      if (sizeBytes > 0 && sizeBytes <= MAX_BYTES) {
        return {
          uri: result.uri,
          name: fileName,
          type: "image/jpeg",
          width: result.width || width,
          height: result.height || height,
          sizeBytes: sizeBytes || 150 * 1024,
        };
      }
    } catch {
      break;
    }
  }

  // Safe fallback to original image when manipulation or file measurement fails
  return {
    uri: input.uri,
    name: fileName,
    type: "image/jpeg",
    width,
    height,
    sizeBytes: 200 * 1024,
  };
}
