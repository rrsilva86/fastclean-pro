import { NextResponse } from "next/server";

type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  hamlet?: string;
  neighbourhood?: string;
  suburb?: string;
  municipality?: string;
  county?: string;
  city?: string;
  town?: string;
  village?: string;
  state?: string;
  postcode?: string;
  country?: string;
};

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: NominatimAddress;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query || query.length < 3) {
    return NextResponse.json({ results: [] });
  }

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "us");

  const response = await fetch(url, {
    headers: {
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "FastCleanProLocalMVP/1.0 (address validation)"
    },
    next: { revalidate: 3600 }
  });

  if (!response.ok) {
    return NextResponse.json({ results: [] }, { status: 502 });
  }

  const results = (await response.json()) as NominatimResult[];

  return NextResponse.json({
    results: results.map((result) => {
      const address = result.address ?? {};
      const streetName = address.road ?? address.pedestrian ?? "";
      const street = [address.house_number, streetName].filter(Boolean).join(" ");

      return {
        id: String(result.place_id),
        formatted: result.display_name,
        street,
        city: address.city ?? address.town ?? address.village ?? address.municipality ?? address.hamlet ?? address.suburb ?? address.county ?? "",
        state: address.state ?? "",
        postalCode: address.postcode ?? "",
        country: address.country ?? "",
        latitude: result.lat,
        longitude: result.lon
      };
    })
  });
}
