import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

interface OffTopicModalProps {
  visible: boolean;
  onClose: () => void;
  /** Pass the raw error message so we can optionally show it */
  errorMessage?: string;
}

export default function OffTopicModal({
  visible,
  onClose,
  errorMessage,
}: OffTopicModalProps) {
  // --- Animations ---
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(80)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;
  const iconBounce = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Reset values
      backdropOpacity.setValue(0);
      cardTranslateY.setValue(80);
      cardScale.setValue(0.88);
      iconBounce.setValue(0);
      shakeX.setValue(0);

      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          tension: 65,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Icon bounce after card appears
        Animated.sequence([
          Animated.spring(iconBounce, {
            toValue: -10,
            tension: 200,
            friction: 5,
            useNativeDriver: true,
          }),
          Animated.spring(iconBounce, {
            toValue: 0,
            tension: 200,
            friction: 6,
            useNativeDriver: true,
          }),
        ]).start();

        // Subtle horizontal shake on the card
        Animated.sequence([
          Animated.timing(shakeX, { toValue: 6,  duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -6, duration: 60, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 4,  duration: 50, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -4, duration: 50, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0,  duration: 40, easing: Easing.linear, useNativeDriver: true }),
        ]).start();
      });
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 60,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      {/* Card container (positioned above backdrop) */}
      <View style={styles.centerer} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.card,
            {
              transform: [
                { translateY: cardTranslateY },
                { scale: cardScale },
                { translateX: shakeX },
              ],
            },
          ]}
        >
          {/* ── Icon area ── */}
          <Animated.View
            style={[styles.iconOuter, { transform: [{ translateY: iconBounce }] }]}
          >
            <View style={styles.iconRing}>
              <View style={styles.iconInner}>
                <Ionicons name="ban" size={32} color="#EF4444" />
              </View>
            </View>
          </Animated.View>

          {/* ── Badge pill ── */}
          <View style={styles.badgePill}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeLabel}>Di Luar Konteks</Text>
          </View>

          {/* ── Title & description ── */}
          <Text style={styles.title}>Topik Tidak Sesuai 🙅</Text>
          <Text style={styles.body}>
            NutriUP hanya dapat membantu dengan topik{" "}
            <Text style={styles.highlight}>makanan, nutrisi, dan olahraga</Text>.
            Silakan masukkan prompt yang berkaitan dengan diet, rencana makan,
            atau program latihan fisik.
          </Text>

          {/* ── Separator ── */}
          <View style={styles.divider} />

          {/* ── CTA button ── */}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeBtn,
              pressed && styles.closeBtnPressed,
            ]}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            <Text style={styles.closeBtnText}>Coba Lagi</Text>
          </Pressable>

          {/* ── Small dismiss link ── */}
          <Pressable onPress={onClose} style={styles.dismissLink}>
            <Text style={styles.dismissText}>Tutup</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15, 10, 5, 0.55)",
  },
  centerer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 28,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 14,
    shadowColor: "#FF3B30",
    shadowOpacity: 0.12,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 20,
  },

  // ── Icon ──
  iconOuter: {
    marginBottom: 4,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FECACA",
  },
  iconInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Badge ──
  badgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  badgeLabel: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // ── Text ──
  title: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  body: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  highlight: {
    color: "#FF7E00",
    fontWeight: "800",
  },

  // ── Divider ──
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: "#F3F4F6",
  },

  // ── Button ──
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#EF4444",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
    shadowColor: "#EF4444",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  closeBtnPressed: {
    transform: [{ scale: 0.96 }],
    shadowOpacity: 0.1,
  },
  closeBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 0.2,
  },

  dismissLink: {
    paddingVertical: 4,
  },
  dismissText: {
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
});
