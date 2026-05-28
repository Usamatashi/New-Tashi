import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { BackButton } from "@/components/BackButton";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Colors } from "@/constants/colors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { STATIC_DATA_QUERY_OPTIONS } from "@/lib/queryClient";

interface TickerItem {
  id: number;
  text: string;
  createdAt: string;
}

export default function CreateTextScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: items = [], isLoading: loading } = useQuery({
    queryKey: queryKeys.ticker,
    queryFn: () => apiFetch<TickerItem[]>("/ticker"),
    ...STATIC_DATA_QUERY_OPTIONS,
  });

  const saveText = async () => {
    if (!inputText.trim()) return;
    setSaving(true);
    try {
      await apiFetch<TickerItem>("/ticker", {
        method: "POST",
        body: JSON.stringify({ text: inputText.trim() }),
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.ticker });
      queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
      setInputText("");
    } catch {
      Alert.alert("Error", "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (id: number) => {
    Alert.alert("Delete Ticker", "Remove this scrolling text from users' screens?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          try {
            await apiFetch(`/ticker/${id}`, { method: "DELETE" });
            await queryClient.invalidateQueries({ queryKey: queryKeys.ticker });
            queryClient.invalidateQueries({ queryKey: queryKeys.adminDashboard });
          } catch {
            Alert.alert("Error", "Could not delete.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  const topPad = insets.top + (Platform.OS === "web" ? 67 : 0);

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <BackButton color={Colors.adminAccent} fallback="/(admin)" />
        <Text style={styles.headerTitle}>Ticker Text</Text>
        <View style={{ width: 38 }} />
      </View>

      <KeyboardAwareScrollViewCompat contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>New Ticker Message</Text>
        <View style={styles.inputCard}>
          <TextInput
            style={styles.input}
            placeholder="Type a message to scroll across user screens..."
            placeholderTextColor={Colors.textLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={200}
          />
          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>{inputText.length}/200</Text>
            <TouchableOpacity
              style={[styles.saveBtn, (!inputText.trim() || saving) && { opacity: 0.5 }]}
              onPress={saveText}
              disabled={!inputText.trim() || saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={Colors.white} size="small" />
                : <Text style={styles.saveBtnText}>Add Ticker</Text>
              }
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Active Tickers</Text>

        {loading ? (
          <ActivityIndicator color={Colors.adminAccent} style={{ marginTop: 32 }} />
        ) : items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No ticker texts yet</Text>
            <Text style={styles.emptyDesc}>Add a message above — it will scroll across user home screens.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={styles.tickerCard}>
                <View style={styles.tickerPreview}>
                  <Text style={styles.tickerPreviewLabel}>PREVIEW</Text>
                  <Text style={styles.tickerText} numberOfLines={2}>{item.text}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteItem(item.id)}
                  disabled={deletingId === item.id}
                >
                  {deletingId === item.id
                    ? <ActivityIndicator size="small" color={Colors.error} />
                    : <Feather name="trash-2" size={18} color={Colors.error} />
                  }
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: `${Colors.adminAccent}18`, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.adminText },
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  sectionLabel: {
    fontSize: 12, fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.6,
    marginTop: 8,
  },
  inputCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, gap: 12,
  },
  input: {
    fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.text,
    minHeight: 80, textAlignVertical: "top",
  },
  inputFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  charCount: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textLight },
  saveBtn: {
    backgroundColor: Colors.adminAccent, borderRadius: 12,
    paddingHorizontal: 20, paddingVertical: 10,
  },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.white },

  empty: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.adminText },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textSecondary, textAlign: "center" },

  list: { gap: 12 },
  tickerCard: {
    backgroundColor: Colors.white, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, flexDirection: "row", alignItems: "center", gap: 12,
  },
  tickerPreview: { flex: 1, gap: 4 },
  tickerPreviewLabel: {
    fontSize: 10, fontFamily: "Inter_700Bold",
    color: Colors.adminAccent, letterSpacing: 0.8,
  },
  tickerText: { fontSize: 14, fontFamily: "Inter_500Medium", color: Colors.text },
  deleteBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${Colors.error}10`,
    justifyContent: "center", alignItems: "center",
  },
});
