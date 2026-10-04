-- Seed / Update Business Locations, Coordinates and Google Place IDs

UPDATE businesses
SET latitude = 17.3653776,
    longitude = 78.3972364,
    location = 'D First floor, 7-17/2, Suncity Rd, Sun City, Bandlaguda Jagir, Telangana 500086, India',
    google_place_id = 'ChIJbdj2ES2XyzsRPlm3S4KgI2E'
WHERE name ILIKE '%Sowmya%' OR id = '08a9d408-04c3-4ca2-9a10-79aa19098038';

UPDATE businesses
SET latitude = 28.6315,
    longitude = 77.2167,
    location = 'Connaught Place, New Delhi, India'
WHERE name ILIKE '%Urban Table%' AND latitude IS NULL;

UPDATE businesses
SET latitude = 37.7749,
    longitude = -122.4194,
    location = 'San Francisco, CA'
WHERE name ILIKE '%Blue Fin%' AND latitude IS NULL;

UPDATE businesses
SET latitude = 22.5354,
    longitude = 88.3512,
    location = 'Kolkata, West Bengal, India'
WHERE name ILIKE '%La Derma%' AND latitude IS NULL;
