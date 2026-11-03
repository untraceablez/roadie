export interface Show {
  id: string;
  source: string;
  artists: string[];
  venue: string;
  city: string;
  startsAt: Date;
  genres: string[];
  url: string;
  imageUrl?: string;
  ticketUrl?: string;
}

export interface SearchQuery {
  genres: string[];
  lat: number;
  lng: number;
  radiusKm: number;
  from: Date;
  to: Date;
}

export interface ShowProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<Show[]>;
  byArtist?(artist: string, from: Date, to: Date): Promise<Show[]>;
}
