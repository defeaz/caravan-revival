export const priceFor = (service, size) =>
  ['oneoff', 'ongoing'].includes(service)
    ? { small: 125, medium: 145, large: 175 }[size]
    : undefined;

export const postcodeArea = (postcode) =>
  postcode.toUpperCase().replace(/\s+/g, ' ').split(' ')[0];

export const isServed = (postcode) =>
  /^(BS|BA|GL|SN|TA|NP)/.test(postcode.toUpperCase());

export const serviceLoad = (service) => ({
  oneoff: 0.5,
  ongoing: 0.2,
  'boat-oneoff': 1,
  'boat-regular': 1 / 3
})[service];

export const canFitBooking = (existing, service, area) => {
  const requestedLoad = serviceLoad(service);
  if (!requestedLoad) return false;
  if (existing.some((booking) => booking.postcode_area !== area)) return false;

  const used = existing.reduce(
    (total, booking) => total + (serviceLoad(booking.service) || 0.5),
    0
  );

  return used + requestedLoad <= 1.0001;
};
