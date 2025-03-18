import React, { useEffect, useState, useRef } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  Alert,
} from "react-native";
import MapView, {
  Marker,
  AnimatedRegion,
  Polyline,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import * as Location from "expo-location";
import haversine from "haversine";
import Toast from 'react-native-toast-message';


// Define initial deltas
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;

const AnimatedMarkers = () => {
  const [location, setLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceTravelled, setDistanceTravelled] = useState(0);
  const [prevLatLng, setPrevLatLng] = useState({});
  const coordinate = useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;

  const markerRef = useRef(null);

  // Function to send location to the server
  const sendLocationToServer = async (latitude, longitude) => {
    try {
      const response = await fetch(
        "https://live-track-back-production.up.railway.app/api/update-location",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ latitude, longitude }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send location");
      }
      console.log("Location sent successfully");
    } catch (error) {
      console.error("Error sending location:", error);
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Enable location permissions to use the app.");
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
      setLocation({ latitude, longitude });

      coordinate.setValue({ latitude, longitude, latitudeDelta: 0, longitudeDelta: 0 });

      // Watch for location updates
      const locationSubscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 10 },
        (position) => {
          const { latitude, longitude } = position.coords;
          const newCoordinate = { latitude, longitude };

          if (Platform.OS === "android" && markerRef.current) {
            markerRef.current.animateMarkerToCoordinate(newCoordinate, 500);
          } else {
            coordinate.timing(newCoordinate).start();
          }

          setRouteCoordinates((prev) => [...prev, newCoordinate]);
          setDistanceTravelled((prev) => prev + calcDistance(newCoordinate));
          setPrevLatLng(newCoordinate);
        }
      );

      // Send location to the server every 5 seconds
      const interval = setInterval(() => {
        if (location) {
          sendLocationToServer(location.latitude, location.longitude);
        }
      }, 12000);

      return () => {
        locationSubscription.remove();
        clearInterval(interval);
      };
    })();
  }, []);

  // Calculate distance between previous and new location
  const calcDistance = (newLatLng) => haversine(prevLatLng, newLatLng) || 0;

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsUserLocation
          followsUserLocation
          loadingEnabled
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: LATITUDE_DELTA,
            longitudeDelta: LONGITUDE_DELTA,
          }}
        >
          <Polyline coordinates={routeCoordinates} strokeWidth={5} />
          <Marker.Animated ref={markerRef} coordinate={coordinate} />
        </MapView>
      ) : (
        <Text>Fetching location...</Text>
      )}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.bubble, styles.button]}>
          <Text style={styles.bottomBarContent}>
            {parseFloat(distanceTravelled).toFixed(2)} km
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  bubble: {
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 20,
  },
  button: {
    width: 80,
    alignItems: "center",
    marginHorizontal: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    marginVertical: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
  },
});

export default AnimatedMarkers;
