import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={["#0D0B0A", "#110E0B", "#0A0806"]} style={StyleSheet.absoluteFill} />
      <Text style={styles.emoji}>🍽️</Text>
      <Text style={styles.title}>Page not found</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Go back home</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: Colors.dark,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.white,
  },
  link: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.mint,
    borderRadius: 16,
  },
  linkText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.dark,
  },
});
