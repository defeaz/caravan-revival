const roundToFive = (amount) => Math.round(amount / 5) * 5;

export const priceFor = (service, vehicleType, length) => {
  if (!['oneoff', 'ongoing'].includes(service)) return undefined;

  const metres = Number(length);
  if (!Number.isFinite(metres) || metres < 2.5 || metres > 14) return undefined;

  const profiles = {
    'Campervan': { exteriorBase: 50, exteriorMetre: 7, interiorBase: 30, interiorMetre: 4 },
    'Touring caravan': { exteriorBase: 55, exteriorMetre: 9, interiorBase: 45, interiorMetre: 5 },
    'Motorhome': { exteriorBase: 75, exteriorMetre: 11, interiorBase: 55, interiorMetre: 7 },
    'Static caravan': { exteriorBase: 155, exteriorMetre: 12, interiorBase: 90, interiorMetre: 9 }
  };
  const profile = profiles[vehicleType];
  if (!profile) return undefined;

  const exterior = roundToFive(profile.exteriorBase + profile.exteriorMetre * metres);
  const interior = roundToFive(profile.interiorBase + profile.interiorMetre * metres);
  const wheels = vehicleType === 'Static caravan'
    ? 0
    : vehicleType === 'Touring caravan'
      ? metres > 6.5 ? 20 : 10
      : vehicleType === 'Motorhome'
        ? metres > 9 ? 35 : 15
        : 10;
  const largeVehicle = vehicleType === 'Motorhome' && metres > 8
    ? roundToFive((metres - 8) * 40)
    : 0;

  return exterior + interior + wheels + largeVehicle;
};

export const postcodeArea = (postcode) =>
  postcode.toUpperCase().replace(/\s+/g, ' ').split(' ')[0];

export const isServed = (postcode) =>
  /^(BS|BA|GL|SN|TA|NP|CF|WR)/.test(postcode.toUpperCase());

const marinas = [
  { names: ['bristol marina'], postcode: 'BS1 6XQ' },
  { names: ['bristol harbour', 'bristol floating harbour', 'city docks'], postcode: 'BS1 5UH' },
  { names: ['portishead marina', 'portishead quays marina', 'boatfolk portishead'], postcode: 'BS20 7DF' },
  { names: ['portavon marina', 'portavon waterside marina', 'keynsham marina'], postcode: 'BS31 2DD' },
  { names: ['saltford marina'], postcode: 'BS31 3JS' },
  { names: ['bath marina', 'bath waterside marina'], postcode: 'BA2 1SQ' },
  { names: ['caen hill marina', 'devizes marina'], postcode: 'SN10 1QR' },
  { names: ['sharpness marina', 'sharpness docks'], postcode: 'GL13 9UN' },
  { names: ['saul junction marina', 'saul marina'], postcode: 'GL2 7JY' },
  { names: ['gloucester docks', 'gloucester marina', 'gloucester quays'], postcode: 'GL1 2EH' },
  { names: ['tewkesbury marina'], postcode: 'GL20 5BY' },
  { names: ['upton marina', 'upton upon severn marina'], postcode: 'WR8 0PB' },
  { names: ['cardiff marina'], postcode: 'CF11 0JL' },
  { names: ['cardiff bay marina'], postcode: 'CF10 4LY' },
  { names: ['penarth marina'], postcode: 'CF64 1TQ' },
  { names: ['barry yacht club', 'barry marina'], postcode: 'CF62 5TQ' },
  { names: ['chepstow boatyard', 'chepstow marina'], postcode: 'NP16 5HH' }
];

const postcodePattern = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const normalise = (value) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function postcodeDetails(postcode) {
  const response = await fetch(
    `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`
  );
  if (!response.ok) throw new Error('Postcode not found.');
  const { result } = await response.json();
  return {
    postcode: result.postcode,
    area: postcodeArea(result.postcode),
    latitude: result.latitude,
    longitude: result.longitude
  };
}

export async function resolveLocation(value) {
  const entered = String(value || '').trim();
  let postcode = entered;
  let marinaName = '';

  if (!postcodePattern.test(entered)) {
    const wanted = normalise(entered);
    const marina = marinas.find(({ names }) =>
      names.some((name) => wanted === name || wanted.includes(name))
    );
    if (!marina) {
      throw new Error(
        'Marina not recognised. Please enter the marina postcode instead.'
      );
    }
    postcode = marina.postcode;
    marinaName = marina.names[0];
  }

  const location = await postcodeDetails(postcode);
  return { ...location, label: marinaName || location.postcode };
}

function distanceMiles(first, second) {
  const radiusMiles = 3958.8;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const deltaLat = radians(second.latitude - first.latitude);
  const deltaLon = radians(second.longitude - first.longitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return radiusMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function locationsAreNearby(bookings, target, maxMiles = 18) {
  const resolved = await Promise.all(
    bookings.map(async (booking) => {
      try {
        return await resolveLocation(booking.postcode);
      } catch {
        return null;
      }
    })
  );

  return resolved.every((location, index) =>
    location
      ? distanceMiles(location, target) <= maxMiles
      : bookings[index].postcode_area === target.area
  );
}

export const serviceLoad = (service) => ({
  oneoff: 0.5,
  ongoing: 0.2,
  'boat-oneoff': 1,
  'boat-regular': 1 / 3
})[service];

export const canFitBooking = (existing, service) => {
  const requestedLoad = serviceLoad(service);
  if (!requestedLoad) return false;

  const used = existing.reduce(
    (total, booking) => total + (serviceLoad(booking.service) || 0.5),
    0
  );

  return used + requestedLoad <= 1.0001;
};
