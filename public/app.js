document.head.insertAdjacentHTML(
  'beforeend',
  '<link rel="stylesheet" href="/updates.css">'
);

const form = document.querySelector('#booking-form');
const fields = document.querySelector('#booking-fields');
const status = document.querySelector('#form-status');
const price = document.querySelector('#total-price');
const service = document.querySelector('#service');
const regularNote = document.querySelector('#regular-note');
const regularCopy = document.querySelector('#regular-copy');
const vehicleLength = document.querySelector('#vehicle-length');
const vehicleLengthOutput = document.querySelector('#vehicle-length-output');
const vehicleLengthImage = document.querySelector('#vehicle-length-image');
const vehicleSize = document.querySelector('#vehicle-size');
const vehicleType = document.querySelector('#vehicle-type');
const priceCalculation = document.querySelector('#price-calculation');

function selectedSize() {
  return vehicleSize.value;
}

const vehicleDrawings = [
  [4.2, 'Freedom Microlite-style caravan', 'freedom-microlite.png', 'Freedom Microlite-style compact caravan'],
  [5.0, 'VW California-style campervan', 'vw-california.png', 'Volkswagen California-style pop-top campervan'],
  [5.5, 'Eriba Touring-style caravan', 'eriba-touring.png', 'Eriba Touring-style pop-top caravan'],
  [6.4, 'Swift Challenger-style tourer', 'swift-challenger.png', 'Swift Challenger-style single-axle touring caravan'],
  [7.2, 'Swift Challenger Grande-style tourer', 'swift-challenger-grande.png', 'Swift Challenger Grande-style twin-axle touring caravan'],
  [7.7, 'Auto-Trail F-Line-style motorhome', 'autotrail-f-line.png', 'Auto-Trail F-Line-style coachbuilt motorhome'],
  [8.3, 'Hymer MasterLine-style motorhome', 'hymer-masterline.png', 'Hymer MasterLine-style A-class motorhome'],
  [9.5, 'Concorde Charisma-style liner', 'concorde-charisma.png', 'Concorde Charisma-style luxury motorhome'],
  [11.5, 'Morelo Grand Empire-style liner', 'morelo-grand-empire.png', 'Morelo Grand Empire-style three-axle motorhome'],
  [14, '45-foot Newell-style motorcoach', 'newell-coach.png', 'Newell Coach-style full-size motorcoach']
];

function roundToFive(amount) {
  return Math.round(amount / 5) * 5;
}

function priceDetails(type, length) {
  const profiles = {
    'Campervan': { exteriorBase: 50, exteriorMetre: 7, interiorBase: 30, interiorMetre: 4 },
    'Touring caravan': { exteriorBase: 55, exteriorMetre: 9, interiorBase: 45, interiorMetre: 5 },
    'Motorhome': { exteriorBase: 75, exteriorMetre: 11, interiorBase: 55, interiorMetre: 7 },
    'Static caravan': { exteriorBase: 155, exteriorMetre: 12, interiorBase: 90, interiorMetre: 9 }
  };
  const profile = profiles[type];
  const exterior = roundToFive(profile.exteriorBase + profile.exteriorMetre * length);
  const interior = roundToFive(profile.interiorBase + profile.interiorMetre * length);
  const wheels = type === 'Static caravan'
    ? 0
    : type === 'Touring caravan'
      ? length > 6.5 ? 20 : 10
      : type === 'Motorhome'
        ? length > 9 ? 35 : 15
        : 10;
  const largeVehicle = type === 'Motorhome' && length > 8
    ? roundToFive((length - 8) * 40)
    : 0;
  return {
    exterior,
    interior,
    wheels,
    largeVehicle,
    total: exterior + interior + wheels + largeVehicle
  };
}

function updateVehicleLength() {
  const metres = Number(vehicleLength.value);
  const type = vehicleType.value;
  const drawing = vehicleDrawings.find(([maximum]) => metres <= maximum);
  const details = priceDetails(type, metres);
  const ongoingPrice = roundToFive(details.total * 0.65);

  vehicleLengthOutput.textContent = `${metres.toFixed(1)} m`;
  vehicleLengthImage.src = `/assets/vehicle-sizes-v2/${drawing[2]}`;
  vehicleLengthImage.alt = drawing[3];
  vehicleLengthImage.style.setProperty(
    '--vehicle-width',
    `${70 + ((metres - 2.5) / 11.5) * 30}%`
  );
  vehicleSize.value = `${metres.toFixed(1)}m`;
  vehicleLength.style.setProperty(
    '--range-progress',
    `${((metres - 2.5) / 11.5) * 100}%`
  );
  price.textContent = `£${details.total}`;
  priceCalculation.innerHTML =
    `<strong>How this is priced:</strong> exterior and roof £${details.exterior}` +
    ` · interior surfaces and rooms £${details.interior}` +
    (details.wheels ? ` · wheels £${details.wheels}` : '') +
    (details.largeVehicle ? ` · large-vehicle allowance £${details.largeVehicle}` : '');

  const ongoing = service.value === 'ongoing';
  regularNote.hidden = !ongoing;
  if (ongoing) {
    regularCopy.textContent =
      `After that, cleans are £${ongoingPrice} each.`;
  }
}

vehicleLength?.addEventListener('input', updateVehicleLength);
vehicleType?.addEventListener('change', updateVehicleLength);
service?.addEventListener('change', updateVehicleLength);
updateVehicleLength();

document
  .querySelector('#find-dates')
  ?.addEventListener('click', async () => {
    const postcode = form.postcode.value.trim().toUpperCase();

    fields.hidden = true;

    if (!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(postcode)) {
      status.textContent = 'Please enter a complete UK postcode.';
      return;
    }

    status.textContent = 'Checking nearby availability…';

    try {
      const params = new URLSearchParams({
        postcode,
        service: service.value
      });
      const response = await fetch(`/api/availability?${params}`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to check this postcode.'
        );
      }

      if (!data.dates.length) {
        throw new Error(
          'There are no nearby dates available at present. Please send an enquiry.'
        );
      }

      document.querySelector('#date').innerHTML = data.dates
        .map(
          (date) =>
            `<option value="${date.value}">${date.label}</option>`
        )
        .join('');

      fields.hidden = false;
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
    }
  });

form?.addEventListener('submit', async (event) => {
  event.preventDefault();

  status.textContent = 'Taking you to secure payment…';

  const payload = Object.fromEntries(new FormData(form));

  try {
    const response = await fetch('/api/create-booking', {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to book');
    }

    location.href = data.url;
  } catch (error) {
    status.textContent =
      error.message ||
      'Unable to complete the booking. Please try again.';
  }
});
