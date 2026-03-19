import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Linking,
  Alert,
  TextInput,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import * as DocumentPicker from "expo-document-picker";

const TAB_BAR_HEIGHT = 72;

const COMUNIDAD_ID = "752e8ca8-c8d0-441a-a76a-4e3d2069eb87";

type Documento = {
  id: string;
  titulo: string;
  tipo: string;
  categoria: string;
  fecha: string;
  archivo_path: string;
};

export default function DocumentosScreen() {
  const router = useRouter();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const cargarDocumentos = async () => {
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("documento")
      .select("id,titulo,tipo,categoria,fecha,archivo_path")
      .order("fecha", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setDocumentos([]);
      return;
    }

    setDocumentos(data ?? []);
  };

  useEffect(() => {
    cargarDocumentos();
  }, []);

  const abrirDocumento = async (archivoPath: string) => {
    const { data } = supabase.storage
      .from("documentos")
      .getPublicUrl(archivoPath);

    const url = data.publicUrl;

    const supported = await Linking.canOpenURL(url);

    if (!supported) {
      Alert.alert("Error", "No se puede abrir este documento.");
      return;
    }

    await Linking.openURL(url);
  };

  const seleccionarYSubirDocumento = async () => {
    if (!COMUNIDAD_ID || COMUNIDAD_ID.includes("PEGA")) {
      Alert.alert("Falta comunidad", "Pon el ID real de la comunidad en el archivo.");
      return;
    }

    if (!titulo.trim() || !categoria.trim()) {
      Alert.alert("Faltan datos", "Escribe el título y la categoría.");
      return;
    }

    try {
      setSubiendo(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) {
        setSubiendo(false);
        return;
      }

      const file = result.assets[0];

      if (!file.uri) {
        setSubiendo(false);
        Alert.alert("Error", "No se pudo leer el archivo.");
        return;
      }

      // Descargar el archivo local y convertirlo a blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      const nombreArchivo = `${Date.now()}-${file.name}`;

      // Subir a Storage
      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(nombreArchivo, blob, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        setSubiendo(false);
        Alert.alert("Error al subir", uploadError.message);
        return;
      }

      // Guardar en tabla documento
      const { error: insertError } = await supabase.from("documento").insert([
        {
          comunidad_id: COMUNIDAD_ID,
          titulo: titulo.trim(),
          categoria: categoria.trim(),
          tipo: "PDF",
          archivo_path: nombreArchivo,
          fecha: new Date().toISOString().split("T")[0],
        },
      ]);

      setSubiendo(false);

      if (insertError) {
        Alert.alert("Subido, pero no guardado", insertError.message);
        return;
      }

      Alert.alert("Documento subido", "El archivo se ha añadido correctamente.");
      setTitulo("");
      setCategoria("");
      setModalVisible(false);
      cargarDocumentos();
    } catch (err) {
      setSubiendo(false);
      Alert.alert("Error", "Ha ocurrido un problema al subir el documento.");
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>VeciApp</Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: TAB_BAR_HEIGHT + 18 },
          ]}
        >
          <View style={styles.topRow}>
            <View>
              <Text style={styles.screenTitle}>Documentos</Text>
              <Text style={styles.subtitle}>
                Consulta y sube archivos de la comunidad
              </Text>
            </View>

            <Pressable
              style={styles.uploadBtn}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.uploadBtnText}>+ Subir</Text>
            </Pressable>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Ionicons
                name="folder-open-outline"
                size={20}
                color="#1E3A8A"
              />
              <Text style={styles.infoText}>
                Aquí puedes ver actas, presupuestos, normas y contratos.
              </Text>
            </View>
          </View>

          {errorMsg ? (
            <Text style={{ color: "#991B1B", marginBottom: 16 }}>
              Error: {errorMsg}
            </Text>
          ) : documentos.length === 0 ? (
            <Text>No hay documentos disponibles.</Text>
          ) : (
            documentos.map((doc) => (
              <View key={doc.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBox}>
                    <Ionicons
                      name="document-text-outline"
                      size={22}
                      color="#1E40AF"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{doc.titulo}</Text>
                    <Text style={styles.cardMeta}>
                      {doc.categoria} · {doc.tipo}
                    </Text>
                    <Text style={styles.cardDate}>Fecha: {doc.fecha}</Text>
                  </View>
                </View>

                <Pressable
                  style={styles.openButton}
                  onPress={() => abrirDocumento(doc.archivo_path)}
                >
                  <Ionicons name="download-outline" size={18} color="white" />
                  <Text style={styles.openButtonText}>Abrir documento</Text>
                </Pressable>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* MODAL SUBIR DOCUMENTO */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Subir documento</Text>

            <Text style={styles.label}>Título</Text>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              style={styles.input}
              placeholder="Ej: Acta junta marzo"
            />

            <Text style={styles.label}>Categoría</Text>
            <TextInput
              value={categoria}
              onChangeText={setCategoria}
              style={styles.input}
              placeholder="Ej: Actas"
            />

            <Pressable
              style={[styles.openButton, { marginTop: 10 }]}
              onPress={seleccionarYSubirDocumento}
              disabled={subiendo}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="white" />
              <Text style={styles.openButtonText}>
                {subiendo ? "Subiendo..." : "Elegir PDF y subir"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setModalVisible(false)}
              style={styles.cancelBtn}
            >
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { height: TAB_BAR_HEIGHT }]}>
        <Tab
          icon="home-outline"
          label="Inicio"
          onPress={() => router.push("/(tabs)")}
        />
        <Tab
          icon="build-outline"
          label="Incidencias"
          onPress={() => router.push("/(tabs)/incidencias")}
        />
        <Tab
          icon="document-text-outline"
          label="Docs"
          onPress={() => router.push("/(tabs)/documentos")}
          active
        />
        <Tab
          icon="bar-chart-outline"
          label="Economía"
          onPress={() => {}}
        />
        <Tab
          icon="people-outline"
          label="Contactos"
          onPress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

function Tab({
  icon,
  label,
  onPress,
  active,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable style={styles.tabItem} onPress={onPress}>
      <Ionicons name={icon} size={22} color={active ? "#0B3CCF" : "#111827"} />
      <Text
        style={[
          styles.tabLabel,
          active && { color: "#0B3CCF", fontWeight: "700" },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "white" },

  header: {
    height: 64,
    backgroundColor: "#0B3CCF",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  headerTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },

  content: {
    padding: 18,
  },

  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  screenTitle: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 6,
  },
  subtitle: {
    color: "#666",
  },

  uploadBtn: {
    backgroundColor: "#111827",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  uploadBtnText: {
    color: "white",
    fontWeight: "700",
  },

  infoBox: {
    backgroundColor: "#EEF2FF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#1E40AF",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoText: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "white",
  },
  cardTop: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  cardMeta: {
    color: "#555",
    fontSize: 13,
    marginBottom: 2,
  },
  cardDate: {
    color: "#666",
    fontSize: 13,
  },

  openButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    paddingVertical: 12,
    borderRadius: 12,
  },
  openButtonText: {
    color: "white",
    fontWeight: "700",
  },

  cancelBtn: {
    marginTop: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelBtnText: {
    color: "#1E40AF",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    padding: 18,
  },
  modalBox: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 18,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 14,
  },

  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "white",
  },

  tabBar: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    backgroundColor: "white",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
  },
});