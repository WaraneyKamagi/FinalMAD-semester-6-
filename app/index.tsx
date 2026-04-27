import { Ionicons } from "@expo/vector-icons";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../convex/_generated/api";

// We'll use a globally mocked store for MVP if needed, or simply pass userId via Context/Zustand.
// For now, we will assume login succeeds and sets it, let's keep it simple.
// In a real app, use SecureStore. Here, we'll just emit an event or rely on the router params.
export let CURRENT_USER_ID: string | null = null;
export function setUserId(id: string) {
  CURRENT_USER_ID = id;
}

export default function LoginScreen() {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [loading, setLoading] = useState(false);

  const login = useMutation(api.users.login);

  const canSubmit = useMemo(
    () =>
      !!name.trim() &&
      !!age.trim() &&
      !!weight.trim() &&
      !!height.trim() &&
      !loading,
    [name, age, weight, height, loading],
  );

  const handleLogin = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const token = name.toLowerCase().replace(/\s+/g, "");
      const userId = await login({
        name: name.trim(),
        age: parseFloat(age),
        token,
        weight: parseFloat(weight),
        height: parseFloat(height),
      });
      setUserId(userId);
      router.replace("/(tabs)");
    } catch (e) {
      console.error("Login failed", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.hero}>
            <View style={styles.logoWrap}>
              <Ionicons name="fitness" size={44} color="#FF7E00" />
            </View>
            <Text style={styles.title}>NutriUP</Text>
            <Text style={styles.subtitle}>Level Up Your Health</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Start Your Health Profile</Text>

            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Example: Alex"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Example: 25"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={age}
              onChangeText={setAge}
            />

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={styles.label}>Weight (kg)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="70"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                />
              </View>
              <View style={styles.col}>
                <Text style={styles.label}>Height (cm)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="175"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={height}
                  onChangeText={setHeight}
                />
              </View>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit}
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Generate My Weekly Plan</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#FAF9F6",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 32,
  },
  hero: {
    alignItems: "center",
    marginTop: 16,
    gap: 12,
  },
  logoWrap: {
    height: 96,
    width: 96,
    borderRadius: 48,
    backgroundColor: "#FFF3E8",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF7E00",
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    color: "#1F2937",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#6B7280",
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardTitle: {
    color: "#1F2937",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  label: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 6,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    color: "#1F2937",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
    gap: 6,
  },
  button: {
    backgroundColor: "#FF7E00",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#FF7E00",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800",
  },
  bgOrbA: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "#FFEDD5",
    top: -100,
    right: -80,
    opacity: 0.6,
  },
  bgOrbB: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#FFE4E6",
    bottom: -80,
    left: -70,
    opacity: 0.5,
  },
});
