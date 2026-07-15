import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppSplash } from "@/components/AppSplash";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ScanProvider } from "@/context/ScanContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_900Black,
  });
  const [showSplash, setShowSplash] = useState(true);
  // Fallback: if fonts never resolve (happens in some OTA/Expo Go builds),
  // unblock rendering after 4 s so the app doesn't show a permanent blank screen.
  const [fontTimeout, setFontTimeout] = useState(false);
  const fontTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fontTimeoutRef.current = setTimeout(() => setFontTimeout(true), 4000);
    return () => { if (fontTimeoutRef.current) clearTimeout(fontTimeoutRef.current); };
  }, []);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      if (fontTimeoutRef.current) clearTimeout(fontTimeoutRef.current);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Block render only while fonts are still loading AND the 4-second guard hasn't fired.
  if (!fontsLoaded && !fontError && !fontTimeout) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <ScanProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="history" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="database" />
              </Stack>
              {showSplash && <AppSplash onDone={() => setShowSplash(false)} />}
            </ScanProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
