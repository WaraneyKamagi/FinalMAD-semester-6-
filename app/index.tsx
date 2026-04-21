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
              <Ionicons name="fitness" size={44} color="#10B981" />
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
              placeholderTextColor="#6B7280"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Example: 25"
              placeholderTextColor="#6B7280"
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
                  placeholderTextColor="#6B7280"
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
                  placeholderTextColor="#6B7280"
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
                <ActivityIndicator color="#F9FAFB" />
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
    backgroundColor: "#F7F3EE",
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  hero: {
    alignItems: "center",
    marginTop: 12,
    gap: 10,
  },
  logoWrap: {
    height: 88,
    width: 88,
    borderRadius: 44,
    backgroundColor: "#FFF1E4",
    borderWidth: 1,
    borderColor: "#F3D6B8",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#2D2620",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  subtitle: {
    color: "#8D7967",
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  card: {
    backgroundColor: "#FFFDFC",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#EEDFD0",
    gap: 10,
  },
  cardTitle: {
    color: "#2D2620",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  label: {
    color: "#7A6A5B",
    fontSize: 13,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#FFF7EF",
    borderWidth: 1,
    borderColor: "#E8D8C7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#2D2620",
    fontSize: 16,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
    gap: 4,
  },
  button: {
    backgroundColor: "#E87D1A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonText: {
    color: "#FFFDF9",
    fontSize: 16,
    fontWeight: "700",
  },
  bgOrbA: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#FFE6CF",
    top: -110,
    right: -60,
    opacity: 0.8,
  },
  bgOrbB: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#FFD6AE",
    bottom: -60,
    left: -50,
    opacity: 0.7,
  },
});
