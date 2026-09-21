document.head.insertAdjacentHTML(
  'beforeend',
  '<link rel="stylesheet" href="/updates.css?v=4">'
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
const bookingApi = window.BOOKING_API_URL;

function selectedSize() {
  return vehicleSize.value;
}

const vehicleDrawings = [
  [3.0, 'vehicle-sizes-v2/micro-caravan-v2.png', 'Teardrop micro caravan'],
  [3.5, 'vehicle-sizes-v2/compact-retro-caravan-v3.png', 'Compact touring caravan'],
  [4.0, 'vehicle-sizes-v2/pop-top-tourer-v3.png', 'Compact pop-top touring caravan'],
  [4.5, 'vehicle-sizes-v2/compact-tourer-v2.png', 'Compact single-axle touring caravan'],
  [5.0, 'vehicle-sizes-v2/compact-campervan-v3.png', 'Compact pop-top campervan'],
  [5.5, 'vehicle-sizes-v2/classic-tourer-v2.png', 'Classic single-axle touring caravan'],
  [6.0, 'vehicle-sizes-v2/family-tourer-v3.png', 'Family touring caravan'],
  [6.5, 'vehicle-sizes-v2/pop-top-camper-v2.png', 'Modern pop-top campervan'],
  [7.0, 'vehicle-sizes-v2/large-twin-axle-v3.png', 'Large twin-axle touring caravan'],
  [7.5, 'vehicle-sizes-v2/coachbuilt-motorhome-v2.png', 'Coachbuilt motorhome'],
  [8.0, 'vehicle-sizes-v2/twin-axle-tourer-v2.png', 'Premium twin-axle touring caravan'],
  [8.5, 'vehicle-sizes-v2/premium-a-class-v3.png', 'Premium A-class motorhome'],
  [9.0, 'vehicle-sizes-v2/a-class-motorhome-v2.png', 'Integrated A-class motorhome'],
  [9.5, 'vehicle-sizes-v2/luxury-motorhome-v3.png', 'Luxury motorhome'],
  [10.5, 'vehicle-sizes-v2/large-static-caravan-v2.png', 'Large static caravan'],
  [11.5, 'vehicle-sizes-v2/extra-large-motorhome-v3.png', 'Extra-large luxury motorhome'],
  [12.5, 'vehicle-sizes-v2/long-static-caravan-v3.png', 'Long luxury static caravan'],
  [14, 'vehicle-sizes-v2/motorcoach-v3.png', 'Full-size luxury motorcoach']
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
  const drawing = vehicleDrawings.find(([maximum]) => metres <= maximum) || vehicleDrawings.at(-1);
  const details = priceDetails(type, metres);
  const ongoingPrice = roundToFive(details.total * 0.65);

  vehicleLengthOutput.textContent = `${metres.toFixed(1)} m`;
  vehicleLengthImage.src = `/assets/${drawing[1]}`;
  vehicleLengthImage.alt = drawing[2];
  vehicleLengthImage.style.setProperty(
    '--vehicle-width',
    `${45 + ((metres - 2.5) / 11.5) * 47}%`
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
      if (!/^https:\/\/script\.google\.com\//.test(bookingApi)) {
        throw new Error('Online booking is being updated. Please send an enquiry for now.');
      }
      params.set('action', 'availability');
      const response = await fetch(`${bookingApi}?${params}`);

      const data = await response.json();

      if (!response.ok || data.error) {
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
    if (!/^https:\/\/script\.google\.com\//.test(bookingApi)) {
      throw new Error('Online booking is being updated. Please send an enquiry for now.');
    }
    const response = await fetch(bookingApi, {
      method: 'POST',
      headers: {
        'content-type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok || data.error || !data.url) {
      throw new Error(data.error || 'Unable to book');
    }

    location.href = data.url;
  } catch (error) {
    status.textContent =
      error.message ||
      'Unable to complete the booking. Please try again.';
  }
});

document.querySelector('#enquiry-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const enquiryForm = event.currentTarget;
  const enquiryStatus = document.querySelector('#enquiry-status');
  enquiryStatus.textContent = 'Sending…';

  try {
    if (!/^https:\/\/script\.google\.com\//.test(bookingApi)) {
      throw new Error('Online enquiries are being updated. Please use the form later or call for now.');
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
