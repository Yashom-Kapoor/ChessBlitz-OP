import { View, StyleSheet } from "react-native";

export function CheckerPreview({ lightColor, darkColor }: { lightColor: string; darkColor: string }) {
  return (
    <View style={styles.container}>
      <View style={[styles.square, { backgroundColor: lightColor }]} />
      <View style={[styles.square, { backgroundColor: darkColor }]} />
      <View style={[styles.square, { backgroundColor: darkColor }]} />
      <View style={[styles.square, { backgroundColor: lightColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 75,
    height: 75,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 4,
    overflow: "hidden",
  },
  square: {
    width: "50%",
    height: "50%",
  },
});