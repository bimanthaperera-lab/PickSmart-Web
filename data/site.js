// Everything on the page that you'd want to change lives in this file.
// Image paths are relative to index.html. Facts come from the app (Desktop\PickSmart\CLAUDE.md,
// PLAN.md); keep them true: no invented fares, fuel prices or release dates.

export const site = {
  name: "Picksmart",
  tagline: "Know your real profit before you ride.",
  description:
    "Picksmart shows Uber, PickMe and delivery riders in Sri Lanka what a ride will really earn, after the platform fee, fuel and wear, before they accept it.",
  // Early access and questions go here until the app is on Google Play.
  email: "bimanthaperera55@gmail.com",
  playStore: null, // The Google Play link, once the app is published. While null, the page says "coming soon".
  privacyPolicy: "privacy-policy.html",

  // The story at the top of the page: one rider, one offer, four beats.
  story: {
    kicker: "For Uber, PickMe and delivery riders in Sri Lanka",
    image: {
      src: "assets/story/night-1200.webp",
      small: "assets/story/night-720.webp",
      size: [1200, 1490],
      alt: "A 3D rider sitting on his scooter at a roadside in Colombo at night, looking at an offer on his phone, with tuk-tuks and city lights behind him.",
    },
    beats: [
      { label: "10:54 pm", text: "A new offer. Rs. 1,000 for a 7 km trip, 2 km away." },
      { label: "Looks good?", text: "But the fare isn't what you keep." },
      { label: "Out of every fare", text: "The platform takes its fee. The trip burns fuel. Every km wears the bike." },
      { label: "Picksmart", text: "So the app works out what's left, in the seconds before you accept." },
    ],
  },

  // The phone's first screen, with the lens: under it, the maths behind each number.
  hero: {
    title: "Rs. 825.48 is what this ride really pays.",
    summary:
      "Not Rs. 1,000. Picksmart takes off the 10% fee, Rs. 74.52 of fuel for 9 km and your maintenance reserve, and says it plainly: Good, it meets your Rs. 50 per km target.",
    size: { width: 898, height: 2000 },
    cornerRadius: 56,
    // Where the lens rests until it's moved: a point on the screen, in its pixels.
    lensRest: [449, 1320],

    layers: {
      final: {
        src: "assets/app/check-good.webp",
        alt: "Picksmart's Check a Ride screen: a Rs. 1,000 Uber fare, 10% platform fee, 2 km pickup and 7 km trip. Result: Good, Rs. 825.48, Rs. 91.72 per km.",
      },
      components: "assets/app/layer-inputs.svg", // What the rider types, outlined.
      wireframe: "assets/app/layer-fields.svg", // Every field, as lines.
    },
    // Scrolling on from the hero: where the Rs. 1,000 goes, one row at a time.
    // `share` is the part of the fare it takes, for the bar (fare = 100).
    breakdown: {
      heading: "Where the Rs. 1,000 goes",
      rows: [
        { label: "Fare offered", value: "Rs. 1,000.00", kind: "fare" },
        { label: "Platform fee, 10%", value: "− Rs. 100.00", kind: "fee", share: 10 },
        { label: "Fuel for 9 km", value: "− Rs. 74.52", kind: "fuel", share: 7.452 },
        { label: "Maintenance reserve", value: "− Rs. 0.00", kind: "reserve", share: 0 },
        { label: "What you keep", value: "Rs. 825.48", note: "Rs. 91.72 per km · Good", kind: "keep" },
      ],
    },

    // The maths, drawn over the part of the screen it explains (screen pixels, 898 x 2000).
    // `accent: true` lines are drawn in the brand yellow.
    code: [
      { x: 40, y: 152, w: 818, h: 100, text: "app = Uber   fee = 10%" },
      { x: 64, y: 417, w: 770, h: 107, text: "fare = Rs. 1,000", accent: true },
      { x: 64, y: 545, w: 374, h: 161, text: "fee = 10% × 1,000\n    = Rs. 100" },
      { x: 460, y: 545, w: 374, h: 161, text: "other = Rs. 0" },
      { x: 64, y: 863, w: 770, h: 161, text: "km = 2 pickup + 7 trip\n   = 9 km" },
      {
        x: 40, y: 1208, w: 818, h: 562,
        text:
          "fuel    = 9 km × Rs. 414 ÷ 50 km/L\n        = Rs. 74.52\nreserve = 9 km × Rs. 0 = Rs. 0\n\nnet = 1,000 − 100 − 74.52 − 0\n    = Rs. 825.48\nper km = 825.48 ÷ 9 = Rs. 91.72\n\n91.72 ≥ target 50  →  Good",
        accent: true,
      },
      { x: 0, y: 1796, w: 898, h: 204, text: "no internet needed" },
    ],
  },

  // Features. Each one shows its screen on the phone beside the text, in this order.
  // `screen` is a capture from the real app at 898 x 2000. `image` is used where the phone
  // isn't (phones, reduced motion).
  projects: [
    {
      kicker: "Check a Ride",
      title: "Three numbers in, one honest answer out.",
      summary:
        "Type the fare. Your platform fee and last distances are already filled in, and your vehicle's fuel and wear come from its own settings. The answer updates as you type, with no internet.",
      screen: "assets/app/check-good.webp",
      image: "assets/app/check-good.webp",
      alt: "Check a Ride showing a Good result: Rs. 825.48 for 9 km.",
    },
    {
      kicker: "Loss",
      title: "It tells you when to say no.",
      summary:
        "A Rs. 60 fare for the same 9 km doesn't cover the fuel. Picksmart shows it in red and in words: this ride costs more than it pays.",
      screen: "assets/app/check-loss.webp",
      image: "assets/app/check-loss.webp",
      alt: "Check a Ride showing a Loss: minus Rs. 20.52 for a Rs. 60 fare over 9 km.",
    },
    {
      kicker: "Your target",
      title: "Set the rupees per km you're happy with.",
      summary:
        "Offers that make money but fall under your own target turn amber, so 'it's okay' and 'it's worth it' never look the same.",
      screen: "assets/app/check-below.webp",
      image: "assets/app/check-below.webp",
      alt: "Check a Ride showing Below target: Rs. 105.48, Rs. 11.72 per km, under a Rs. 50 per km target.",
    },
    {
      kicker: "Home",
      title: "Your day, after costs, on one screen.",
      summary:
        "Today's net profit after fees, fuel and maintenance, then this month and all time underneath. Marked Estimated, because fuel use varies.",
      screen: "assets/app/home.webp",
      image: "assets/app/home.webp",
      alt: "Picksmart Home: today's net profit Rs. 1,695.96 from 3 trips over 18 km.",
    },
    {
      kicker: "History",
      title: "Every ride you took, kept.",
      summary:
        "Swipe a trip right to edit it, left to delete it. Offers you only checked are kept apart, so they never count as money you earned.",
      screen: "assets/app/history.webp",
      image: "assets/app/history.webp",
      alt: "Picksmart History: trips grouped by day, each with its fare, distance and profit.",
    },
    {
      kicker: "Reports",
      title: "Your week and month, line by line.",
      summary:
        "Gross earnings, platform fees, fuel and maintenance, by day, week or month, as an estimate or as cash. Sign in to export everything to a spreadsheet.",
      screen: "assets/app/reports-oct.webp",
      image: "assets/app/reports-oct.webp",
      alt: "Picksmart Reports for October 2026: estimated net profit Rs. 1,782.58, with fees, fuel and maintenance listed.",
    },
    {
      kicker: "Fuel log",
      title: "Your real km per litre, from real fill-ups.",
      summary:
        "Log what you put in the tank and Picksmart works out what your vehicle actually does, instead of what the brochure says.",
      screen: "assets/app/fuel-log.webp",
      image: "assets/app/fuel-log.webp",
      alt: "Picksmart Fuel log: two fill-ups of 1.45 litres at Rs. 414 per litre.",
    },
  ],

  // Between the features and the maths: the vehicles.
  fleet: {
    heading: "Whatever you ride.",
    lead:
      "Motorbike, three-wheeler, car, or deliveries for your own shop. Each vehicle keeps its own fuel type, km per litre and maintenance reserve, and you switch between them in a tap.",
    note: "One vehicle without an account, three when you sign in.",
    image: {
      src: "assets/story/vehicles-1600.webp",
      small: "assets/story/vehicles-900.webp",
      size: [1600, 893],
      alt: "A scooter, a three-wheeler, a small car and a delivery scooter side by side, each with a yellow map pin above it.",
    },
  },

  // "How it's worked out": three parts of the Check a Ride screen, each with its maths.
  // The area each one points at lives in data/scroll.js (focus).
  about: {
    heading: "No magic. Just your numbers.",
    lead:
      "Every result is worked out on your phone from numbers you can see and change. Here's the Rs. 1,000 offer again, step by step.",
    image: {
      src: "assets/story/costs-1600.webp",
      small: "assets/story/costs-900.webp",
      size: [1600, 893],
      alt: "The rider holding out his hand as a gold coin splits into slices: one to a fuel nozzle, one to a wrench, one to an app, and the biggest slice stays with him.",
    },
    examples: [
      {
        title: "The fare and the fee",
        screen:
          "Pick the app and type the fare. The fee is a percentage or a fixed amount, remembered from last time. Or switch to 'Payout after fee' if your app already shows what you get.",
        build: "Uber, PickMe, courier and your own deliveries each keep their own fee.",
        snippet: `fare = Rs. 1,000\nfee  = 10% × 1,000 = Rs. 100`,
        alt: "The fare field showing Rs. 1,000, and the platform fee at 10%.",
      },
      {
        title: "The whole distance",
        screen:
          "The ride to the pickup costs fuel too, so it counts. Add the km back home if the trip leaves you far out.",
        build: "Pickup, trip and an optional return, added up.",
        snippet: `km = 2 pickup + 7 trip + 0 return\n   = 9 km`,
        alt: "The distance fields: 2 km pickup, 7 km trip, return empty. Total 9 km.",
      },
      {
        title: "Fuel, wear, and what's left",
        screen:
          "Fuel comes from your price per litre and your vehicle's km per litre. The maintenance reserve puts a little aside per km for tyres, oil and repairs.",
        build: "Then the result is compared with your target per km.",
        snippet: `fuel = 9 × 414 ÷ 50       = Rs. 74.52\nnet  = 1,000 − 100 − 74.52 = Rs. 825.48\n       Rs. 91.72 per km  →  Good`,
        alt: "The result card: Good, Rs. 825.48, with distance, fee, fuel and reserve listed.",
      },
    ],
  },

  // "While you ride". `status`: what's in the app today, what's being tested, what's planned.
  stack: {
    heading: "While you ride.",
    groups: [
      {
        label: "Floating bubble",
        status: "In the app",
        text: "Your target per km, a tap away over the ride app. It keeps to the side edges, away from Accept buttons. Hold it to hide it.",
        image: "assets/app/bubble-crop.png",
      },
      {
        label: "Read ride offers",
        status: "Optional, in testing",
        text: "Turn it on, and a new Uber or PickMe offer shows profit or loss straight away. It only reads the offer, never taps. Off until you choose; the app explains the risk first.",
      },
      {
        label: "Works offline",
        status: "In the app",
        text: "Checking a ride, your history and reports all work with no signal and no account.",
      },
      {
        label: "Shift reminder",
        status: "Planned",
        text: "A silent notification with your minimum fare per km, on the lock screen while you work.",
      },
    ],
  },

  privacy: {
    heading: "Your money stays your business.",
    points: [
      "No account needed. Everything is kept on your phone unless you choose to sign in.",
      "Signing in adds a backup, so a new phone gets your trips back.",
      "No location tracking. No analytics.",
      "Picksmart never taps, types or acts inside Uber or PickMe.",
    ],
  },

  plans: {
    heading: "Free for every ride.",
    lead: "No plan ever limits how many rides you can check or record. The plans below are planned for launch and may change.",
    tiers: [
      {
        name: "Free",
        note: "No account",
        items: ["Unlimited ride checks and trips", "This week's reports", "1 vehicle"],
      },
      {
        name: "Signed in",
        note: "Free account",
        items: ["Everything in Free", "Reports for your whole history", "Cloud backup and a new phone restore", "Export to CSV", "Up to 3 vehicles"],
      },
      {
        name: "Premium",
        note: "Coming later",
        items: ["Everything when signed in", "Unlimited vehicles", "Fill a check from a screenshot", "Shift reminder and quick tile", "Monthly and tax summaries"],
      },
    ],
  },

  // The end of the page: the same rider at dawn.
  contact: {
    heading: "End the shift knowing what you made.",
    note: "Picksmart is being tested now and is coming to Google Play. Email to get early access or to ask anything.",
    image: {
      src: "assets/story/dawn-1600.webp",
      small: "assets/story/dawn-900.webp",
      size: [1600, 893],
      alt: "The rider at dawn, sitting on his scooter by a tea kiosk, smiling at his phone with a cup of tea in his hand.",
    },
  },
};
