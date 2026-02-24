import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";

type Incidencia = {
  id: string;
  titulo: string;
  descripcion: string | null;
  estado: string;
  prioridad: number;
  created_at: string;
};

export default function IncidenciasScreen() {
  const router = useRouter();
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarIncidencias = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("incidencia")
      .select("id,titulo,descripcion,estado,prioridad,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
      return;
    }

    setIncidencias(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    cargarIncidencias();
  }, [cargarIncidencias]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "white" }}
      contentContainerStyle={{ padding: 24 }}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarIncidencias} />}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "700" }}>Incidencias</Text>

        <Pressable
          onPress={() => router.push("/nueva-incidencia")}
          style={{ backgroundColor: "#111827", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>+ Nueva</Text>
        </Pressable>
      </View>

      {errorMsg && (
        <View style={{ padding: 12, borderRadius: 10, backgroundColor: "#fee2e2", marginBottom: 16 }}>
          <Text style={{ fontWeight: "700" }}>Error:</Text>
          <Text>{errorMsg}</Text>
        </View>
      )}

      {incidencias.length === 0 ? (
        <Text>No hay incidencias todavía.</Text>
      ) : (
        incidencias.map((i) => (
          <View
            key={i.id}
            style={{
              borderWidth: 1,
              borderColor: "#e5e7eb",
              borderRadius: 12,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{i.titulo}</Text>
            {!!i.descripcion && <Text style={{ marginTop: 6 }}>{i.descripcion}</Text>}
            <Text style={{ marginTop: 8, color: "#555" }}>
              Estado: {i.estado} · Prioridad: {i.prioridad}
            </Text>
          </View>
        ))
      )}

      <Text style={{ marginTop: 16, color: "#777" }}>
        Consejo: arrastra hacia abajo para recargar (pull-to-refresh).
      </Text>
    </ScrollView>
  );
}