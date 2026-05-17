// app/index.tsx — Splash Screen con logo PNG
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../src/lib/supabase";

const { width } = Dimensions.get("window");

export default function SplashScreen() {
  const router = useRouter();
  const [destino, setDestino] = useState<string | null>(null);

  const logoScale     = useRef(new Animated.Value(0.3)).current;
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const textOpacity   = useRef(new Animated.Value(0)).current;
  const tagOpacity    = useRef(new Animated.Value(0)).current;
  const barWidth      = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const verificar = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) { setDestino("/login"); return; }
      const { data: perfil } = await supabase
        .from("usuario").select("comunidad_id")
        .eq("email", data.session.user.email).single();
      setDestino(!perfil?.comunidad_id ? "/comunidad" : "/(tabs)");
    };
    verificar();
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.timing(textOpacity, { toValue: 1, duration: 400, delay: 100, useNativeDriver: true }),
      Animated.timing(tagOpacity,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(barWidth, {
        toValue: width * 0.5,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!destino) return;
    const t = setTimeout(() => {
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true })
        .start(() => router.replace(destino as any));
    }, 2800);
    return () => clearTimeout(t);
  }, [destino]);

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>
      <View style={s.c1} />
      <View style={s.c2} />

      {/* Bloque centrado: logo + texto + barra todo pegado */}
      <View style={s.contentBlock}>

        {/* Logo PNG */}
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }] }}>
          <Image
            source={require("../assets/images/logo.png")}
            style={s.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Nombre — sin margen arriba, pegado al logo */}
        <Animated.Text style={[s.appName, { opacity: textOpacity }]}>
          VeciApp
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
          Tu comunidad, siempre conectada
        </Animated.Text>

        {/* Barra de carga */}
        <View style={s.barTrack}>
          <Animated.View style={[s.barFill, { width: barWidth }]} />
        </View>

      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2F67E8",
    alignItems: "center",
    justifyContent: "center",
  },

  // Bloque que contiene TODO centrado verticalmente
  contentBlock: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Círculos decorativos
  c1: {
    position: "absolute", width: 400, height: 400, borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.05)", top: -140, right: -120,
  },
  c2: {
    position: "absolute", width: 300, height: 300, borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: 20, left: -100,
  },

  // Logo
  logo: {
    width: 500,
    height: 500,
    tintColor: "white",
    marginBottom: -60,
  },

  // Texto pegado al logo
  appName: {
    fontSize: 46,
    fontWeight: "800",
    color: "white",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.3,
    marginBottom: 30,
  },

  // Barra de progreso
  barTrack: {
    width: width * 0.5,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  barFill: {
    height: 3,
    backgroundColor: "white",
    borderRadius: 2,
  },
});