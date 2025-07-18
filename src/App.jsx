import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// Tailwind CSS is assumed to be available in the environment.

function App() {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [currentView, setCurrentView] = useState('map'); // 'map', 'expenses', 'alerts'
  const [friendsLocations, setFriendsLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [markedRestaurants, setMarkedRestaurants] = useState([]);
  const [markedSpots, setMarkedSpots] = useState([]); // New state for marked spots
  const [myLocation, setMyLocation] = useState({ latitude: 0, longitude: 0 });
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showMarkRestaurantModal, setShowMarkRestaurantModal] = useState(false);
  const [showMarkSpotModal, setShowMarkSpotModal] = useState(false); // New state for mark spot modal
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null); // New state for selected spot
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [isAuthReady, setIsAuthReady] = useState(false);

  // Define the geographical bounds for the simulated Kochi map
  const minLat = 9.90;
  const maxLat = 10.05;
  const minLon = 76.20;
  const maxLon = 76.35;

  // Function to map real-world lat/lon to SVG viewBox coordinates (0-1000)
  const mapLatLonToSvg = (lat, lon) => {
    const svgWidth = 1000;
    const svgHeight = 1000;

    // Calculate x position: scale longitude to the SVG width
    const x = ((lon - minLon) / (maxLon - minLon)) * svgWidth;
    // Calculate y position: scale latitude to the SVG height, and invert Y
    const y = ((maxLat - lat) / (maxLat - minLat)) * svgHeight;

    return { x, y };
  };

  // Mock data for restaurants (in a real app, this would come from a Maps API)
  const mockRestaurants = [
    { id: 'r1', name: 'Spice Route', rating: 4.5, lat: 9.9816, lon: 76.2999, address: 'MG Road, Kochi' },
    { id: 'r2', name: 'Kashi Art Cafe', rating: 4.7, lat: 9.9663, lon: 76.2423, address: 'Fort Kochi' },
    { id: 'r3', name: 'Dhe Puttu', rating: 4.2, lat: 9.9700, lon: 76.3200, address: 'Edappally, Kochi' },
    { id: 'r4', name: 'Grand Hotel Restaurant', rating: 4.0, lat: 9.9760, lon: 76.2890, address: 'Shenoys, Kochi' },
  ];

  // New mock data for famous spots
  const mockSpots = [
    { id: 's1', name: 'Fort Kochi Beach', lat: 9.9654, lon: 76.2415, description: 'Historic beach with Chinese fishing nets.' },
    { id: 's2', name: 'Mattancherry Palace', lat: 9.9599, lon: 76.2621, description: 'Dutch Palace with murals and artifacts.' },
    { id: 's3', name: 'Jew Town', lat: 9.9602, lon: 76.2638, description: 'Area known for antique shops and synagogue.' },
    { id: 's4', name: 'Marine Drive', lat: 9.9740, lon: 76.2840, description: 'Scenic promenade overlooking the backwaters.' },
  ];

  // Firebase Initialization and Authentication
  useEffect(() => {
    try {
      const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
      const app = initializeApp(firebaseConfig);
      const authInstance = getAuth(app);
      const firestoreInstance = getFirestore(app);
      setDb(firestoreInstance);
      setAuth(authInstance);

      const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
        if (user) {
          setUserId(user.uid);
          console.log("Authenticated user ID:", user.uid);
        } else {
          if (typeof __initial_auth_token === 'undefined') {
            await signInAnonymously(authInstance);
            console.log("Signed in anonymously.");
          }
        }
        setIsAuthReady(true);
      });

      const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
      if (initialAuthToken) {
        signInWithCustomToken(authInstance, initialAuthToken)
          .then(() => console.log("Signed in with custom token."))
          .catch((error) => console.error("Error signing in with custom token:", error));
      }

      return () => unsubscribe();
    } catch (error) {
      console.error("Firebase initialization error:", error);
    }
  }, []);

  // Set up Firestore listeners once auth is ready and userId is available
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tripId = appId; // Using appId as tripId for simplicity

    // Live Location Listener
    const unsubscribeLocation = onSnapshot(collection(db, `artifacts/${appId}/users`), (snapshot) => {
      const locationsPromises = [];
      snapshot.forEach(userDoc => {
        locationsPromises.push(getDoc(doc(db, `artifacts/${appId}/users/${userDoc.id}/locations`, 'myLocation'))
          .then(locDoc => {
            if (locDoc.exists()) {
              return { id: userDoc.id, ...locDoc.data() };
            }
            return null;
          })
          .catch(e => {
            console.error("Error fetching friend location for user:", userDoc.id, e);
            return null;
          })
        );
      });

      Promise.all(locationsPromises).then(results => {
        setFriendsLocations(results.filter(loc => loc !== null));
      });
    }, (error) => console.error("Error fetching friend locations:", error));

    // Alerts Listener
    const unsubscribeAlerts = onSnapshot(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/alerts`), (snapshot) => {
      const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAlerts(fetchedAlerts.sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => console.error("Error fetching alerts:", error));

    // Expenses Listener
    const unsubscribeExpenses = onSnapshot(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/expenses`), (snapshot) => {
      const fetchedExpenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExpenses(fetchedExpenses.sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => console.error("Error fetching expenses:", error));

    // Marked Restaurants Listener
    const unsubscribeMarkedRestaurants = onSnapshot(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/markedRestaurants`), (snapshot) => {
      const fetchedMarkedRestaurants = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMarkedRestaurants(fetchedMarkedRestaurants);
    }, (error) => console.error("Error fetching marked restaurants:", error));

    // Marked Spots Listener
    const unsubscribeMarkedSpots = onSnapshot(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/markedSpots`), (snapshot) => {
      const fetchedMarkedSpots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMarkedSpots(fetchedMarkedSpots);
    }, (error) => console.error("Error fetching marked spots:", error));

    return () => {
      unsubscribeLocation();
      unsubscribeAlerts();
      unsubscribeExpenses();
      unsubscribeMarkedRestaurants();
      unsubscribeMarkedSpots();
    };
  }, [db, userId, isAuthReady]);

  // Simulate live location updates
  useEffect(() => {
    if (!db || !userId || !isAuthReady) return;

    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const myLocationDocRef = doc(db, `artifacts/${appId}/users/${userId}/locations`, 'myLocation');

    const interval = setInterval(async () => {
      const newLat = minLat + (Math.random() * (maxLat - minLat));
      const newLon = minLon + (Math.random() * (maxLon - minLon));
      const updatedLocation = { latitude: newLat, longitude: newLon, timestamp: Date.now() };
      setMyLocation(updatedLocation);
      try {
        await setDoc(myLocationDocRef, updatedLocation, { merge: true });
      } catch (e) {
        console.error("Error updating location:", e);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [db, userId, isAuthReady]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tripId = appId;
    const form = e.target;
    const amount = parseFloat(form.amount.value);
    const description = form.description.value;
    const location = form.location.value;
    const payer = form.payer.value;
    const participants = Array.from(form.participants.selectedOptions).map(option => option.value);
    const paymentMode = form.paymentMode.value;

    if (isNaN(amount) || !description || !location || !payer || participants.length === 0) {
      console.error("Please fill all expense fields correctly.");
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/expenses`), {
        amount,
        description,
        location,
        payer,
        participants,
        paymentMode,
        timestamp: Date.now(),
        addedBy: userId,
      });
      setShowExpenseModal(false);
      form.reset();
    } catch (e) {
      console.error("Error adding expense:", e);
    }
  };

  const handleMarkRestaurant = async (restaurantId, message) => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tripId = appId;
    const restaurant = mockRestaurants.find(r => r.id === restaurantId);
    if (!restaurant) return;

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/markedRestaurants`), {
        ...restaurant,
        markedBy: userId,
        message: message,
        timestamp: Date.now(),
      });
      await addDoc(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/alerts`), {
        type: 'restaurant',
        message: `${getFriendName(userId)} marked ${restaurant.name}: ${message}`,
        timestamp: Date.now(),
        senderId: userId,
        restaurantId: restaurant.id,
      });
      setShowMarkRestaurantModal(false);
      setSelectedRestaurant(null);
    } catch (e) {
      console.error("Error marking restaurant:", e);
    }
  };

  const handleMarkSpot = async (spotId, message) => {
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tripId = appId;
    const spot = mockSpots.find(s => s.id === spotId);
    if (!spot) return;

    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/markedSpots`), {
        ...spot,
        markedBy: userId,
        message: message,
        timestamp: Date.now(),
      });
      await addDoc(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/alerts`), {
        type: 'spot',
        message: `${getFriendName(userId)} marked ${spot.name}: ${message}`,
        timestamp: Date.now(),
        senderId: userId,
        spotId: spot.id,
      });
      setShowMarkSpotModal(false);
      setSelectedSpot(null);
    } catch (e) {
      console.error("Error marking spot:", e);
    }
  };

  const handleSendAlert = async () => {
    if (!alertMessage.trim()) {
      console.error("Alert message cannot be empty.");
      return;
    }
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const tripId = appId;
    try {
      await addDoc(collection(db, `artifacts/${appId}/public/data/trips/${tripId}/alerts`), {
        type: 'emergency',
        message: alertMessage,
        timestamp: Date.now(),
        senderId: userId,
      });
      setAlertMessage('');
      setShowAlertModal(false);
    } catch (e) {
      console.error("Error sending alert:", e);
    }
  };

  const calculateSplits = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const userContributions = {};
    const userShares = {};

    friendsLocations.forEach(friend => {
      userContributions[friend.id] = 0;
      userShares[friend.id] = 0;
    });

    expenses.forEach(exp => {
      userContributions[exp.payer] = (userContributions[exp.payer] || 0) + exp.amount;
      const sharePerParticipant = exp.amount / exp.participants.length;
      exp.participants.forEach(pId => {
        userShares[pId] = (userShares[pId] || 0) + sharePerParticipant;
      });
    });

    const settlement = {};
    for (const user of Object.keys(userContributions)) {
      const net = userContributions[user] - userShares[user];
      if (net > 0) {
        settlement[user] = { type: 'owes', amount: net };
      } else if (net < 0) {
        settlement[user] = { type: 'gets back', amount: -net };
      } else {
        settlement[user] = { type: 'settled', amount: 0 };
      }
    }
    return settlement;
  };

  const settlementSummary = calculateSplits();

  // Mock phone numbers for calling (in a real app, these would be user profiles)
  const mockPhoneNumbers = {
    'user1': '+919876543210',
    'user2': '+919988776655',
    'user3': '+919123456789',
  };

  const getFriendName = (id) => {
    return id === userId ? "You" : `Friend ${id.substring(0, 4)}`;
  };

  if (!isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl font-semibold text-gray-700">Loading app...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-inter">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4 shadow-md flex justify-between items-center rounded-b-lg">
        <h1 className="text-2xl font-bold">Travel Buddy</h1>
        <div className="text-sm">Your ID: <span className="font-mono">{userId}</span></div>
      </header>

      {/* Main Content */}
      <main className="flex-grow p-4 overflow-auto">
        {currentView === 'map' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Live Map & Points of Interest</h2>
            <div className="bg-white p-4 rounded-lg shadow-md h-96 flex flex-col items-center justify-center relative overflow-hidden border border-gray-200">
              {/* More realistic SVG map of Kochi coastline and backwaters */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#a7e0f9" />
                    <stop offset="100%" stopColor="#4a90e2" />
                  </linearGradient>
                  <linearGradient id="landGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#8bc34a" />
                    <stop offset="100%" stopColor="#689f38" />
                  </linearGradient>
                  <linearGradient id="backwaterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#81d4fa" />
                    <stop offset="100%" stopColor="#4fc3f7" />
                  </linearGradient>
                </defs>

                {/* Ocean Background */}
                <rect x="0" y="0" width="1000" height="1000" fill="url(#oceanGradient)" />

                {/* Main Landmass - simplified representation of Kochi's geography */}
                <path fill="url(#landGradient)" stroke="#33691e" strokeWidth="5"
                  d="M 50 800
                     C 100 750, 150 700, 200 680
                     C 250 670, 300 680, 350 700
                     L 400 750
                     C 450 800, 500 850, 550 800
                     L 600 750
                     C 650 700, 700 650, 750 680
                     L 800 700
                     C 850 750, 900 800, 950 750
                     L 980 650
                     V 100
                     C 950 50, 850 0, 750 50
                     L 650 100
                     C 550 150, 450 100, 350 150
                     L 250 200
                     C 150 250, 100 300, 50 250 Z"
                />

                {/* Fort Kochi Peninsula - a more distinct land feature */}
                <path fill="url(#landGradient)" stroke="#33691e" strokeWidth="3"
                  d="M 150 500
                     C 180 450, 220 450, 250 500
                     L 280 550
                     C 250 600, 200 600, 170 550 Z"
                />

                {/* Backwaters/Lakes - more intricate shapes */}
                <path fill="url(#backwaterGradient)" stroke="#4fc3f7" strokeWidth="3"
                  d="M 300 700
                     C 320 650, 380 600, 450 650
                     L 500 700
                     C 550 750, 500 800, 400 780
                     L 350 730 Z"
                />
                <path fill="url(#backwaterGradient)" stroke="#4fc3f7" strokeWidth="3"
                  d="M 200 300
                     C 250 250, 300 200, 350 250
                     L 380 300
                     C 350 350, 300 400, 250 350 Z"
                />
                <path fill="url(#backwaterGradient)" stroke="#4fc3f7" strokeWidth="3"
                  d="M 500 400
                     C 550 350, 650 350, 700 400
                     L 750 500
                     C 700 550, 600 550, 550 500 Z"
                />
                <path fill="url(#backwaterGradient)" stroke="#4fc3f7" strokeWidth="3"
                  d="M 100 600
                     C 120 580, 180 550, 250 580
                     L 280 620
                     C 250 650, 200 670, 150 630 Z"
                />

                {/* City Label */}
                <text x="500" y="50" textAnchor="middle" fontSize="40" fontWeight="bold" fill="#333">Kochi</text>
              </svg>

              {/* Your location */}
              {(() => {
                const { x, y } = mapLatLonToSvg(myLocation.latitude, myLocation.longitude);
                return (
                  <div className="absolute z-20" style={{ top: `${y / 1000 * 100}%`, left: `${x / 1000 * 100}%` }}>
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600" title="Your Location"></span>
                    </span>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-blue-800 bg-blue-100 px-1 py-0.5 rounded-md whitespace-nowrap">You</span>
                  </div>
                );
              })()}

              {/* Friends' locations */}
              {friendsLocations.map(friend => {
                if (friend.id === userId || !friend.latitude || !friend.longitude) return null;
                const { x, y } = mapLatLonToSvg(friend.latitude, friend.longitude);
                return (
                  <div key={friend.id} className="absolute z-10" style={{ top: `${y / 1000 * 100}%`, left: `${x / 1000 * 100}%` }}>
                    <span className="relative flex h-4 w-4">
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500" title={`Friend ${friend.id.substring(0, 4)}`}></span>
                    </span>
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-semibold text-green-800 bg-green-100 px-1 py-0.5 rounded-md whitespace-nowrap">{getFriendName(friend.id)}</span>
                  </div>
                );
              })}

              {/* Mock Restaurants */}
              {mockRestaurants.map(restaurant => {
                const { x, y } = mapLatLonToSvg(restaurant.lat, restaurant.lon);
                return (
                  <div key={restaurant.id} className="absolute z-10 cursor-pointer"
                       style={{ top: `${y / 1000 * 100}%`, left: `${x / 1000 * 100}%` }}
                       onClick={() => { setSelectedRestaurant(restaurant); setShowMarkRestaurantModal(true); }}>
                    <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
                    </svg>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-800 bg-white bg-opacity-80 px-1 rounded-md whitespace-nowrap">{restaurant.name}</span>
                  </div>
                );
              })}

              {/* New: Mock Spots */}
              {mockSpots.map(spot => {
                const { x, y } = mapLatLonToSvg(spot.lat, spot.lon);
                return (
                  <div key={spot.id} className="absolute z-10 cursor-pointer"
                       style={{ top: `${y / 1000 * 100}%`, left: `${x / 1000 * 100}%` }}
                       onClick={() => { setSelectedSpot(spot); setShowMarkSpotModal(true); }}>
                    <svg className="h-6 w-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2h1v-.08c-2.09-.44-3.47-2.31-3.47-4.42 0-2.31 1.9-4.21 4.21-4.21s4.21 1.9 4.21 4.21c0 1.96-1.36 3.65-3.23 4.13l.01.01V19c3.95-.49 7-3.85 7-7.93 0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10z"/></svg>
                    <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-gray-800 bg-white bg-opacity-80 px-1 rounded-md whitespace-nowrap">{spot.name}</span>
                  </div>
                );
              })}
            </div>
            {/* Map Legend */}
            <div className="bg-white p-3 rounded-lg shadow-md text-sm text-gray-700">
              <h4 className="font-semibold mb-2">Map Legend:</h4>
              <div className="flex items-center mb-1">
                <span className="h-4 w-4 rounded-full bg-blue-600 mr-2"></span> Your Location
              </div>
              <div className="flex items-center mb-1">
                <span className="h-4 w-4 rounded-full bg-green-500 mr-2"></span> Friend's Location
              </div>
              <div className="flex items-center mb-1">
                <svg className="h-5 w-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/></svg> Restaurant
              </div>
              <div className="flex items-center">
                <svg className="h-5 w-5 text-purple-600 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2h1v-.08c-2.09-.44-3.47-2.31-3.47-4.42 0-2.31 1.9-4.21 4.21-4.21s4.21 1.9 4.21 4.21c0 1.96-1.36 3.65-3.23 4.13l.01.01V19c3.95-.49 7-3.85 7-7.93 0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10z"/></svg> Spot
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Nearby Restaurants (Mock Data)</h3>
              <ul className="divide-y divide-gray-200">
                {mockRestaurants.map(restaurant => (
                  <li key={restaurant.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{restaurant.name} <span className="text-sm text-gray-500">({restaurant.address})</span></p>
                      <p className="text-sm text-gray-600">Rating: {restaurant.rating} ⭐</p>
                    </div>
                    <button
                      onClick={() => { setSelectedRestaurant(restaurant); setShowMarkRestaurantModal(true); }}
                      className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-md shadow-sm transition duration-200 ease-in-out transform hover:scale-105"
                    >
                      Mark & Alert
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Well-known Spots Nearby (Mock Data)</h3>
              <ul className="divide-y divide-gray-200">
                {mockSpots.map(spot => (
                  <li key={spot.id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-900">{spot.name}</p>
                      <p className="text-sm text-gray-600">{spot.description}</p>
                    </div>
                    <button
                      onClick={() => { setSelectedSpot(spot); setShowMarkSpotModal(true); }}
                      className="bg-purple-500 hover:bg-purple-600 text-white text-sm px-3 py-1 rounded-md shadow-sm transition duration-200 ease-in-out transform hover:scale-105"
                    >
                      Mark & Alert
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Marked Places</h3>
              {markedRestaurants.length === 0 && markedSpots.length === 0 ? (
                <p className="text-gray-500">No places marked yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {markedRestaurants.map(mr => (
                    <li key={mr.id + mr.timestamp} className="py-2">
                      <p className="font-medium text-gray-900">{mr.name} (Restaurant)</p>
                      <p className="text-sm text-gray-600">Marked by {getFriendName(mr.markedBy)} at {new Date(mr.timestamp).toLocaleTimeString()}</p>
                      <p className="text-sm text-gray-700 italic">"{mr.message}"</p>
                    </li>
                  ))}
                  {markedSpots.map(ms => (
                    <li key={ms.id + ms.timestamp} className="py-2">
                      <p className="font-medium text-gray-900">{ms.name} (Spot)</p>
                      <p className="text-sm text-gray-600">Marked by {getFriendName(ms.markedBy)} at {new Date(ms.timestamp).toLocaleTimeString()}</p>
                      <p className="text-sm text-gray-700 italic">"{ms.message}"</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Route Planning</h3>
              <p className="text-gray-600 mb-3">
                Select a destination from the marked places or map to plan a route.
                (Full route planning functionality requires integration with a mapping API.)
              </p>
              <button
                onClick={() => alert("Route planning feature coming soon! (Requires a mapping API integration)")}
                className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105"
              >
                Plan Route
              </button>
            </div>
          </div>
        )}

        {currentView === 'expenses' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Trip Expenses</h2>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105"
            >
              Add New Expense
            </button>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Expense List</h3>
              {expenses.length === 0 ? (
                <p className="text-gray-500">No expenses added yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {expenses.map(exp => (
                    <li key={exp.id} className="py-2">
                      <p className="font-medium text-gray-900">{exp.description} - ₹{exp.amount.toFixed(2)}</p>
                      <p className="text-sm text-gray-600">Paid by: {getFriendName(exp.payer)}</p>
                      <p className="text-sm text-gray-600">For: {exp.participants.map(p => getFriendName(p)).join(', ')}</p>
                      <p className="text-sm text-gray-600">Location: {exp.location} ({exp.paymentMode})</p>
                      <p className="text-xs text-gray-500">Added at: {new Date(exp.timestamp).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Expense Settlement</h3>
              {Object.keys(settlementSummary).length === 0 ? (
                <p className="text-gray-500">Add expenses to see settlement.</p>
              ) : (
                <ul className="space-y-1">
                  {Object.entries(settlementSummary).map(([id, data]) => (
                    <li key={id} className="text-gray-700">
                      <span className="font-medium">{getFriendName(id)}</span> {data.type === 'owes' ? 'owes' : data.type === 'gets back' ? 'gets back' : 'is'} ₹{Math.abs(data.amount).toFixed(2)}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {currentView === 'alerts' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Alerts & Emergency</h2>
            <button
              onClick={() => setShowAlertModal(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200 ease-in-out transform hover:scale-105"
            >
              Send Emergency Alert
            </button>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Recent Alerts</h3>
              {alerts.length === 0 ? (
                <p className="text-gray-500">No alerts yet.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {alerts.map(alert => (
                    <li key={alert.id} className="py-2">
                      <p className="font-medium text-gray-900">
                        <span className={`text-sm font-semibold ${alert.type === 'emergency' ? 'text-red-600' : alert.type === 'restaurant' ? 'text-blue-600' : 'text-purple-600'}`}>
                          [{alert.type.toUpperCase()}]
                        </span> {alert.message}
                      </p>
                      <p className="text-sm text-gray-600">From: {getFriendName(alert.senderId)} at {new Date(alert.timestamp).toLocaleTimeString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Call Friends</h3>
              <ul className="space-y-2">
                {friendsLocations.map(friend => (
                  friend.id !== userId && (
                    <li key={friend.id} className="flex justify-between items-center py-1">
                      <span className="font-medium text-gray-800">{getFriendName(friend.id)}</span>
                      <a
                        href={`tel:${mockPhoneNumbers[friend.id] || ''}`}
                        className="bg-blue-500 hover:bg-blue-600 text-white text-sm px-3 py-1 rounded-md shadow-sm transition duration-200 ease-in-out transform hover:scale-105"
                      >
                        Call {mockPhoneNumbers[friend.id] ? '' : '(N/A)'}
                      </a>
                    </li>
                  )
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Navigation Bar */}
      <nav className="bg-white border-t border-gray-200 p-2 flex justify-around items-center shadow-lg rounded-t-lg">
        <button
          onClick={() => { setCurrentView('map'); }}
          className={`flex flex-col items-center p-2 rounded-lg transition duration-200 ${currentView === 'map' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span className="text-xs mt-1">Map</span>
        </button>
        <button
          onClick={() => { setCurrentView('expenses'); }}
          className={`flex flex-col items-center p-2 rounded-lg transition duration-200 ${currentView === 'expenses' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0h.01M9 12h6m-5 0h.01M9 16h6m-5 0h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span className="text-xs mt-1">Expenses</span>
        </button>
        <button
          onClick={() => { setCurrentView('alerts'); }}
          className={`flex flex-col items-center p-2 rounded-lg transition duration-200 ${currentView === 'alerts' ? 'text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'}`}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <span className="text-xs mt-1">Alerts</span>
        </button>
      </nav>

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Add New Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
                <input type="number" id="amount" name="amount" step="0.01" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
                <input type="text" id="description" name="description" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
                <input type="text" id="location" name="location" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div>
                <label htmlFor="payer" className="block text-sm font-medium text-gray-700">Paid By</label>
                <select id="payer" name="payer" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
                  {friendsLocations.map(friend => (
                    <option key={friend.id} value={friend.id}>{getFriendName(friend.id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="participants" className="block text-sm font-medium text-gray-700">For Whom (Select all that apply)</label>
                <select id="participants" name="participants" multiple required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 h-24">
                  {friendsLocations.map(friend => (
                    <option key={friend.id} value={friend.id}>{getFriendName(friend.id)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="paymentMode" className="block text-sm font-medium text-gray-700">Mode of Payment</label>
                <select id="paymentMode" name="paymentMode" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
                >
                  Add Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Restaurant Modal */}
      {showMarkRestaurantModal && selectedRestaurant && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Mark "{selectedRestaurant.name}"</h3>
            <p className="mb-4 text-gray-700">Rating: {selectedRestaurant.rating} ⭐</p>
            <form onSubmit={(e) => { e.preventDefault(); handleMarkRestaurant(selectedRestaurant.id, e.target.message.value); }} className="space-y-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message for friends:</label>
                <textarea id="message" name="message" rows="3" placeholder="e.g., 'Let's try this for dinner!'" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowMarkRestaurantModal(false); setSelectedRestaurant(null); }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
                >
                  Mark & Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New: Mark Spot Modal */}
      {showMarkSpotModal && selectedSpot && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Mark "{selectedSpot.name}"</h3>
            <p className="mb-4 text-gray-700">{selectedSpot.description}</p>
            <form onSubmit={(e) => { e.preventDefault(); handleMarkSpot(selectedSpot.id, e.target.message.value); }} className="space-y-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message for friends:</label>
                <textarea id="message" name="message" rows="3" placeholder="e.g., 'Great place for photos!'" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-purple-500 focus:border-purple-500"></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowMarkSpotModal(false); setSelectedSpot(null); }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
                >
                  Mark & Alert
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 text-gray-800">Send Alert</h3>
            <div className="space-y-4">
              <div>
                <label htmlFor="alertMsg" className="block text-sm font-medium text-gray-700">Alert Message:</label>
                <textarea
                  id="alertMsg"
                  rows="3"
                  value={alertMessage}
                  onChange={(e) => setAlertMessage(e.target.value)}
                  placeholder="e.g., 'Emergency! Need help at my location.' or 'Quick stop at the next gas station.'"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-red-500 focus:border-red-500"
                ></textarea>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => { setShowAlertModal(false); setAlertMessage(''); }}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendAlert}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-200"
                >
                  Send Alert
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
