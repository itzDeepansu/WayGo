'use client';
import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, Polygon, useMap } from 'react-leaflet';
import LeafletCSS from './LeafletCSS';

// Component to create buffer zone around route with consistent visual distance
const RouteBuffer = ({ routeCoordinates, buffer, leaflet }) => {
  const [bufferPolygon, setBufferPolygon] = useState(null);
  const map = useMap();
  
  useEffect(() => {
    if (!routeCoordinates || routeCoordinates.length === 0 || !leaflet || !buffer || !map) {
      return;
    }
    
    const updateBuffer = () => {
      try {
        // Create a buffer around the route that maintains consistent visual distance
        const createRouteBuffer = (coords, bufferDistance) => {
          if (coords.length < 2) return null;
          
          const bufferPoints = [];
          const earthRadius = 6371000; // Earth's radius in meters
          
          // Function to calculate bearing between two points
          const bearing = (lat1, lon1, lat2, lon2) => {
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const lat1Rad = lat1 * Math.PI / 180;
            const lat2Rad = lat2 * Math.PI / 180;
            
            const y = Math.sin(dLon) * Math.cos(lat2Rad);
            const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
            
            return Math.atan2(y, x);
          };
          
          // Function to get point at distance and bearing
          const getPointAtDistance = (lat, lon, distance, bearingRad) => {
            const latRad = lat * Math.PI / 180;
            const lonRad = lon * Math.PI / 180;
            
            const newLatRad = Math.asin(Math.sin(latRad) * Math.cos(distance / earthRadius) + 
                                       Math.cos(latRad) * Math.sin(distance / earthRadius) * Math.cos(bearingRad));
            
            const newLonRad = lonRad + Math.atan2(Math.sin(bearingRad) * Math.sin(distance / earthRadius) * Math.cos(latRad),
                                                 Math.cos(distance / earthRadius) - Math.sin(latRad) * Math.sin(newLatRad));
            
            return [newLatRad * 180 / Math.PI, newLonRad * 180 / Math.PI];
          };
          
          // Simplify the route by taking every nth point to reduce complexity
          const simplificationFactor = Math.max(1, Math.floor(coords.length / 100));
          const simplifiedCoords = coords.filter((_, index) => index % simplificationFactor === 0);
          
          // Ensure we include the last point
          if (simplifiedCoords[simplifiedCoords.length - 1] !== coords[coords.length - 1]) {
            simplifiedCoords.push(coords[coords.length - 1]);
          }
          
          const leftSide = [];
          const rightSide = [];
          
          // Create buffer points for each segment
          for (let i = 0; i < simplifiedCoords.length; i++) {
            const [lat, lon] = simplifiedCoords[i];
            
            let perpBearing1, perpBearing2;
            
            if (i === 0) {
              // First point: use bearing to next point
              const segmentBearing = bearing(lat, lon, simplifiedCoords[i + 1][0], simplifiedCoords[i + 1][1]);
              perpBearing1 = segmentBearing + Math.PI / 2;
              perpBearing2 = segmentBearing - Math.PI / 2;
            } else if (i === simplifiedCoords.length - 1) {
              // Last point: use bearing from previous point
              const segmentBearing = bearing(simplifiedCoords[i - 1][0], simplifiedCoords[i - 1][1], lat, lon);
              perpBearing1 = segmentBearing + Math.PI / 2;
              perpBearing2 = segmentBearing - Math.PI / 2;
            } else {
              // Middle points: use average bearing
              const bearing1 = bearing(simplifiedCoords[i - 1][0], simplifiedCoords[i - 1][1], lat, lon);
              const bearing2 = bearing(lat, lon, simplifiedCoords[i + 1][0], simplifiedCoords[i + 1][1]);
              const avgBearing = (bearing1 + bearing2) / 2;
              perpBearing1 = avgBearing + Math.PI / 2;
              perpBearing2 = avgBearing - Math.PI / 2;
            }
            
            const leftPoint = getPointAtDistance(lat, lon, bufferDistance, perpBearing1);
            const rightPoint = getPointAtDistance(lat, lon, bufferDistance, perpBearing2);
            
            leftSide.push(leftPoint);
            rightSide.push(rightPoint);
          }
          
          // Combine left side + reversed right side to form closed polygon
          const polygon = [...leftSide, ...rightSide.reverse()];
          
          return polygon;
        };
        
        const bufferPoints = createRouteBuffer(routeCoordinates, buffer);
        console.log('Buffer points generated:', bufferPoints?.length || 0);
        setBufferPolygon(bufferPoints);
        
      } catch (error) {
        console.error('Error creating route buffer:', error);
      }
    };
    
    // Update buffer initially
    updateBuffer();
    
    // Update buffer when map zoom changes to maintain consistent visual distance
    const handleZoomEnd = () => {
      updateBuffer();
    };
    
    const handleMoveEnd = () => {
      updateBuffer();
    };
    
    map.on('zoomend', handleZoomEnd);
    map.on('moveend', handleMoveEnd);
    
    // Cleanup event listeners
    return () => {
      map.off('zoomend', handleZoomEnd);
      map.off('moveend', handleMoveEnd);
    };
  }, [routeCoordinates, buffer, leaflet, map]);
  
  if (!bufferPolygon) return null;
  
  return (
    <Polygon
      positions={bufferPolygon}
      pathOptions={{
        color: '#3b82f6',
        fillColor: '#87ceeb',
        fillOpacity: 0.2,
        weight: 1,
        opacity: 0.5
      }}
    />
  );
};

