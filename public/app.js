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
  return form.querySelector('[name="size"]:checked')?.value || 'medium';
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

form
  .querySelectorAll('[name="size"]')
  .forEach((option) => {
    option.addEventListener('change', updatePrice);
  });

service?.addEventListener('change', updatePrice);

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
      const response = await fetch(
        `/api/availability?postcode=${encodeURIComponent(postcode)}`
      );

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
