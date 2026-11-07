const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Fix web asset registry and internal monorepo package resolution
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@sirkula/bio-thermal-sdk") {
    return {
      filePath: path.resolve(__dirname, "src/lib/bio-thermal-sdk.ts"),
      type: "sourceFile",
    };
  }
  if (moduleName === "@sirkula/shared-types") {
    return {
      filePath: path.resolve(__dirname, "src/types/sirkula.ts"),
      type: "sourceFile",
    };
  }

  if (
    platform === "web" &&
    moduleName === "react-native-web/dist/exports/AssetRegistry"
  ) {
    try {
      return context.resolveRequest(
        context,
        "@react-native/assets-registry/registry",
        platform,
      );
    } catch {
      // Fallback to default
    }
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
