import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native";

import { MobileAppShell } from "./src/ui-shell/MobileAppShell";

export default function App(): JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f8fafc" }}>
      <StatusBar style="dark" />
      <MobileAppShell />
    </SafeAreaView>
  );
}
