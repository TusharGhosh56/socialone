// Get in Touch page — static contact details + office locations.
// No phone number by product decision: the page offers email and the contact
// form only. `mapQuery` feeds a key-free Google Maps embed
// (https://www.google.com/maps?q=<mapQuery>&output=embed).
export interface ContactEmail {
  label: string;
  email: string;
}

export interface Office {
  city: string;
  address: string;
  mapQuery: string;
}

export const contactEmails: ContactEmail[] = [
  { label: 'Partnership Queries', email: 'contact@aplyd.com' },
  { label: 'Media Queries', email: 'adhish.k@athenainfonomics.com' },
];

export const offices: Office[] = [
  {
    city: 'Washington D.C., USA',
    address: '5402 Huntington Pkwy, Bethesda, Maryland - 20814, USA',
    mapQuery: '5402 Huntington Pkwy, Bethesda, Maryland 20814, USA',
  },
  {
    city: 'London, U.K.',
    address: '12 Northfields Prospect, Putney Bridge Road, London - SW18 1P, England, UK',
    mapQuery: '12 Northfields Prospect, Putney Bridge Road, London SW18 1P, UK',
  },
  {
    city: 'Berlin, Germany',
    address: 'TolaData, Wallstraße 15, 10179 Berlin, Germany',
    mapQuery: 'Wallstraße 15, 10179 Berlin, Germany',
  },
  {
    city: 'Nairobi, Kenya',
    address: 'Nairobi Garage, The Promenade, General Mathenge Drive, Westlands, Nairobi, Kenya, PO Box 1347 00606',
    mapQuery: 'Nairobi Garage, The Promenade, General Mathenge Drive, Westlands, Nairobi, Kenya',
  },
  {
    city: 'Delhi, India',
    address: '3rd Floor, B-32, Tara Crescent, Qutab Institutional Area, New Delhi – 110016',
    mapQuery: 'B-32, Tara Crescent, Qutab Institutional Area, New Delhi 110016, India',
  },
  {
    city: 'Chennai, India',
    address: '2A, Jeyamkondar, New no. 40 (Old no. 12), Murrays Gate Road, Alwarpet, Chennai, Tamil Nadu, Pin - 600018',
    mapQuery: '40 Murrays Gate Road, Alwarpet, Chennai, Tamil Nadu 600018, India',
  },
  {
    city: 'Dhaka, Bangladesh',
    address: 'Suit-11/B, Al Amin Millennium Tower, 75/76 Kakrail, Dhaka-1000, Bangladesh',
    mapQuery: 'Al Amin Millennium Tower, 75/76 Kakrail, Dhaka 1000, Bangladesh',
  },
];
