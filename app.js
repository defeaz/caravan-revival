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
const vehicleLengthName = document.querySelector('#vehicle-length-name');
const vehicleLengthBand = document.querySelector('#vehicle-length-band');
const vehicleSize = document.querySelector('#vehicle-size');
const bookingSubmit = form.querySelector('button[type="submit"]');
const quoteSizeButton = form.querySelector('.quote-size-button');

const oneOffPrices = {
  small: 125,
  medium: 145,
  large: 175
};

const ongoingPrices = {
  small: 80,
  medium: 90,
  large: 110
};

function selectedSize() {
  return vehicleSize.value;
}

const vehicleDrawings = [
  [3.2, 'Micro caravan', '01-micro-caravan.svg', 'Compact teardrop caravan'],
  [4.0, 'Classic campervan', '02-classic-campervan.svg', 'Classic compact campervan'],
  [4.8, 'Pop-top camper', '03-pop-top-camper.svg', 'Pop-top campervan'],
  [5.5, 'Compact tourer', '04-compact-tourer.svg', 'Compact single-axle touring caravan'],
  [6.3, 'Classic tourer', '05-classic-tourer.svg', 'Classic single-axle touring caravan'],
  [7.0, 'Large tourer', '06-twin-axle-tourer.svg', 'Large twin-axle touring caravan'],
  [7.7, 'Coachbuilt motorhome', '07-coachbuilt-motorhome.svg', 'Coachbuilt motorhome'],
  [8.5, 'A-class motorhome', '08-a-class-motorhome.svg', 'A-class motorhome'],
  [10, 'Large touring motorhome', '09-large-rv.svg', 'Large touring motorhome']
];

function sizeForLength(length) {
  if (length <= 5.5) return 'small';
  if (length <= 7) return 'medium';
  if (length <= 8.5) return 'large';
  return 'quote';
}

function updateVehicleLength() {
  const metres = Number(vehicleLength.value);
  const drawing = vehicleDrawings.find(([maximum]) => metres <= maximum);
  const size = sizeForLength(metres);
  const quotedSeparately = size === 'quote';

  vehicleLengthOutput.textContent = `${metres.toFixed(1)} m`;
  vehicleLengthImage.src = `/assets/vehicle-sizes/${drawing[2]}`;
  vehicleLengthImage.alt = drawing[3];
  vehicleLengthName.textContent = drawing[1];
  vehicleSize.value = size;
  vehicleLength.style.setProperty(
    '--range-progress',
    `${((metres - 2.5) / 7.5) * 100}%`
  );

  if (quotedSeparately) {
    vehicleLengthBand.textContent = 'Over 8.5 m · quoted separately';
    price.textContent = 'Quote';
    regularNote.hidden = true;
  } else {
    const label = size.charAt(0).toUpperCase() + size.slice(1);
    vehicleLengthBand.textContent = `${label} · £${oneOffPrices[size]}`;
    updatePrice();
  }

  bookingSubmit.hidden = quotedSeparately;
  quoteSizeButton.hidden = !quotedSeparately;
}

function updatePrice() {
  const size = selectedSize();
  const ongoing = service.value === 'ongoing';

  price.textContent = `£${oneOffPrices[size]}`;
  regularNote.hidden = !ongoing;

  if (ongoing) {
    regularCopy.textContent =
      `After that, cleans are £${ongoingPrices[size]} each.`;
  }
}

vehicleLength?.addEventListener('input', updateVehicleLength);

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

  if (selectedSize() === 'quote') {
    status.textContent = 'Vehicles over 8.5 m are quoted separately. Please send an enquiry.';
    return;
  }

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
