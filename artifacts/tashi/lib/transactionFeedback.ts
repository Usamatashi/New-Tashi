import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";
import { Platform } from "react-native";

let transactionSound: Audio.Sound | null = null;

/** Plays haptics, a short success tone, and a brief voice cue when a payment is recorded. */
export async function playTransactionRecordedFeedback(): Promise<void> {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    if (!transactionSound) {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/transaction.mp3"),
        { shouldPlay: false },
      );
      transactionSound = sound;
    } else {
      await transactionSound.setPositionAsync(0);
    }

    await transactionSound.playAsync();
  } catch {
    // Web or missing audio hardware — voice-only fallback
  }

  if (Platform.OS !== "web") {
    Speech.speak("Payment recorded", {
      language: "en",
      rate: 1.05,
      pitch: 1.0,
    });
  }
}
