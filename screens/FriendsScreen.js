// FriendsScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from "react-native";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, arrayUnion,setDoc, serverTimestamp } from "firebase/firestore";

export default function FriendsScreen({ user }) {
  const [friendEmail, setFriendEmail] = useState("");
  const [friends, setFriends] = useState([]);

  const fetchFriends = async () => {
    const userDoc = await getDoc(doc(db, "users", user.email));
    const data = userDoc.data();
    setFriends(data?.friends || []);
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  const addFriend = async () => {

    if (!friendEmail || !user?.uid) {
      alert("Missing friend email or user not logged in.");
      return;
    }

    try {      
      const friendRef = doc(db, `users/${user.email}/friends/${friendEmail}`);
      await setDoc(friendRef, {
        email: friendEmail,
        addedAt: serverTimestamp(),
      });

      alert(`${friendEmail} added as friend!`);
      setFriendEmail("");
      fetchFriends();
    } catch (error) {
      console.error("Error adding friend: ", error);
      alert("Failed to add friend.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Friends</Text>

      <TextInput
        placeholder="Enter friend's email"
        value={friendEmail}
        onChangeText={setFriendEmail}
        style={styles.input}
      />
      <Button color={"red"} title="Add Friend" onPress={() => addFriend()} />

      <FlatList
        data={friends}
        keyExtractor={(item) => item}
        renderItem={({ item }) => <Text style={styles.friend}>{item}</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", marginVertical: 10, padding: 10, borderRadius: 5 },
  friend: { padding: 10, fontSize: 16, borderBottomWidth: 1, borderColor: "#eee" },
});
