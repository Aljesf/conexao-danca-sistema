import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { restoreSessionFromStorage } from "../../lib/supabase";

type Props = {
  children: React.ReactNode;
};

export default function AuthBootstrap({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await restoreSessionFromStorage();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ fontSize: 18, fontWeight: "600" }}>Carregando sessao...</Text>
      </View>
    );
  }

  return <>{children}</>;
}
