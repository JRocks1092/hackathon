// TripMembersScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, Button, FlatList, StyleSheet, Alert,TouchableOpacity } from "react-native";
import { doc, getDoc, updateDoc, arrayUnion,collection,getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function TripMembersScreen({ route, trip, user }) {
  const [friends, setFriends] = useState([]);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load friends from users/{email}/friends
        const friendsRef = collection(db, `users/${user.email}/friends`);
        const friendsSnap = await getDocs(friendsRef);
        const friendsList = friendsSnap.docs.map((doc) => doc.data().email);

        // Load members from trip doc
        const tripSnap = await getDoc(doc(db, "trips", trip.id));
        const tripData = tripSnap.data();
        setMembers(tripData?.members || []);
        setFriends(friendsList);
      } catch (error) {
        console.error("Error fetching data:", error);
        Alert.alert("Error", "Unable to load trip members or friends.");
      }
    };

    fetchData();
  }, []);

  const addToTrip = async (email) => {
    if (members.includes(email)) {
      Alert.alert("Info", "Already a member");
      return;
    }

    try {
      const tripRef = doc(db, "trips", trip.id);
      await updateDoc(tripRef, {
        members: arrayUnion(email),
      });
      Alert.alert("Success", "User added to trip");
      setMembers([...members, email]);
    } catch (err) {
      console.error("Error adding member:", err);
      Alert.alert("Error", "Failed to add user");
    }
  };

  if (user.email !== trip.createdBy) {
    return (
      <View style={styles.container}>
        <Text>You are not the trip admin.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Add Members to Trip</Text>
      <FlatList
        data={friends}
        keyExtractor={(item, index) => item || index.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.friendItem}
            onPress={() => addToTrip(item)}
          >
            <Text>{item}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text>No friends to show</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  heading: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  friendItem: {
    padding: 12,
    backgroundColor: "#e0f0ff",
    borderRadius: 10,
    marginBottom: 10,
  },
});