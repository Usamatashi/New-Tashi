import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AdminSettingsProvider } from "@/context/AdminSettingsContext";
import AnimatedSplash from "@/components/AnimatedSplash";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { getApiBaseUrl } from "@/constants/api";

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { isLoading: authLoading, user, token } = useAuth();
  const [showSplash, setShowSplash] = useState(true);

  usePushNotifications({ userId: user?.id, token, baseUrl: getApiBaseUrl() });

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  return (
    <AdminSettingsProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(user)" />
      </Stack>
      {showSplash && (
        <AnimatedSplash
          onFinish={handleSplashFinish}
          ready={!authLoading}
        />
      )}
    </AdminSettingsProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </QueryClientProvider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
