// screens/NotificationsScreen.js
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { Heading3 } from "lucide-react-native";

export default function NotificationsScreen({ trip, user }) {
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info");
  const [notifications, setNotifications] = useState([]);


  useEffect(() => {
    if (!trip?.id) return;

    const q = query(
      collection(db, "trips", trip.id, "notifications"),
      orderBy("timestamp", "desc") // You must save a `timestamp` field when sending notifications
    );
    console.log("hello");

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(data);
    });

    return unsubscribe;
  }, [trip?.id]);

  const sendNotification = async () => {
    if (!message.trim()) return;

    try {
      await addDoc(collection(db, `trips/${trip.id}/notifications`), {
        message,
        type,
        createdBy: user.email,
        timestamp: serverTimestamp(),
      });
      setMessage("");
    } catch (err) {
      console.error("Failed to send notification:", err);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.card, styles[item.type]]}>
      <Text style={styles.type}>{item.type?.toUpperCase()}</Text>
      <Text style={styles.message}>{item.message}</Text>     
      <Text style={styles.user}>Sent by: {item.createdBy}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Select Type</Text>
      <View style={styles.typeRow}>
        {["info", "emergency"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeButton, type === t && styles.activeButton]}
            onPress={() => setType(t)}
          >
            <Text style={styles.typeText}>{t.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        placeholder="Enter message"
        value={message}
        onChangeText={setMessage}
        style={styles.input}
      />
      <Button title="Send Alert" onPress={sendNotification} />
      <View style={styles.container2}>        
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text>No notifications yet.</Text>}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: "#f4f6f8", },
  container2: { backgroundColor: "#f4f6f8", paddingTop:20},
  label: { fontWeight: "bold", marginBottom: 8 },
  typeRow: { flexDirection: "row", marginBottom: 12 },
  typeButton: {
    padding: 10,
    borderRadius: 6,
    backgroundColor: "#ddd",
    marginRight: 10,
  },
  activeButton: {
    backgroundColor: "#007AFF",
  },
  typeText: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 6,
    elevation: 3, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  message: {
    fontSize: 16,
    color: "#333",
    marginBottom: 6,
  },
  user: {
    fontSize: 13,
    color: "#888",
    fontStyle: "italic",
  },
  type: {
    fontWeight: "bold",
    fontSize: 14,
    color: "#444",
    marginBottom: 4,
  },
  help: {
    color: "#d32f2f",
    fontWeight: "bold",
    marginTop: 6,
  },
  emergency: {
    borderLeftColor: "#e53935",
  },
  
  info: {
    borderLeftColor: "#29b6f6",
  },
});
