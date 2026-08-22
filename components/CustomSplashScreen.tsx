import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

type Props = {
  onFinish: () => void;
  duration?: number;
};

export default function CustomSplashScreen({
  onFinish,
  duration = 1800,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entrance.start();

    const finishTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, Math.max(700, duration - 260));

    return () => {
      clearTimeout(finishTimer);
      entrance.stop();
    };
  }, [duration, onFinish, opacity, scale]);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFF7ED" />

      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Image
          source={require("../assets/images/logo.png")}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="INMinut"
        />

        <Text style={styles.tagline}>Read, Feel and Share</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoWrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: "88%",
    maxWidth: 430,
    height: 150,
  },
  tagline: {
    marginTop: 10,
    color: "#334155",
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
});
