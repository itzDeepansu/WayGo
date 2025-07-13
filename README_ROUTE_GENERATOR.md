# Route Generator & Delivery Checker

This application allows users to generate routes with multiple via points and check delivery locations against a buffer zone.

## Features

1. **Route Generation:**
   - Start Location input field
   - Via Points dynamic list (add/remove waypoints)
   - End Location input field
   - Buffer Distance input (in meters)
   - Generate Route Button with error handling

2. **Delivery Checking:**
   - Fetches deliveries from specified zone
   - Checks delivery drop points against buffer zone
   - Displays results with visual indicators

3. **Map Visualization:**
   - Interactive Leaflet map
   - Route visualization using OpenRouteService
   - Buffer zone circle around end location
   - Delivery markers:
     - Green: Inside buffer zone
     - Red: Outside buffer zone
   - Start/End/Via point markers

4. **User Interface:**
   - Clean, responsive design
   - Alert components for feedback
   - Delivery cards with color coding
   - Real-time distance calculations

## Setup Instructions

### 1. Install Dependencies

```bash
npm install leaflet react-leaflet @types/leaflet
```

### 2. OpenRouteService API Key

1. Go to [OpenRouteService](https://openrouteservice.org/)
2. Sign up for a free account
3. Create an API key
4. Update your `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
OPENROUTE_SERVICE_API_KEY=your-actual-api-key-here
```

### 3. Database Setup

Ensure your PostgreSQL database is running and the `deliveries` table has the following structure:
- `id`: UUID
- `pickup_point`: String (latitude,longitude format)
- `drop_point`: String (latitude,longitude format)
- `description`: String
- `zone`: String
- `status`: String
- `item_weight`: Float
- `value`: Float
- And other fields as per your schema

### 4. Usage

1. Navigate to `/getOrder` in your application
2. Enter start location (e.g., "New York, NY" or "Times Square, New York")
3. Add via points if needed (optional) - use location names
4. Enter end location (e.g., "Los Angeles, CA" or "Hollywood, California")
5. Set buffer distance in meters
6. Enter zone name to search for deliveries
7. Click "Generate Route & Check Deliveries"

### 5. Expected Input Formats

- **Locations**: Use location names (e.g., "New York, NY", "Times Square", "Central Park")
- **Zone**: Any string that matches your database zone values
- **Buffer**: Numeric value in meters (e.g., `1000` for 1km)

### 6. Geocoding Features

- **Automatic Address Resolution**: Enter location names instead of coordinates
- **Global Coverage**: Works with addresses, landmarks, and place names worldwide
- **Error Handling**: Clear error messages if locations cannot be found
- **Via Points Support**: Multiple waypoints using location names

### 7. API Endpoints

- `POST /api/route/generate` - Generates route using OpenRouteService
- `POST /api/deliveries/getDeliveriesForZone` - Fetches deliveries by zone
- `POST /api/geocoding` - Converts location names to coordinates

### 8. Components

- `InputsPanel`: Manages user inputs
- `MapView`: Displays map with routes and markers
- `AlertComponent`: Shows success/error messages

## Troubleshooting

1. **Map not loading**: Check if Leaflet CSS is properly imported
2. **Route not generating**: Verify OpenRouteService API key is valid
3. **No deliveries found**: Check database connection and zone name
4. **Marker icons missing**: Ensure internet connection for CDN resources

## Color Coding

- **Blue markers**: Start/End locations
- **Orange markers**: Via points
- **Green markers**: Deliveries inside buffer zone
- **Red markers**: Deliveries outside buffer zone
- **Blue circle**: Buffer zone (dashed)
- **Blue line**: Generated route path
