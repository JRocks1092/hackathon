import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Marker } from 'react-native-maps';

function getInitials(email) {
  return email?.[0]?.toUpperCase() || '?';
}
function getReadableDarkHexColor() {
  const r = Math.floor(Math.random() * 128); // 0–127
  const g = Math.floor(Math.random() * 128);
  const b = Math.floor(Math.random() * 128);
  return (
    "#" +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("")
  );
}

export default function CustomUserMarker({ coordinate, email }) {
  return (
    <Marker coordinate={coordinate}>
      <View style={[styles.markerCircle, { backgroundColor:getReadableDarkHexColor()}]}>
        <Text style={styles.markerText}>{getInitials(email)}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  markerCircle: {
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  markerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
