// LoginScreen.js
import React, { useState } from "react";
import { View, TextInput, Button, StyleSheet, Alert } from "react-native";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getFirestore } from "firebase/firestore";
import { db } from "../firebase"; // your initialized Firestore

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const auth = getAuth();
      const result = await signInWithEmailAndPassword(auth, email, password);
      const user = result.user;

      // Optional: Save user in Firestore if not already
      await setDoc(doc(db, "users", user.email), {
        email: user.email,
        uid: user.uid,
        friends: [],
      }, { merge: true });

      // ✅ Call the callback with the logged-in user object
      onLogin({ email: user.email, uid: user.uid });
    } catch (err) {
      Alert.alert("Login failed", err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Button title="Login" onPress={handleLogin} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginVertical: 10,
    borderRadius: 5,
  },
});
