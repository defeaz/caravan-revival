(async () => {
  const label = document.querySelector('#confirmation-label');
  const title = document.querySelector('#confirmation-title');
  const copy = document.querySelector('#confirmation-copy');
  const sessionId = new URLSearchParams(location.search).get('session_id');

  try {
    if (!sessionId || !/^https:\/\/script\.google\.com\//.test(window.BOOKING_API_URL)) {
      throw new Error('The payment reference is missing. Please contact Caravan Revival.');
    }
    const params = new URLSearchParams({ action: 'confirm', session_id: sessionId });
    const response = await fetch(`${window.BOOKING_API_URL}?${params}`);
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    if (!data.paid) throw new Error('The payment has not completed. Please contact Caravan Revival if money left your account.');
    label.textContent = 'Booking confirmed';
    title.textContent = 'Your clean is in the calendar.';
    copy.textContent = 'Thank you. Your £30 deposit has been received and confirmation is on its way by email. Please ensure water and electricity are available.';
  } catch (error) {
    label.textContent = 'Please contact us';
    title.textContent = 'We could not confirm this automatically.';
    copy.textContent = error.message;
  }
})();
