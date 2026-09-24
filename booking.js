const boatBookingForm = document.querySelector('#booking-form');
const boatBookingFields = document.querySelector('#boat-booking-fields');
const boatBookingStatus = document.querySelector('#booking-status');
const boatService = document.querySelector('#booking-service');
const regularFrequency = document.querySelector('#regular-frequency');
const frequencySelect = regularFrequency.querySelector('select');
const bookingApi = window.BOOKING_API_URL;
const boatLength = document.querySelector('#boat-length');
const boatLengthOutput = document.querySelector('#boat-length-output');
const classicBoat = document.querySelector('#classic-boat-size');
const boatPrice = document.querySelector('#boat-price');
const boatType = document.querySelector('#boat-type');
const boatInteriorLabel = document.querySelector('#boat-interior-label');
const boatInterior = boatBookingForm.elements.interiorService;
const boatSteps = {
  size: document.querySelector('#boat-step-size'),
  location: document.querySelector('#boat-step-location'),
  clean: document.querySelector('#boat-step-clean'),
  book: document.querySelector('#boat-step-book')
};
const boatImagesByType = {
  'Small boat': [[11, 'assets/boats/sizes/small-boat-v2/dinghy-10ft.png', '10-foot open dinghy'], [16, 'assets/boats/sizes/small-boat-v2/rib-14ft.png', 'Compact RIB'], [21, 'assets/boats/sizes/small-boat/orkney-16ft.png', 'Orkney-style fishing boat'], [26, 'assets/boats/sizes/small-boat/large-rib.png', 'Offshore RIB'], [30, 'assets/boats/sizes/small-boat/small-cruiser.png', 'Small cabin cruiser']],
  'Sailing yacht': [[24, 'assets/boats/sizes/sailing-yacht-v3/pocket-cruiser-20ft.png', 'Pocket sailing cruiser with keel'], [35, 'assets/boats/sizes/sailing-yacht-v3/classic-cruiser-30ft.png', 'Classic cruising yacht with keel'], [50, 'assets/boats/sizes/sailing-yacht-v3/offshore-performance-45ft.png', 'Modern offshore sailing yacht with keel'], [70, 'assets/boats/sizes/sailing-yacht-v3/deck-saloon-65ft.png', 'Luxury deck-saloon yacht with keel'], [100, 'assets/boats/sizes/sailing-yacht-v3/sailing-superyacht-100ft.png', 'Sailing superyacht with keel']],
  'Motor yacht': [[35, 'assets/boats/sizes/motor-yacht/sports-cruiser.png', 'Sports motor cruiser'], [50, 'assets/boats/sizes/motor-yacht/flybridge.png', 'Flybridge motor yacht'], [65, 'assets/boats/sizes/motor-yacht/cabin-motor-yacht.png', 'Cabin motor yacht'], [82, 'assets/boats/sizes/motor-yacht/large-motor-yacht.png', 'Large motor yacht'], [100, 'assets/boats/sizes/superyacht/full-size-superyacht.png', 'Full-size superyacht']],
  'Canal boat': [[24, 'assets/boats/sizes/canal-boat-v2/day-boat-20ft.png', 'Compact canal day boat'], [35, 'assets/boats/sizes/canal-boat-v2/traditional-30ft.png', 'Short traditional narrowboat'], [49, 'assets/boats/sizes/canal-boat-v2/cruiser-45ft.png', 'Cruiser-stern narrowboat'], [60, 'assets/boats/sizes/canal-boat-v2/liveaboard-57ft.png', 'Liveaboard narrowboat'], [72, 'assets/boats/sizes/canal-boat-v2/widebeam-70ft.png', 'Full-length widebeam canal boat']]
};
const boatLengthRanges = { 'Small boat': [10, 30, 16], 'Sailing yacht': [20, 100, 38], 'Motor yacht': [25, 100, 45], 'Canal boat': [20, 72, 45] };
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
  const images = boatImagesByType[boatType.value] || boatImagesByType['Small boat'];
  const drawingIndex = images.findIndex(([maximum]) => feet <= maximum);
  const selectedIndex = drawingIndex === -1 ? images.length - 1 : drawingIndex;
  const drawing = images[selectedIndex];
  boatLengthOutput.textContent = `${feet} ft`;
  classicBoat.src = drawing[1];
  classicBoat.alt = drawing[2];
  const noInterior = boatType.value === 'Small boat' && feet <= 16;
  boatInteriorLabel.hidden = noInterior;
  if (noInterior) boatInterior.value = 'No interior cleaning';
  boatLength.style.setProperty('--range-progress', `${((feet - Number(boatLength.min)) / (Number(boatLength.max) - Number(boatLength.min))) * 100}%`);
}

