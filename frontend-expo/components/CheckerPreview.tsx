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
    width: 40,
    height: 40,
    flexDirection: "row",
    flexWrap: "wrap",
    marginLeft: "auto",
    borderRadius: 4,
    overflow: "hidden",
  },
  square: {
    width: "50%",
    height: "50%",
  },
});