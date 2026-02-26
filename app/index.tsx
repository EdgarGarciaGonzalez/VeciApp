import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        router.replace("/login");
        setChecking(false);
        return;
      }

      if (data.session) {
        router.replace("/(tabs)");
      } else {
        router.replace("/login");
      }

      setChecking(false);
    };

    checkSession();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/(tabs)");
      else router.replace("/login");
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}