// Component to handle map bounds and centering
const MapController = ({ routeGeometry, startCoords, endCoords, viaPoints, deliveries, buffer }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!map) return;
    
    const bounds = [];
    
    // Add start coordinates to bounds
    if (startCoords && startCoords.length === 2) {
      bounds.push(startCoords);
    }
    
    // Add end coordinates to bounds
    if (endCoords && endCoords.length === 2) {
      bounds.push(endCoords);
    }
    
    // Add via points to bounds
    if (viaPoints && viaPoints.length > 0) {
      viaPoints.forEach(point => {
        if (point && point.length === 2) {
          bounds.push(point);
        }
      });
    }
    
    // Add delivery points to bounds
    if (deliveries && deliveries.length > 0) {
      deliveries.forEach(delivery => {
        if (delivery.drop_point_coords) {
          bounds.push(delivery.drop_point_coords);
        } else if (delivery.drop_point) {
          // Fallback: try to parse as coordinates
          const coords = delivery.drop_point.split(',').map(coord => parseFloat(coord.trim()));
          if (coords.length === 2 && !coords.some(isNaN)) {
            bounds.push(coords);
          }
        }
      });
    }
    
    // Add route coordinates to bounds
    if (routeGeometry && routeGeometry.coordinates) {
      routeGeometry.coordinates.forEach(coord => {
        bounds.push([coord[1], coord[0]]); // Convert from [lng, lat] to [lat, lng]
      });
    }
    
    // Fit map to bounds if we have any coordinates
    if (bounds.length > 0) {
      try {
        map.fitBounds(bounds, { padding: [20, 20] });
      } catch (error) {
        console.error('Error fitting bounds:', error);
        // Fallback to centering on end coordinates
        if (endCoords && endCoords.length === 2) {
          map.setView(endCoords, 10);
        }
      }
    }
  }, [map, routeGeometry, startCoords, endCoords, viaPoints, deliveries, buffer]);
  
  return null;
};

