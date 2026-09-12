export const priceFor=(service,size)=>({initial:{small:125,medium:145,large:175},regular4:{small:80,medium:90,large:110},regular8:{small:80,medium:90,large:110}}[service]?.[size]);
export const postcodeArea=p=>p.toUpperCase().replace(/\s+/g,' ').split(' ')[0];
export const isServed=p=>/^(BS|BA|GL|SN|TA|NP)/.test(p.toUpperCase());
