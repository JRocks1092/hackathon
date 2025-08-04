import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ScrollView } from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { db } from "../firebase";
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
} from "firebase/firestore";

export default function AddStopScreen({ route, trip, user }) {
    const [stops, setStops] = useState([]);

    useEffect(() => {
        const q = query(
            collection(db, "trips", trip.id, "stops"),
            orderBy("timestamp", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
            setStops(data);
        });

        return unsubscribe;
    }, [trip.id]);

    const handlePlaceSelect = async (data, details) => {
        const loc = details.geometry.location;

        const stopData = {
            name: data.description,
            latitude: loc.lat,
            longitude: loc.lng,
            addedBy: user.email,
            timestamp: serverTimestamp(),
        };

        await addDoc(collection(db, "trips", trip.id, "stops"), stopData);
    };

    const renderItem = ({ item }) => (
        <View style={styles.stopItem}>
            <Text style={styles.stopName}>{item.name}</Text>
            <Text style={styles.stopMeta}>Added by: {item.addedBy}</Text>
        </View>
    );

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
            <View style={{ flex: 1, padding: 10 }}>
                <GooglePlacesAutocomplete
                    placeholder="Search for a stop"
                    fetchDetails={true}
                    predefinedPlaces={[]}
                    onPress={(data, details = null) => {
                        const lat = details?.geometry?.location?.lat;
                        const lng = details?.geometry?.location?.lng;

                        console.log('Selected:', data.description);
                        console.log('Coords:', lat, lng);

                        // Save to Firestore or setState here
                    }}
                    query={{
                        key: 'AIzaSyCxgtc0mGbl0CAX-O9IqPWQw2iAASgdOQI',
                        language: 'en',
                    }}
                    styles={{
                        container: { flex: 0 },
                        textInputContainer: {
                            width: '100%',
                        },
                        textInput: {
                            height: 44,
                            color: '#5d5d5d',
                            fontSize: 16,
                        },
                    }}
                />

                <FlatList
                    data={stops}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListEmptyComponent={<Text>No stops added yet</Text>}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContainer: {
        flexGrow: 1,
        justifyContent: "flex-start",
        padding: 16,
        backgroundColor: "#f9f9f9",
    },
    container: {
        flex: 1,
    },
    stopItem: {
        backgroundColor: "#fff",
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        elevation: 2,
        shadowColor: "#000",
        shadowOpacity: 0.1,
        shadowRadius: 3,
    },
    stopName: {
        fontSize: 16,
        fontWeight: "bold",
    },
    stopMeta: {
        fontSize: 12,
        color: "#555",
        marginTop: 4,
    },
});
