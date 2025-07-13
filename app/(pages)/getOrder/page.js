'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import axios from '@/libs/axios';

const AlertComponent = dynamic(() => import('@/components/AlertComponent'), { ssr: false });
const InputsPanel = dynamic(() => import('@/components/InputsPanel'), { ssr: false });
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-96">Loading map...</div>
});

export default function GetOrder() {
  const [start, setStart] = useState('');
  const [viaPoints, setViaPoints] = useState(['']);
  const [end, setEnd] = useState('');
  const [buffer, setBuffer] = useState(1000);
  const [deliveries, setDeliveries] = useState([]);
  const [alert, setAlert] = useState(null);
  const [zone, setZone] = useState('');
  const [loading, setLoading] = useState(false);
  const [routeGeometry, setRouteGeometry] = useState(null);
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [viaPointCoords, setViaPointCoords] = useState([]);

  const handleAddViaPoint = () => setViaPoints([...viaPoints, '']);
  const handleRemoveViaPoint = (index) => setViaPoints(viaPoints.filter((_, i) => i !== index));
  const handleViaPointChange = (value, index) => {
    const newViaPoints = [...viaPoints];
    newViaPoints[index] = value;
    setViaPoints(newViaPoints);
  };

  // Geocoding function to convert address to coordinates
  const geocodeAddress = async (address) => {
    try {
      const response = await axios.post('/api/geocoding', { address });
      return response.data.coordinates; // [latitude, longitude]
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Could not find location: ${address}`);
    }
  };

  // Function to calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Function to calculate minimum distance from a point to a route
  const calculateDistanceToRoute = (pointLat, pointLon, routeCoordinates) => {
    if (!routeCoordinates || routeCoordinates.length === 0) {
      return Infinity;
    }

    let minDistance = Infinity;

    // Check distance to each point on the route
    for (const coord of routeCoordinates) {
      const distance = calculateDistance(pointLat, pointLon, coord[1], coord[0]); // coord is [lng, lat]
      minDistance = Math.min(minDistance, distance);
    }

    // Also check distance to line segments
    for (let i = 0; i < routeCoordinates.length - 1; i++) {
      const segmentDistance = distanceToLineSegment(
        pointLat, pointLon,
        routeCoordinates[i][1], routeCoordinates[i][0], // [lng, lat] -> [lat, lng]
        routeCoordinates[i + 1][1], routeCoordinates[i + 1][0]
      );
      minDistance = Math.min(minDistance, segmentDistance);
    }

    return minDistance;
  };

  // Function to calculate distance from a point to a line segment
  const distanceToLineSegment = (px, py, ax, ay, bx, by) => {
    const A = px - ax;
    const B = py - ay;
    const C = bx - ax;
    const D = by - ay;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = ax;
      yy = ay;
    } else if (param > 1) {
      xx = bx;
      yy = by;
    } else {
      xx = ax + param * C;
      yy = ay + param * D;
    }

    return calculateDistance(px, py, xx, yy);
  };

  const generateRoute = async () => {
    if (!zone.trim()) {
      setAlert({ message: 'Please enter a zone to search for deliveries', type: 'warning' });
      return;
    }

    if (!start.trim() || !end.trim()) {
      setAlert({ message: 'Please enter both start and end locations', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      // Geocode start location
      const startCoordinates = await geocodeAddress(start.trim());
      setStartCoords(startCoordinates);
      
      // Geocode end location
      const endCoordinates = await geocodeAddress(end.trim());
      setEndCoords(endCoordinates);
      
      // Geocode via points
      const viaCoordinates = [];
      for (const point of viaPoints) {
        if (point.trim()) {
          try {
            const coords = await geocodeAddress(point.trim());
            viaCoordinates.push(coords);
          } catch (error) {
            console.warn(`Could not geocode via point: ${point}`);
          }
        }
      }
      setViaPointCoords(viaCoordinates);
      
      // Convert coordinates to string format for API
      const startString = `${startCoordinates[0]},${startCoordinates[1]}`;
      const endString = `${endCoordinates[0]},${endCoordinates[1]}`;
      const viaStrings = viaCoordinates.map(coord => `${coord[0]},${coord[1]}`);
      
      // Fetch deliveries for the zone
      const deliveryResponse = await axios.post('/api/deliveries/getDeliveriesForZone', { zone: zone.trim() });
      const deliveryData = deliveryResponse.data.deliveries;
      
      // Fetch route from the OpenRouteService
      const routeResponse = await axios.post('/api/route/generate', {
        start: startString,
        end: endString,
        viaPoints: viaStrings
      });
      const routeData = routeResponse.data.route;
      
      console.log('Route data received:', routeData);
      console.log('Route geometry:', routeData?.geometry);
      console.log('Route coordinates count:', routeData?.geometry?.coordinates?.length || 0);
      console.log('Buffer distance:', buffer, 'meters');
      
      if (!routeData) {
        setAlert({ message: 'Failed to generate route from OpenRouteService', type: 'error' });
        return;
      }

      if (!deliveryData || deliveryData.length === 0) {
        setAlert({ message: 'No deliveries found for this zone', type: 'warning' });
        setDeliveries([]);
        return;
      }

      // Process deliveries and geocode drop points
      const validDeliveries = [];
      
      for (const delivery of deliveryData) {
        if (!delivery.drop_point) {
          validDeliveries.push({ ...delivery, inBuffer: false, distance: Infinity, drop_point_coords: null });
          continue;
        }
        
        try {
          // First, try to parse as coordinates (lat,lng)
          const dropPoint = delivery.drop_point.split(',').map((coord) => parseFloat(coord.trim()));
          let dropPointCoords = null;
          
          if (dropPoint.length === 2 && !isNaN(dropPoint[0]) && !isNaN(dropPoint[1])) {
            // Already in coordinate format
            dropPointCoords = dropPoint;
          } else {
            // Geocode the address string
            try {
              dropPointCoords = await geocodeAddress(delivery.drop_point.trim());
            } catch (geocodeError) {
              console.warn(`Could not geocode delivery drop point: ${delivery.drop_point}`, geocodeError);
              validDeliveries.push({ ...delivery, inBuffer: false, distance: Infinity, drop_point_coords: null });
              continue;
            }
          }
          
          if (dropPointCoords && dropPointCoords.length === 2) {
            // Calculate distance to the entire route, not just the end point
            const distance = routeData?.geometry?.coordinates ? 
              calculateDistanceToRoute(dropPointCoords[0], dropPointCoords[1], routeData.geometry.coordinates) :
              calculateDistance(endCoordinates[0], endCoordinates[1], dropPointCoords[0], dropPointCoords[1]);
            const inBuffer = distance <= buffer;
            
            console.log(`Delivery ${delivery.id}: distance=${distance.toFixed(2)}m, buffer=${buffer}m, inBuffer=${inBuffer}`);
            console.log(`Drop point coords: [${dropPointCoords[0].toFixed(6)}, ${dropPointCoords[1].toFixed(6)}]`);
            
            validDeliveries.push({ ...delivery, inBuffer, distance, drop_point_coords: dropPointCoords });
          } else {
            validDeliveries.push({ ...delivery, inBuffer: false, distance: Infinity, drop_point_coords: null });
          }
        } catch (error) {
          console.error(`Error processing delivery ${delivery.id}:`, error);
          validDeliveries.push({ ...delivery, inBuffer: false, distance: Infinity, drop_point_coords: null });
        }
      }

      // Sort deliveries by distance to route
      const sortedDeliveries = validDeliveries.sort((a, b) => a.distance - b.distance);

      setDeliveries(sortedDeliveries);
      const inBufferCount = validDeliveries.filter((d) => d.inBuffer).length;
      const outBufferCount = validDeliveries.length - inBufferCount;
      setAlert({ 
        message: `Found ${validDeliveries.length} deliveries: ${inBufferCount} inside buffer, ${outBufferCount} outside buffer`, 
        type: 'success' 
      });
      setRouteGeometry(routeData.geometry);
      
    } catch (error) {
      console.error('Error generating route:', error);
      setAlert({ message: error.message || 'Failed to generate route. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };


  // Get end coordinates for map centering
  const getEndCoords = () => {
    if (endCoords && endCoords.length === 2) {
      return endCoords;
    }
    return [51.505, -0.09]; // Default coordinates
  };

  return (
    <div className="container mx-auto p-4 bg-gray-50 min-h-screen text-gray-800">
      <h1 className="text-4xl font-bold mb-6 text-center text-gray-800">Route Generator & Delivery Checker</h1>

      <InputsPanel
        start={start}
        setStart={setStart}
        viaPoints={viaPoints}
        setViaPoints={setViaPoints}
        end={end}
        setEnd={setEnd}
        buffer={buffer}
        setBuffer={setBuffer}
        zone={zone}
        setZone={setZone}
        loading={loading}
        onGenerateRoute={generateRoute}
      />

      {alert && <AlertComponent message={alert.message} type={alert.type} />}

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Map View</h2>
        <div className="h-96 mb-4">
          <MapView
            deliveries={deliveries}
            buffer={buffer}
            endCoords={getEndCoords()}
            routeGeometry={routeGeometry}
            startCoords={startCoords}
            viaPoints={viaPointCoords}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Deliveries (Sorted by Distance)</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
              <span className="text-sm">Inside Buffer ({deliveries.filter(d => d.inBuffer).length})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
              <span className="text-sm">Outside Buffer ({deliveries.filter(d => !d.inBuffer).length})</span>
            </div>
          </div>
        </div>
        
        {deliveries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveries.map((delivery, index) => (
              <div
                key={delivery.id}
                className={`p-4 border-2 rounded-lg transition-all hover:shadow-md relative ${
                  delivery.inBuffer 
                    ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                    : 'bg-red-50 border-red-200 hover:bg-red-100'
                }`}
              >
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  #{index + 1}
                </div>
                <h3 className="font-semibold text-lg mb-2 pr-12">{delivery.description || 'No description'}</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-medium">Drop Point:</span> {delivery.drop_point}</p>
                  <p><span className="font-medium">Zone:</span> {delivery.zone}</p>
                  <p><span className="font-medium">Status:</span> {delivery.status}</p>
                  <p><span className="font-medium">Distance:</span> {delivery.distance ? delivery.distance.toFixed(2) : 'N/A'} meters</p>
                  <p><span className="font-medium">Item Weight:</span> {delivery.item_weight || 'N/A'}</p>
                  <p><span className="font-medium">Value:</span> ${delivery.value || 'N/A'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No deliveries to display. Enter a zone and generate a route to see deliveries.</p>
          </div>
        )}
      </div>
    </div>
  );
}
