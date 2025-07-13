import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const { address } = await request.json();
    
    const apiKey = process.env.OPENROUTE_SERVICE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenRouteService API key not configured' }, { status: 500 });
    }

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    // Make request to OpenRouteService Geocoding API
    const response = await axios.get(
      `https://api.openrouteservice.org/geocode/search?api_key=${apiKey}&text=${encodeURIComponent(address)}`
    );

    if (response.data && response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      const coordinates = feature.geometry.coordinates; // [longitude, latitude]
      
      return NextResponse.json({ 
        coordinates: [coordinates[1], coordinates[0]], // Return as [latitude, longitude]
        address: feature.properties.label,
        confidence: feature.properties.confidence
      }, { status: 200 });
    } else {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

  } catch (error) {
    console.error('Error geocoding address:', error);
    
    if (error.response) {
      return NextResponse.json({ 
        error: `Geocoding API Error: ${error.response.data.error?.message || 'Unknown error'}` 
      }, { status: error.response.status });
    }
    
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
