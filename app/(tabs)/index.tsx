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

// Define initial deltas
const LATITUDE_DELTA = 0.009;
const LONGITUDE_DELTA = 0.009;

const AnimatedMarkers = () => {
  const [location, setLocation] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distanceTravelled, setDistanceTravelled] = useState(0);
  const [prevLatLng, setPrevLatLng] = useState({});
  const coordinate = useRef(new AnimatedRegion({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0,
    longitudeDelta: 0
  })).current;

  const markerRef = useRef(null);

  // Request location permissions and fetch the current location
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

      // Set initial marker position
      coordinate.setValue({ latitude, longitude, latitudeDelta: 0, longitudeDelta: 0 });

      // Start watching location updates
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 10 },
        (position) => {
          const { latitude, longitude } = position.coords;
          const newCoordinate = { latitude, longitude };

          // Animate marker on Android
          if (Platform.OS === "android" && markerRef.current) {
            markerRef.current.animateMarkerToCoordinate(newCoordinate, 500);
          } else {
            coordinate.timing(newCoordinate).start();
          }

          // Update route and distance
          setRouteCoordinates((prev) => [...prev, newCoordinate]);
          setDistanceTravelled((prev) => prev + calcDistance(newCoordinate));
          setPrevLatLng(newCoordinate);
        }
      );
    })();
  }, []);

  useEffect(() => {
    let counter = 0;
    const fakeMovement = setInterval(() => {
      const newLatitude = location.latitude + (counter * 0.0001);
      const newLongitude = location.longitude + (counter * 0.0001);
  
      const newCoordinate = { latitude: newLatitude, longitude: newLongitude };
      
      if (Platform.OS === "android" && markerRef.current) {
        markerRef.current.animateMarkerToCoordinate(newCoordinate, 500);
      } else {
        coordinate.timing(newCoordinate).start();
      }
  
      setRouteCoordinates((prev) => [...prev, newCoordinate]);
      setDistanceTravelled((prev) => prev + calcDistance(newCoordinate));
      setPrevLatLng(newCoordinate);
      
      counter++;
    }, 5000); // Moves every 5 seconds
  
    return () => clearInterval(fakeMovement);
  }, [location]);
  

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
