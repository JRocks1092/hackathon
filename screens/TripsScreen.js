// TripsScreen.js
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, TouchableOpacity } from "react-native";
import { db } from "../firebase";
import {
    collection,
    doc,
    getDocs,
    addDoc,
    query,
    where,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

export default function TripsScreen({ user, onSelectTrip }) {
    const [tripName, setTripName] = useState("");
    const [trips, setTrips] = useState([]);
    const navigation = useNavigation();

    // Fetch trips where the user is a member
    const fetchTrips = async () => {
        const q = query(
            collection(db, "trips"),
            where("members", "array-contains", user.email)
        );
        const snapshot = await getDocs(q);
        setTrips(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    };

    useEffect(() => {
        fetchTrips();
    }, []);

    const createTrip = async () => {
        if (!tripName) return Alert.alert("Trip name required");

        const newTrip = {
            name: tripName,
            createdBy: user.email,
            members: [user.email],
        };

        const docRef = await addDoc(collection(db, "trips"), newTrip);
        setTripName("");
        fetchTrips();
        onSelectTrip({ id: docRef.id, ...newTrip });
    };

    const openTrip = (trip) => {
        onSelectTrip(trip);        
    };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Your Trips</Text>

            <FlatList
                data={trips}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.tripItem}
                        onPress={() => onSelectTrip(item)}
                    >
                        <Text style={styles.tripName}>{item.name}</Text>
                    </TouchableOpacity>
                )}
            />

            {/* Floating + Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate("CreateTrip", { user })}
            >
                <Ionicons name="add" size={32} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    heading: { fontSize: 20, fontWeight: "bold", marginTop: 20 },
    input: {
        borderWidth: 1,
        borderColor: "#aaa",
        padding: 10,
        borderRadius: 5,
        marginVertical: 10,
    },
    tripItem: {
        backgroundColor: "#E6F0FF",
        padding: 20,
        marginVertical: 8,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 4,
    },
    tripName: {
        fontSize: 18,
        fontWeight: "600",
        color: "#003366",
        textAlign: "center",
    },
    fab: {
        position: "absolute",
        bottom: 24,
        right: 24,
        backgroundColor: "#007AFF",
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: "center",
        justifyContent: "center",
        elevation: 6,
    },
});
