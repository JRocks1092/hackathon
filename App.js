 import 'react-native-get-random-values'; // Must be the first import
import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import LoginScreen from "./screens/LoginScreen";
import TripsScreen from "./screens/TripsScreen";
import FriendsScreen from "./screens/FriendsScreen";
import MapScreen from "./screens/MapScreen";
import TripMembersScreen from "./screens/TripMembersScreen";
import CreateTripScreen from "./screens/CreateTripScreen";
import NotificationsScreen from "./screens/NotificationScreen";
import AddStopScreen from "./screens/StopsScreen";
import { Alert } from "react-native";


const Stack = createNativeStackNavigator();
const MainTab = createBottomTabNavigator();
const TripTab = createBottomTabNavigator();

function MainTabs({ user, onTripSelect, clearTrip }) {
  useFocusEffect(
    useCallback(() => {
      // Reset trip whenever returning to Home screen
      clearTrip();
    }, [])
  );

  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Trips') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Friends') {
            iconName = focused ? 'people' : 'people-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}>
      <MainTab.Screen name="Trips">
        {(props) => (
          <TripsScreen
            {...props}
            user={user}
            onSelectTrip={onTripSelect}
          />
        )}
      </MainTab.Screen>
      <MainTab.Screen name="Friends">
        {(props) => <FriendsScreen {...props} user={user} />}
      </MainTab.Screen>
    </MainTab.Navigator>
  );
}

function TripTabs({ user, trip, initialTab = "Map" }) {
  console.log("Hello");
  if (!trip || !user) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Missing trip or user data.</Text>
      </View>
    );
  }
  useEffect(() => {
    const q = query(
      collection(db, `trips/${trip.id}/notifications`),
      orderBy('timestamp', 'desc')
    );


    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notif = change.doc.data();

          Notifications.scheduleNotificationAsync({
            content: {
              title:
                notif.type === 'emergency'
                  ? '🚨 Emergency Alert'
                  : '🔔 Trip Notification',
              body: notif.message,
              sound: null, // no sound
            },
            trigger: null,
          });
        }
      });
    });

    return () => unsubscribe();
  }, [trip?.id]);
  return (
    <TripTab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Map') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'Members') {
            iconName = focused ? 'person-add' : 'person-add-outline';
          }
          else if (route.name === 'Stops') {
            iconName = focused ? 'location' : 'location-outline';
          }else if (route.name === 'Notify') {
            iconName = focused ? 'notifications' : 'notifications-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <TripTab.Screen name="Map">
        {(props) => <MapScreen {...props} user={user} tripId={trip.id} />}
      </TripTab.Screen>
      <TripTab.Screen name="Notify">
        {(props) => <NotificationsScreen {...props} user={user} trip={trip} />}
      </TripTab.Screen>
      <TripTab.Screen name="Members">
        {(props) => <TripMembersScreen {...props} user={user} trip={trip} />}
      </TripTab.Screen>
      <TripTab.Screen name="Stops">
        {(props) => (
          <AddStopScreen
            {...props}
            user={user}
            trip={trip}
          />
        )}
      </TripTab.Screen>
    </TripTab.Navigator>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [trip, setTrip] = useState(null);
  const [navigationRef, setNavigationRef] = useState(null);

  // Wait for trip to be set, then navigate
  useEffect(() => {
    if (trip && navigationRef) {
      navigationRef.navigate("Trip");
    }
  }, [trip, navigationRef]);

  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);
  useEffect(() => {
    (async () => {
      const permission = await Location.requestBackgroundPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Location Permission Required",
          "This app requires location access to function properly."
        );
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={(nav) => setNavigationRef(nav)}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!user ? (
            <Stack.Screen name="Login">
              {(props) => <LoginScreen {...props} onLogin={setUser} />}
            </Stack.Screen>
          ) : (
            <>
              <Stack.Screen name="Home">
                {(props) => (
                  <MainTabs
                    {...props}
                    user={user}
                    clearTrip={() => setTrip(null)}
                    onTripSelect={(selectedTrip) => {
                      Alert.alert(selectedTrip.id);
                      setTrip(selectedTrip);
                      props.navigation.navigate("Trip");
                    }}
                  />
                )}
              </Stack.Screen>

              <Stack.Screen name="CreateTrip" component={CreateTripScreen} />

              <Stack.Screen name="Trip">
                {(props) => trip ? (
                  <TripTabs {...props} user={user} trip={trip} />
                ) : (
                  <View><Text>No Trip Selected</Text></View>
                )}
              </Stack.Screen>


            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