function selectBoatType(value) {
  boatType.value = value;
  const [minimum, maximum, initial] = boatLengthRanges[value];
  boatLength.min = minimum;
  boatLength.max = maximum;
  boatLength.value = initial;
  document.querySelector('.boat-length-limits span:first-child').textContent = `${minimum} ft`;
  document.querySelector('.boat-length-limits span:last-child').textContent = `${maximum} ft`;
  boatInterior.value = 'No interior cleaning';
  boatInteriorLabel.hidden = value === 'Small boat' && Number(boatLength.value) <= 16;
  updateBoatLength();
  resetDates();
}

function revealBoatStep(step) {
  step.hidden = false;
  requestAnimationFrame(() => {
    step.classList.add('is-active');
    step.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function resetDates() {
  boatBookingFields.hidden = true;
  boatPrice.hidden = true;
  boatSteps.book.hidden = true;
  boatSteps.book.classList.remove('is-active');
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
document.querySelectorAll('[name="boatTypeChoice"]').forEach((choice) => choice.addEventListener('change', () => {
  selectBoatType(choice.value);
  revealBoatStep(boatSteps.size);
}));
document.querySelector('#boat-size-next').addEventListener('click', () => revealBoatStep(boatSteps.location));
document.querySelector('#boat-location-next').addEventListener('click', () => {
  if (boatBookingForm.locationQuery.value.trim().length < 3) {
    boatBookingStatus.textContent = 'Please enter a marina name or complete postcode.';
    return;
  }
  boatBookingStatus.textContent = '';
  revealBoatStep(boatSteps.clean);
});
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
      if (!/^https:\/\/script\.google\.com\//.test(bookingApi)) {
        throw new Error('Online booking is being updated. Please send an enquiry for now.');
      }
      params.set('action', 'availability');
      let data;
      let lastError;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(`${bookingApi}?${params}`, { signal: controller.signal });
          data = await response.json();
          if (!response.ok || data.error) throw new Error(data.error || 'Unable to check availability.');
          break;
        } catch (error) {
          lastError = error;
          if (attempt === 0) { boatBookingStatus.textContent = 'Still checking nearby dates…'; await new Promise(resolve => setTimeout(resolve, 700)); }
        } finally { clearTimeout(timeout); }
      }
      if (!data) throw lastError || new Error('Unable to check availability.');

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
      revealBoatStep(boatSteps.book);
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
    if (!/^https:\/\/script\.google\.com\//.test(bookingApi)) {
      throw new Error('Online booking is being updated. Please send an enquiry for now.');
    }
    const response = await fetch(bookingApi, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();

    if (!response.ok || data.error || !data.url) {
      throw new Error(data.error || 'Unable to complete the booking.');
    }

    window.location.href = data.url;
  } catch (error) {
    boatBookingStatus.textContent =
      error.message || 'Unable to complete the booking. Please try again.';
  }
});

document.querySelector('#enquiry-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const enquiryForm = event.currentTarget;
  const enquiryStatus = document.querySelector('#enquiry-status');
  enquiryStatus.textContent = 'Sending…';

  try {
    if (!/^https:\/\/script\.google\.com\//.test(bookingApi)) {
      throw new Error('Online enquiries are being updated. Please email or call for now.');
    }
    const payload = Object.fromEntries(new FormData(enquiryForm));
    payload.action = 'enquiry';
    const response = await fetch(bookingApi, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Unable to send the enquiry.');
    enquiryForm.reset();
    enquiryStatus.textContent = 'Thank you — your enquiry has been sent.';
  } catch (error) {
    enquiryStatus.textContent = error.message || 'Unable to send the enquiry.';
  }
});