const MapView = ({ deliveries, buffer, endCoords, routeGeometry, startCoords, viaPoints }) => {
  const [leaflet, setLeaflet] = useState(null);
  const [icons, setIcons] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Dynamically import leaflet only on client side
    import('leaflet').then((L) => {
      // Fix for leaflet default markers
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      
      // Create custom icons for markers
      const createCustomIcon = (color) => {
        return new L.Icon({
          iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41]
        });
      };
      
      const iconsObj = {
        green: createCustomIcon('green'),
        red: createCustomIcon('red'),
        blue: createCustomIcon('blue'),
        orange: createCustomIcon('orange')
      };
      
      setLeaflet(L);
      setIcons(iconsObj);
    });
  }, []);

  if (!leaflet || !icons) {
    return <div className="flex items-center justify-center h-full">Loading map...</div>;
  }

  // Convert route geometry to coordinates for polyline
  const routeCoordinates = routeGeometry && routeGeometry.coordinates ? 
    routeGeometry.coordinates.map((coord) => [coord[1], coord[0]]) : [];

  // Via points are now already in coordinate format
  const viaPointsCoords = viaPoints || [];

  // Get initial center - prefer endCoords, fallback to startCoords, then default
  const getInitialCenter = () => {
    if (endCoords && endCoords.length === 2) return endCoords;
    if (startCoords && startCoords.length === 2) return startCoords;
    return [51.505, -0.09]; // Default to London
  };

  console.log('MapView props:', {
    deliveries: deliveries?.length || 0,
    buffer,
    endCoords,
    routeGeometry: routeGeometry ? 'present' : 'null',
    startCoords,
    viaPoints: viaPointsCoords.length,
    routeCoordinates: routeCoordinates.length
  });
  
  console.log('Deliveries with coordinates:', deliveries?.filter(d => d.drop_point_coords).length || 0);
  console.log('Route coordinates available:', routeCoordinates.length > 0);
  console.log('Buffer value:', buffer);

  return (
    <>
      <LeafletCSS />
      <MapContainer 
        center={getInitialCenter()} 
        zoom={6} 
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {/* MapController for auto-fitting bounds */}
        <MapController 
          routeGeometry={routeGeometry}
          startCoords={startCoords}
          endCoords={endCoords}
          viaPoints={viaPointsCoords}
          deliveries={deliveries}
          buffer={buffer}
        />

        {/* Continuous Route buffer zone */}
        {routeCoordinates.length > 0 && (
          <RouteBuffer 
            routeCoordinates={routeCoordinates}
            buffer={buffer}
            leaflet={leaflet}
          />
        )}

        {/* Route polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            positions={routeCoordinates}
            pathOptions={{
              color: '#22c55e',
              weight: 5,
              opacity: 0.8
            }}
          />
        )}

        {/* Start location marker */}
        {startCoords && startCoords.length === 2 && (
          <Marker position={startCoords} icon={icons.blue}>
            <Popup>
              <strong>Start Location</strong><br />
              Coordinates: {startCoords[0].toFixed(6)}, {startCoords[1].toFixed(6)}
            </Popup>
          </Marker>
        )}

        {/* Via points markers */}
        {viaPointsCoords.map((coords, index) => (
          coords && coords.length === 2 && (
            <Marker key={`via-${index}`} position={coords} icon={icons.orange}>
              <Popup>
                <strong>Via Point {index + 1}</strong><br />
                Coordinates: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
              </Popup>
            </Marker>
          )
        ))}

        {/* End location marker */}
        {endCoords && endCoords.length === 2 && (
          <Marker position={endCoords} icon={icons.blue}>
            <Popup>
              <strong>End Location (Buffer Center)</strong><br />
              Coordinates: {endCoords[0].toFixed(6)}, {endCoords[1].toFixed(6)}<br />
              Buffer Radius: {buffer} meters
            </Popup>
          </Marker>
        )}

        {/* Delivery markers */}
        {deliveries && deliveries.map((delivery) => {
          // Use drop_point_coords if available, otherwise try to parse drop_point
          let coords = null;
          
          if (delivery.drop_point_coords) {
            coords = delivery.drop_point_coords;
          } else if (delivery.drop_point) {
            // Fallback: try to parse as coordinates
            const parsedCoords = delivery.drop_point.split(',').map(coord => parseFloat(coord.trim()));
            if (parsedCoords.length === 2 && !parsedCoords.some(isNaN)) {
              coords = parsedCoords;
            }
          }
          
          if (!coords) return null;
          
          return (
            <Marker
              key={delivery.id}
              position={coords}
              icon={delivery.inBuffer ? icons.green : icons.red}
            >
              <Popup>
                <strong>{delivery.description || 'No description'}</strong><br />
                <strong>Drop Point:</strong> {delivery.drop_point}<br />
                Distance: {delivery.distance ? delivery.distance.toFixed(2) : 'N/A'} meters<br />
                Status: {delivery.inBuffer ? 'Inside Buffer' : 'Outside Buffer'}<br />
                Zone: {delivery.zone}<br />
                Coordinates: {coords[0].toFixed(6)}, {coords[1].toFixed(6)}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </>
  );
};

export default MapView;

