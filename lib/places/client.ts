const PLACES_BASE_URL = 'https://places.googleapis.com/v1'

const FIELD_MASKS = {
  nearbySearch: [
    'places.id',
    'places.displayName',
    'places.primaryType',
    'places.businessStatus',
    'places.rating',
    'places.userRatingCount',
  ],
  textSearch: [
    'places.id',
    'places.displayName',
    'places.primaryType',
    'places.businessStatus',
    'places.rating',
    'places.userRatingCount',
  ],
  placeDetails: [
    'id',
    'displayName',
    'nationalPhoneNumber',
    'formattedAddress',
    'regularOpeningHours',
    'rating',
    'userRatingCount',
    'primaryTypeDisplayName',
    'googleMapsUri',
    'businessStatus',
  ],
} as const

interface NearbySearchParams {
  lat: number
  lng: number
  radiusMeters: number
  includedTypes: string[]
}

interface TextSearchParams {
  query: string
  lat: number
  lng: number
  radiusMeters?: number
}

interface PlacesApiResponse {
  places?: PlaceResult[]
}

export interface PlaceResult {
  id: string
  displayName: { text: string; languageCode: string }
  primaryType?: string
  businessStatus?: string
  rating?: number
  userRatingCount?: number
  nationalPhoneNumber?: string
  formattedAddress?: string
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  primaryTypeDisplayName?: { text: string }
  googleMapsUri?: string
}

async function placesRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  fieldMask: readonly string[],
): Promise<T> {
  const response = await fetch(`${PLACES_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
      'X-Goog-FieldMask': fieldMask.join(','),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Places API ${endpoint} failed (${response.status}): ${error}`)
  }

  return response.json() as Promise<T>
}

export async function nearbySearch(params: NearbySearchParams): Promise<PlaceResult[]> {
  const data = await placesRequest<PlacesApiResponse>(
    '/places:searchNearby',
    {
      includedTypes: params.includedTypes,
      locationRestriction: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: params.radiusMeters,
        },
      },
      maxResultCount: 20,
    },
    FIELD_MASKS.nearbySearch,
  )

  return data.places ?? []
}

export async function textSearch(params: TextSearchParams): Promise<PlaceResult[]> {
  const data = await placesRequest<PlacesApiResponse>(
    '/places:searchText',
    {
      textQuery: params.query,
      locationBias: {
        circle: {
          center: { latitude: params.lat, longitude: params.lng },
          radius: params.radiusMeters ?? 500,
        },
      },
      maxResultCount: 5,
    },
    FIELD_MASKS.textSearch,
  )

  return data.places ?? []
}

export async function placeDetails(placeId: string): Promise<PlaceResult> {
  const response = await fetch(`${PLACES_BASE_URL}/places/${placeId}`, {
    method: 'GET',
    headers: {
      'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY!,
      'X-Goog-FieldMask': FIELD_MASKS.placeDetails.join(','),
    },
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Places API details failed (${response.status}): ${error}`)
  }

  return response.json() as Promise<PlaceResult>
}
