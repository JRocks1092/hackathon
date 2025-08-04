// useLiveLocation.js
import * as Location from "expo-location";
import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const requestLocationPermission = async () => {
  const { granted } = await Location.requestForegroundPermissionsAsync();
  if (!granted) {
    Alert.alert(
      "Location Permission Required",
      "Please enable location permissions to use this feature."
    );
    return false;
  }
  return true;
};

export function useLiveLocation(user, tripId) {
  console.log(user, tripId);
  useEffect(() => {
    (
      async () => {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) return;
        if (!user?.email || !tripId) return;


        let locationSubscription = null;

        const startTracking = async () => {
          try {
            locationSubscription = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 5000,        // update every 5 seconds
                distanceInterval: 5,       // or every 5 meters
              },
              async (loc) => {
                console.log("loc updated");

                const locationRef = doc(db, "locations", user.email);
                await setDoc(locationRef, {
                  email: user.email,
                  tripId: tripId,
                  latitude: loc.coords.latitude,
                  longitude: loc.coords.longitude,
                  timestamp: Date.now(),
                });
              }
            );
          } catch (error) {
            console.error("Location tracking error:", error);
          }
        };

        startTracking();

        return () => {
          if (locationSubscription) {
            locationSubscription.remove();
          }
        };
      })();
  }, [user?.email, tripId]);
}





