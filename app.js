const form = document.querySelector('#booking-form');
const fields = document.querySelector('#booking-fields');
const status = document.querySelector('#form-status');
const range = document.querySelector('#vehicle-length');
const image = document.querySelector('#vehicle-length-image');
const typeField = document.querySelector('#vehicle-type');
const api = window.BOOKING_API_URL;
const money = n => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP',maximumFractionDigits:0}).format(n);
const round5 = n => Math.round(n/5)*5;
const drawings = {
  'Touring caravan': [
    [3,'touring-caravan/micro-caravan-v2.png','Micro caravan'],[3.5,'touring-caravan/compact-retro-caravan-v3.png','Compact retro caravan'],[4,'touring-caravan/pop-top-tourer-v3.png','Pop-top tourer'],[4.5,'touring-caravan/compact-tourer-v2.png','Compact tourer'],[5.5,'touring-caravan/classic-tourer-v2.png','Classic tourer'],[6.5,'touring-caravan/family-tourer-v3.png','Family tourer'],[7.5,'touring-caravan/twin-axle-tourer-v2.png','Twin-axle tourer'],[8.5,'touring-caravan/large-twin-axle-v3.png','Large twin-axle tourer']
  ],
  Campervan: [[4.5,'../../vehicle-sizes-v2/vw-california.png','Compact pop-top camper'],[5.5,'campervan/compact-campervan.png','Pop-top campervan'],[6,'campervan/long-wheelbase-campervan.webp','Long-wheelbase campervan'],[7,'campervan/extra-long-campervan.webp','Extra-long campervan']],
  Motorhome: [[7,'motorhome/coachbuilt-motorhome-v2.png','Coachbuilt motorhome'],[8.5,'motorhome/premium-a-class-v3.png','A-class motorhome'],[9.5,'motorhome/a-class-motorhome-v2.png','Integrated motorhome'],[10.5,'motorhome/luxury-motorhome-v3.png','Luxury motorhome'],[12,'motorhome/extra-large-motorhome-v3.png','Large motorhome'],[14,'motorhome/motorcoach-v3.png','Motorcoach']],
  'Static caravan': [[10.5,'static-caravan/long-static-caravan-v3.png','Static caravan'],[14,'static-caravan/large-static-caravan-v2.png','Large static caravan']]
};
const ranges = {'Touring caravan':[2.5,8.5,6],Campervan:[4,7,5.5],Motorhome:[5.5,14,7],'Static caravan':[8,14,10]};
const profiles = {
  Campervan:{exteriorBase:50,exteriorMetre:7,interiorBase:30,interiorMetre:4},
  'Touring caravan':{exteriorBase:55,exteriorMetre:9,interiorBase:45,interiorMetre:5},
  Motorhome:{exteriorBase:75,exteriorMetre:11,interiorBase:55,interiorMetre:7},
  'Static caravan':{exteriorBase:155,exteriorMetre:12,interiorBase:90,interiorMetre:9}
};
let quote = 0;
function resetDates(){fields.hidden=true;document.querySelector('#date').innerHTML='';status.textContent='';}
function refresh(){
  const type=typeField.value, metres=Number(range.value), profile=profiles[type];
  const picture=drawings[type].find(([max])=>metres<=max) || drawings[type].at(-1);
  image.src=picture[1].startsWith('../')?'/assets/vehicle-sizes-v2/vw-california.png':`/assets/vehicles/sizes/${picture[1]}`;
  image.alt=`Representative ${picture[2].toLowerCase()} profile`;
  document.querySelector('#vehicle-profile-label').textContent=`${picture[2]} profile · ${metres.toFixed(1)} m overall`;
  document.querySelector('#vehicle-length-output').textContent=`${metres.toFixed(1)} m`;
  document.querySelector('#vehicle-size').value=`${metres.toFixed(1)}m`;
  range.style.setProperty('--range-progress',`${(metres-Number(range.min))/(Number(range.max)-Number(range.min))*100}%`);
  const exterior=round5(profile.exteriorBase+profile.exteriorMetre*metres);
  const fullInterior=round5((profile.interiorBase+profile.interiorMetre*metres)*1.35);
  const choice=form.elements.interiorService.value;
  const interior=choice==='Full interior detail'?fullInterior:choice==='Interior clean'?round5(fullInterior*.5):0;
  const wheels=type==='Static caravan'?0:type==='Touring caravan'?(metres>6.5?20:10):type==='Motorhome'?(metres>9?35:15):10;
  const large=type==='Motorhome'&&metres>8?round5((metres-8)*40):0;
  const ongoing=form.elements.service.value==='ongoing';
  const exteriorPrice=ongoing?round5((exterior+wheels+large)*.7):exterior+wheels+large;
  quote=exteriorPrice+interior;
  document.querySelector('#exterior-price').textContent=money(exteriorPrice);
  document.querySelector('#interior-label').textContent=choice;
  document.querySelector('#interior-price').textContent=money(interior);
  document.querySelector('#total-price').textContent=money(quote);
  document.querySelector('#total-label').textContent=ongoing?'Per visit':'One-off visit';
  document.querySelector('#regular-frequency').hidden=!ongoing;
  form.querySelectorAll('[name="frequency"]').forEach(el=>el.disabled=!ongoing);
}
function changeChoice(){resetDates();refresh();}
range.addEventListener('input',changeChoice);
form.querySelectorAll('[name="interiorService"],[name="service"]').forEach(el=>el.addEventListener('change',changeChoice));
form.querySelectorAll('[name="vehicleTypeChoice"]').forEach(el=>el.addEventListener('change',()=>{
  typeField.value=el.value;
  const [min,max,initial]=ranges[el.value];range.min=min;range.max=max;range.value=initial;
  const labels=document.querySelectorAll('.vehicle-length-limits span');labels[0].textContent=`${min} m`;labels[1].textContent=`${((min+max)/2).toFixed(1)} m`;labels[2].textContent=`${max} m`;
  changeChoice();
}));
form.postcode.addEventListener('input',resetDates);
refresh();
document.querySelector('#find-dates').addEventListener('click',async()=>{
  const postcode=form.postcode.value.trim().toUpperCase();resetDates();
  if(!/^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/.test(postcode)){status.textContent='Enter a complete UK postcode first.';return;}
  status.textContent='Checking dates…';
  try{
    const params=new URLSearchParams({action:'availability',postcode,service:form.elements.service.value});
    const response=await fetch(`${api}?${params}`);const data=await response.json();
    if(!response.ok||data.error)throw new Error(data.error||'Dates could not be checked.');
    if(!data.dates?.length)throw new Error('No suitable dates are open right now. Please send an enquiry.');
    document.querySelector('#date').replaceChildren(...data.dates.map(({value,label})=>new Option(label,value)));
    fields.hidden=false;status.textContent='Choose a date to reserve your booking.';
  }catch(error){status.textContent=error.message||'Dates could not be checked.';}
});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(fields.hidden)return;status.textContent='Opening secure payment…';
  const payload=Object.fromEntries(new FormData(form));payload.cleanPrice=quote;
  try{
    const response=await fetch(api,{method:'POST',headers:{'content-type':'text/plain;charset=utf-8'},body:JSON.stringify(payload)});
    const data=await response.json();if(!response.ok||data.error||!data.url)throw new Error(data.error||'Booking could not be started.');
    location.href=data.url;
  }catch(error){status.textContent=error.message||'Booking could not be started.';}
});

document.querySelector('#enquiry-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const enquiryForm = event.currentTarget;
  const enquiryStatus = document.querySelector('#enquiry-status');
  enquiryStatus.textContent = 'Sending…';

  try {
    if (!/^https:\/\/script\.google\.com\//.test(api)) {
      throw new Error('Online enquiries are being updated. Please use the form later or call for now.');
    }
    const payload = Object.fromEntries(new FormData(enquiryForm));
    payload.action = 'enquiry';
    const response = await fetch(api, {
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
