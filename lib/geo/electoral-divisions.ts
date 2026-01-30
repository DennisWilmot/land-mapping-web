import type { FeatureCollection, Polygon, MultiPolygon, Feature, GeoJsonProperties } from 'geojson';

/**
 * Electoral division colors matching the map legend
 */
export const ELECTORAL_DIVISION_COLORS: Record<string, string> = {
  CRAIGHEAD: '#FFB6DB',   // Pale pink
  CHRISTIANA: '#F4DE7E',  // Light cream/yellow
  WALDERSTON: '#A5DAF3',  // Light blue
};

export type DivisionName = 'CRAIGHEAD' | 'CHRISTIANA' | 'WALDERSTON';

export interface DivisionProperties extends GeoJsonProperties {
  COMM_NAME_: string;
  ELECTORAL_DIVISION: DivisionName;
  color: string;
}

// Community name keywords for each division
const CRAIGHEAD_KEYWORDS = [
  'CRAIGHEAD',
  'CONTRIVANCE',
  'LYNDHURST',
  'PIKE',
  'HARRY WATCH',
  'HARRY WATER',
  'AUGHTEMBEDDIE',
  'AUCHTEMBEDDIE',
  'GOOD INTENT',
];

const CHRISTIANA_KEYWORDS = [
  'HIBERNIA',
  'CHRISTIANA',
  'COLEYVILLE',
  'SILENT HILL',
  'SPRING GROUND',
  'SPALDING',
];

const WALDERSTON_KEYWORDS = [
  'BETHANY',
  'COBBLA',
  'CHUDLEIGH',
  'DEVON',
  'ROBBINS HALL',
  'ROBINS HALL',
  'COMFORT HALL',
  'TOP HILL',
  'WALDERSTON',
  'LITCHFIELD',
  'KENDAL',
  'WILLIAMSFIELD',
  'CHANTILLY',
  'BOMBA',
];

/**
 * Determines which electoral division a community belongs to based on its name
 */
function getDivisionForCommunity(communityName: string, index: number): DivisionName {
  const upperName = communityName.toUpperCase();

  if (CHRISTIANA_KEYWORDS.some(keyword => upperName.includes(keyword))) {
    return 'CHRISTIANA';
  }
  if (CRAIGHEAD_KEYWORDS.some(keyword => upperName.includes(keyword))) {
    return 'CRAIGHEAD';
  }
  if (WALDERSTON_KEYWORDS.some(keyword => upperName.includes(keyword))) {
    return 'WALDERSTON';
  }

  // Fallback for unmatched communities - distribute based on index
  const divisions: DivisionName[] = ['CHRISTIANA', 'CRAIGHEAD', 'WALDERSTON'];
  return divisions[index % 3];
}

/**
 * Processes community GeoJSON and assigns electoral division properties
 */
export function processCommunitiesWithDivisions(
  communityGeoJson: FeatureCollection<Polygon | MultiPolygon>
): FeatureCollection<Polygon | MultiPolygon, DivisionProperties> {
  const features = communityGeoJson.features.map((feature, index) => {
    const communityName = (feature.properties?.COMM_NAME_ as string) || '';
    const division = getDivisionForCommunity(communityName, index);

    return {
      ...feature,
      properties: {
        ...feature.properties,
        ELECTORAL_DIVISION: division,
        color: ELECTORAL_DIVISION_COLORS[division],
      } as DivisionProperties,
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  } as FeatureCollection<Polygon | MultiPolygon, DivisionProperties>;
}

/**
 * Loads and processes the community data into electoral divisions
 */
export async function loadElectoralDivisions(): Promise<FeatureCollection<Polygon | MultiPolygon, DivisionProperties>> {
  const response = await fetch('/data/nem_communities.json');
  if (!response.ok) {
    throw new Error('Failed to load community data');
  }
  const communityData = await response.json() as FeatureCollection<Polygon | MultiPolygon>;
  return processCommunitiesWithDivisions(communityData);
}

/**
 * Groups division features by division name for rendering
 */
export function groupByDivision(
  divisionsGeoJson: FeatureCollection<Polygon | MultiPolygon, DivisionProperties>
): Record<DivisionName, FeatureCollection<Polygon | MultiPolygon, DivisionProperties>> {
  const grouped: Record<DivisionName, Feature<Polygon | MultiPolygon, DivisionProperties>[]> = {
    CRAIGHEAD: [],
    CHRISTIANA: [],
    WALDERSTON: [],
  };

  divisionsGeoJson.features.forEach(feature => {
    const division = feature.properties.ELECTORAL_DIVISION;
    grouped[division].push(feature);
  });

  return {
    CRAIGHEAD: { type: 'FeatureCollection', features: grouped.CRAIGHEAD },
    CHRISTIANA: { type: 'FeatureCollection', features: grouped.CHRISTIANA },
    WALDERSTON: { type: 'FeatureCollection', features: grouped.WALDERSTON },
  };
}
