import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { db } from '../firebase';
import { onSnapshot, collection, query, where } from 'firebase/firestore';
import CustomUserMarker from '../comonents/CustomUserMarker';
import { useLiveLocation } from '../useLiveLocation';


export default function MapScreen({ user, tripId }) {
    const [locations, setLocations] = useState([]);
    const [stops, setStops] = useState([]);
    useLiveLocation(user, tripId);

    useEffect(() => {
        const stopsRef = collection(db, "trips", tripId, "stops");
        const unsubscribe = onSnapshot(stopsRef, (snapshot) => {
            const stopData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            }));
            setStops(stopData);
        });

        return unsubscribe;
    }, [tripId]);

    useEffect(() => {
        if (!tripId) return;
        const q = query(collection(db, "locations"), where("tripId", "==", tripId));

        const unsub = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map((doc) => doc.data());
            setLocations(data);
        });

        return () => unsub();
    }, [tripId]);

    return (
        <MapView
            style={styles.map}
            showsUserLocation
            initialRegion={{
                latitude: 10.8505,
                longitude: 76.2711,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }}
        >
            {locations.map((u) => (

                <CustomUserMarker
                    key={u.email}
                    coordinate={{
                        latitude: u.latitude,
                        longitude: u.longitude,
                    }}
                    email={u.email}
                />
            ))}
            {stops.map((stop, index) => (
                <Marker
                    key={index}
                    coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
                    title={stop.name}
                    pinColor="green"
                />
            ))}
        </MapView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: Dimensions.get("window").width, height: Dimensions.get("window").height },
});