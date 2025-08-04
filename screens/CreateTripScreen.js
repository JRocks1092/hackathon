// CreateTripScreen.js
import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    StyleSheet,
    ScrollView,
} from "react-native";
import { db } from "../firebase"; // <-- adjust path if needed
import { collection, addDoc, doc, getDocs } from "firebase/firestore";

export default function CreateTripScreen({ navigation, route }) {
    const { user } = route.params;
    const [tripName, setTripName] = useState("");
    const [friends, setFriends] = useState([]);
    const [selectedMembers, setSelectedMembers] = useState([]);

    useEffect(() => {
        const fetchFriends = async () => {
            try {
                const snapshot = await getDocs(
                    collection(db, "users", user.uid, "friends")
                );
                const friendsList = snapshot.docs.map((doc) => doc.id);
                setFriends(friendsList);
            } catch (err) {
                console.error("Failed to fetch friends", err);
            }
        };

        fetchFriends();
    }, []);

    const toggleMember = (email) => {
        setSelectedMembers((prev) =>
            prev.includes(email)
                ? prev.filter((m) => m !== email)
                : [...prev, email]
        );
    };

    const handleCreateTrip = async () => {
        if (!tripName.trim()) return;
        const newTrip = {
            name: tripName.trim(),
            createdBy: user.email,
            members: [user.email, ...selectedMembers],
        };

        try {
            await addDoc(collection(db, "trips"), newTrip);
            navigation.goBack();
        } catch (err) {
            console.error("Trip creation failed", err);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.label}>Trip Name</Text>
            <TextInput
                style={styles.input}
                placeholder="Enter trip name"
                value={tripName}
                onChangeText={setTripName}
            />

            <Text style={styles.label}>Add Friends to Trip</Text>
            {friends.map((email) => (
                <TouchableOpacity
                    key={email}
                    onPress={() => toggleMember(email)}
                    style={[
                        styles.friendItem,
                        selectedMembers.includes(email) && styles.friendSelected,
                    ]}
                >
                    <Text style={styles.friendText}>{email}</Text>
                </TouchableOpacity>
            ))}

            <Button title="Create Trip" onPress={handleCreateTrip} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { padding: 16, backgroundColor: "#fff" },
    label: { fontSize: 16, fontWeight: "600", marginVertical: 8 },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
    },
    friendItem: {
        padding: 10,
        marginVertical: 4,
        backgroundColor: "#f2f2f2",
        borderRadius: 6,
    },
    friendSelected: {
        backgroundColor: "#d0e8ff",
    },
    friendText: {
        fontSize: 14,
    },
});
