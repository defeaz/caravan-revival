const boatBookingForm = document.querySelector('#booking-form');
const boatBookingFields = document.querySelector('#boat-booking-fields');
const boatBookingStatus = document.querySelector('#booking-status');
const boatService = document.querySelector('#booking-service');
const regularFrequency = document.querySelector('#regular-frequency');
const frequencySelect = regularFrequency.querySelector('select');
const bookingApi = 'https://caravanrevival.com/api';
const boatLength = document.querySelector('#boat-length');
const boatLengthOutput = document.querySelector('#boat-length-output');
const classicBoat = document.querySelector('#classic-boat-size');
const boatPrice = document.querySelector('#boat-price');
const boatImages = [
  [19, 'boat-line-10-19.png'],
  [29, 'boat-line-20-29.png'],
  [39, 'boat-line-30-39.png'],
  [59, 'boat-line-40-59.png'],
  [79, 'boat-line-60-79.png'],
  [100, 'boat-line-80-100.png']
];
const marinaPostcodes = {
  'bristol marina': 'BS1 6XQ',
  'bristol harbour': 'BS1 5UH',
  'bristol floating harbour': 'BS1 5UH',
  'portishead marina': 'BS20 7DF',
  'portavon marina': 'BS31 2DD',
  'keynsham marina': 'BS31 2DD',
  'saltford marina': 'BS31 3JS',
  'bath marina': 'BA2 1SQ',
  'devizes marina': 'SN10 1QR',
  'sharpness marina': 'GL13 9UN',
  'saul marina': 'GL2 7JY',
  'gloucester docks': 'GL1 2EH',
  'tewkesbury marina': 'GL20 5BY',
  'upton marina': 'WR8 0PB',
  'cardiff marina': 'CF11 0JL',
  'cardiff bay marina': 'CF10 4LY',
  'penarth marina': 'CF64 1TQ',
  'barry marina': 'CF62 5TQ',
  'chepstow marina': 'NP16 5HH'
};
const localBoatPrices = [
  [19, 95, 350, 1500], [29, 125, 425, 1750], [39, 155, 500, 2000],
  [49, 185, 600, 2400], [59, 225, 725, 2900], [69, 275, 875, 3500],
  [79, 340, 1050, 4200], [89, 420, 1250, 5000], [100, 520, 1500, 6000]
];

function updateBoatLength() {
  const feet = Number(boatLength.value);
  boatLengthOutput.textContent = `${feet} ft`;
  classicBoat.src = boatImages.find(([maximum]) => feet <= maximum)[1];
  boatLength.style.setProperty('--range-progress', `${((feet - 10) / 90) * 100}%`);
}

function resetDates() {
  boatBookingFields.hidden = true;
  boatPrice.hidden = true;
  document.querySelector('#boat-date').innerHTML = '';
}

function money(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0
  }).format(value);
}

function showQuote(quote) {
  if (!quote || typeof quote.total !== 'number') {
    throw new Error(
      'Pricing is not available yet. Please deploy the updated Caravan Revival backend first.'
    );
  }
  document.querySelector('#boat-price-service-label').textContent = quote.serviceLabel;
  document.querySelector('#boat-price-service').textContent = money(quote.servicePrice);
  document.querySelector('#boat-price-interior').textContent = quote.interiorPrice
    ? money(quote.interiorPrice)
    : 'Not selected';
  document.querySelector('#boat-price-travel').textContent = quote.travelPrice
    ? money(quote.travelPrice)
    : 'Included';
  document.querySelector('#boat-price-total').textContent = money(quote.total);
  boatPrice.hidden = false;
}

function milesBetween(first, second) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const deltaLat = radians(second.latitude - first.latitude);
  const deltaLon = radians(second.longitude - first.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function localQuote(locationInput, service, length, interiorService) {
  const entered = locationInput.toLowerCase().trim();
  const postcode = marinaPostcodes[entered] || locationInput;
  const response = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`);
  if (!response.ok) throw new Error('Please enter a recognised marina name or complete postcode.');
  const { result } = await response.json();
  const feet = Number(length);
  const band = localBoatPrices.find(([maximum]) => feet <= maximum);
  const serviceDetails = {
    'boat-regular': [1, 'Regular Wash'],
    'boat-oneoff': [2, 'Shine & Protect']
  }[service];
  if (!band || !serviceDetails) throw new Error('Please choose a valid cleaning service.');
  const servicePrice = band[serviceDetails[0]];
  const interiorBand = feet <= 49 ? [80, 250] : feet <= 69 ? [120, 375] : [160, 500];
  const interiorPrice = interiorService === 'Interior clean' ? interiorBand[0]
    : interiorService === 'Full interior detail' ? interiorBand[1] : 0;
  const roadMiles = milesBetween(
    { latitude: 51.4545, longitude: -2.5879 },
    { latitude: result.latitude, longitude: result.longitude }
  ) * 1.2;
  const travelPrice = Math.ceil((Math.max(0, roadMiles - 15) * 1.2) / 5) * 5;
  return {
    serviceLabel: serviceDetails[1], servicePrice, interiorPrice, travelPrice,
    total: servicePrice + interiorPrice + travelPrice
  };
}

function updateArrangement() {
  const regular = boatService.value === 'boat-regular';
  regularFrequency.style.display = regular ? 'flex' : 'none';
  frequencySelect.disabled = !regular;
  resetDates();
}

boatBookingForm
  .querySelectorAll('[name="locationQuery"], [name="service"], [name="interiorService"]')
  .forEach((field) => field.addEventListener('change', resetDates));

boatService.addEventListener('change', updateArrangement);
boatLength.addEventListener('input', () => {
  updateBoatLength();
  resetDates();
});
updateArrangement();
updateBoatLength();

document
  .querySelector('#find-boat-dates')
  .addEventListener('click', async () => {
    const location = boatBookingForm.locationQuery.value.trim();
    const service = boatService.value;

    resetDates();

    if (location.length < 3) {
      boatBookingStatus.textContent = 'Please enter a marina name or complete postcode.';
      return;
    }

    boatBookingStatus.textContent = 'Checking nearby availability…';

    try {
      const params = new URLSearchParams({
        location,
        service,
        length: boatLength.value,
        interiorService: boatBookingForm.interiorService.value
      });
      const response = await fetch(`${bookingApi}/availability?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to check availability.');
      }

      const quote = data.quote || await localQuote(
        location,
        service,
        boatLength.value,
        boatBookingForm.interiorService.value
      );
      showQuote(quote);

      if (!data.dates.length) {
        throw new Error(
          'There are no suitable nearby dates available at present. Please send an enquiry.'
        );
      }

      document.querySelector('#boat-date').innerHTML = data.dates
        .map((date) => `<option value="${date.value}">${date.label}</option>`)
        .join('');

      boatBookingFields.hidden = false;
      boatBookingStatus.textContent = '';
    } catch (error) {
      boatBookingStatus.textContent = error.message;
    }
  });

boatBookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  boatBookingStatus.textContent = 'Taking you to secure payment…';

  const payload = Object.fromEntries(new FormData(boatBookingForm));

  try {
    const response = await fetch(`${bookingApi}/create-booking`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to complete the booking.');
    }

    window.location.href = data.url;
  } catch (error) {
    boatBookingStatus.textContent =
      error.message || 'Unable to complete the booking. Please try again.';
  }
});
