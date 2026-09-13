export const priceFor=(service,size)=>['oneoff','monthly','two_monthly','three_monthly'].includes(service)?({small:125,medium:145,large:175}[size]):undefined;
export const postcodeArea=p=>p.toUpperCase().replace(/\s+/g,' ').split(' ')[0];
export const isServed=p=>/^(BS|BA|GL|SN|TA|NP)/.test(p.toUpperCase());
