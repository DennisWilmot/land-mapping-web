# NE Manchester Land Mapping Tool

Interactive land parcel mapping for Manchester North Eastern constituency, Jamaica.

## Features

- **Interactive Map**: Powered by Mapbox GL JS with satellite and street views
- **Parcel Visualization**: View land parcels with hover tooltips showing key information
- **Constituency Boundary**: Blue outline showing the Manchester North Eastern boundary
- **Address Points**: Toggle address markers on the map
- **Details Panel**: Click any parcel to view full property details
- **Data Linking**: Parcels linked to address records via LV_NUMBER

## Getting Started

### Prerequisites

- Node.js 18+
- Mapbox Access Token (get one at https://account.mapbox.com/)

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file with your Mapbox token:
   ```
   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Data Sources

- `public/data/manchester_parcels.geojson` - Land parcel polygons with properties
- `public/data/jamaica_processed_addresses.csv` - Address points with coordinates

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Mapbox GL JS** - Interactive mapping
- **Tailwind CSS** - Styling
- **Papa Parse** - CSV parsing

## Project Structure

```
├── app/
│   ├── page.tsx          # Main map page
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── components/
│   ├── MapView.tsx       # Mapbox wrapper
│   ├── LayerControls.tsx # Toggle switches
│   └── DetailsPanel.tsx  # Parcel details
├── lib/
│   ├── geo/
│   │   └── boundary.ts   # NE Manchester boundary
│   └── data/
│       ├── addresses.ts  # Address helpers
│       └── parcels.ts    # Parcel helpers
└── public/data/          # GeoJSON and CSV data
```

## Future Enhancements

- Owner data integration (government vs. non-government)
- Property search functionality
- Export capabilities
- Mobile-optimized views
