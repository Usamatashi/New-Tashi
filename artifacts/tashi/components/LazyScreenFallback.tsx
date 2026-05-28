import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "@/constants/colors";

export default function LazyScreenFallback() {
  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F4F1",
  },
});
