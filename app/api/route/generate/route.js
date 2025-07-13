import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const { start, end, viaPoints } = await request.json();
    
    console.log('Route generation request:', { start, end, viaPoints });
    
    const apiKey = process.env.OPENROUTE_SERVICE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouteService API key not configured' }, { status: 500 });
    }

    if (!start || !end) {
      return NextResponse.json({ error: 'Start and end locations are required' }, { status: 400 });
    }

    // Parse coordinates
    const startCoords = start.split(',').map((coord) => parseFloat(coord.trim()));
    const endCoords = end.split(',').map((coord) => parseFloat(coord.trim()));

    if (startCoords.length !== 2 || endCoords.length !== 2 || 
        startCoords.some(isNaN) || endCoords.some(isNaN)) {
      return NextResponse.json({ error: 'Invalid coordinate format. Use latitude,longitude' }, { status: 400 });
    }

    // Build coordinates array for OpenRouteService (longitude, latitude format)
    const coordinates = [[startCoords[1], startCoords[0]]]; // start
    
    // Add via points if they exist
    if (viaPoints && viaPoints.length > 0) {
      viaPoints.forEach((point) => {
        if (typeof point === 'string' && point.trim()) {
          // Handle string format (legacy)
          const coords = point.split(',').map((coord) => parseFloat(coord.trim()));
          if (coords.length === 2 && !coords.some(isNaN)) {
            coordinates.push([coords[1], coords[0]]); // longitude, latitude
          }
        } else if (Array.isArray(point) && point.length === 2) {
          // Handle coordinate array format
          const coords = point.map(coord => parseFloat(coord));
          if (!coords.some(isNaN)) {
            coordinates.push([coords[1], coords[0]]); // longitude, latitude
          }
        }
      });
    }
    
    coordinates.push([endCoords[1], endCoords[0]]); // end

    console.log('Coordinates being sent to OpenRouteService:', coordinates);

    // Make request to OpenRouteService
    const response = await axios.post(
      'https://api.openrouteservice.org/v2/directions/driving-car/geojson',
      {
        coordinates,
        instructions: false,
        preference: 'recommended'
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data && response.data.features && response.data.features.length > 0) {
      const route = response.data.features[0];
      console.log('Route response:', route);
      
      // Safety check for route properties
      const routeData = {
        geometry: route.geometry
      };
      
      if (route.properties && route.properties.segments && route.properties.segments.length > 0) {
        routeData.distance = route.properties.segments[0].distance;
        routeData.duration = route.properties.segments[0].duration;
      } else {
        routeData.distance = 0;
        routeData.duration = 0;
      }
      
      return NextResponse.json({ 
        route: routeData
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'No route found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error generating route:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status
    });
    
    if (error.response) {
      console.error('OpenRouteService API Error:', error.response.data);
      return NextResponse.json({ 
        error: `OpenRouteService API Error: ${error.response.data.error?.message || error.response.data.message || 'Unknown error'}` 
      }, { status: error.response.status });
    }
    
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: error.message 
    }, { status: 500 });
  }
}
