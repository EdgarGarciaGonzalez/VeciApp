// app/index.tsx
import { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.replace("/login");
        setChecking(false);
        return;
      }

      // Comprobar si el usuario tiene comunidad asignada
      const { data: perfil } = await supabase
        .from("usuario")
        .select("comunidad_id")
        .eq("email", data.session.user.email)
        .single();

      if (!perfil || !perfil.comunidad_id) {
        // Usuario sin comunidad → pantalla de crear/unirse
        router.replace("/comunidad");
      } else {
        router.replace("/(tabs)");
      }

      setChecking(false);
    };

    check();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });

    return () => sub.subscription.unsubscribe();
  }, [router]);

  if (checking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0F4FB" }}>
        <ActivityIndicator size="large" color="#2F67E8" />
      </View>
    );
  }

  return null;
}