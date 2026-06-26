import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Safe server-side Gemini client initialization helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not defined. AI features will run in mock mode.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Interfaces
import { DatabaseState, DailyPayment } from "./src/types";

// Seed Data
const defaultState: DatabaseState = {
  profiles: [
    { id: "ak-1", name: "Amit Kumar", user_role: "Manager", account_status: "Active" },
    { id: "ps-1", name: "Priya Sharma", user_role: "Telecaller", account_status: "Active" },
    { id: "rk-1", name: "Rahul Khan", user_role: "Supervisor", account_status: "Active" },
    { id: "vj-1", name: "Vikram Joshi", user_role: "Manager", account_status: "Active" },
    { id: "owner-1", name: "Rajesh Singh", user_role: "Owner", account_status: "Active" }
  ],
  clients: [
    { id: "cl-1", name: "Rahul Sharma", phone: "9876543210", tags: ["Seller"] },
    { id: "cl-2", name: "Heritage Brokers", phone: "9812345678", tags: ["Contractor"] },
    { id: "cl-3", name: "Amit Verma", phone: "9898989898", tags: ["Buyer"] }
  ],
  projects: [
    {
      id: "pr-1",
      project_name: "Silver Oak Residency",
      status: "Active",
      location: "Sector 45, Chandigarh",
      type: "Residential",
      completion_pct: 65,
      total_budget: 8400000,
      spent: 4250000
    },
    {
      id: "pr-2",
      project_name: "Nara Tower",
      status: "Active",
      location: "CBD South, Mohali",
      type: "Commercial",
      completion_pct: 12,
      total_budget: 25000000,
      spent: 1210000
    },
    {
      id: "pr-3",
      project_name: "Green Valley Estates",
      status: "Active",
      location: "Sector 85, Kharar",
      type: "Residential",
      completion_pct: 42,
      total_budget: 8542000,
      spent: 3843900
    }
  ],
  properties: [
    {
      id: "prop-1",
      title: "10 Marla Luxury Villa",
      property_type: "Villa",
      location: "Sector 125, Kharar",
      asking_price: 8550000,
      target_selling_price: 7800000,
      source_person_name: "Rahul Sharma (Direct)",
      source_person_type: "Owner",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBKCjFNjQm8SWpBMT2PqY3MlKIQ9-Srb_sJ3hZIvPB6mI-sdNYP-G8GnkK9m6KqDg8a4xbdu-RYxDp3toSIVgUOihaFhihC8dcJOzAVjala-wvjUE45VvOsJofcB8kXJSmC7d2BgxJBBT6l3hQvvo0N02Vg2PR3_x4efwMWhvYHwes0SG2b-T4CoSfwBrM3NKleq71COVqh3j2dtL054I1gAmjf7Cge9QUCxhsjCSYV3XbIbsSTe4fEpAbqeSqJODR_S8Qa1AqopdaM",
      status: "Available"
    },
    {
      id: "prop-2",
      title: "Skyline 3BHK Penthouse",
      property_type: "Flat",
      location: "Mohali Phase 7",
      asking_price: 11200000,
      target_selling_price: 10500000,
      source_person_name: "Heritage Brokers",
      source_person_type: "CP",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBg1FX6WlwaX3P8fTYruqIC2SfGJByeZxELcQtcg6ySMFtc8HfmCONl_nohGJsuOxkchBeyuZ02BO1vbSJ3NBNA_0jvSw1KzCFFQRpmdsqJTOBXsYloDqsM5hqlqdDItMZHpxpUTJIxeD2U8jGF4HslVagAv8Qa8VJI_72WvnDs0OpyasKp38E-EmfBTv4uKT6mbddBcBfeZKQg9JSIaZChA8BSzJFiPI9toG-qKd5fIeUBCHu4JhPUfs4hFLfiLB5PAxug-VHX86S-",
      status: "Hold"
    },
    {
      id: "prop-3",
      title: "Eco-Luxe Studio Apartment",
      property_type: "Flat",
      location: "New Chandigarh",
      asking_price: 4500000,
      target_selling_price: 3950000,
      source_person_name: "Amit Verma (Re-sale)",
      source_person_type: "Owner",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDfbKozjgD6AU0Ej4oGLFGJjAQRBVnlYSMV626C2DEhZ6CRYAJkF5mRdXnF6XgiJjzttz9hppRkdrA8gn70akhzKCETXPVCiJaUSN1ffUbUXRX97dllvqk6cJrQG21eJ_Fz1goQiisK0fsWQ0eLaYhOC8-VzwUvh8-ZewRIIXAAEYeCo-YAt3qZvqrMgWoBARGhku8vcTr2TQhfRSz3k2TtTQGdyOEzwFSmm-u3XzikQ95VxcbQ5Cw9nXL5tW4-VD1ik0ug5E-LIRNd",
      status: "Available"
    },
    {
      id: "prop-4",
      title: "Corporate Office Tower Unit",
      property_type: "Commercial",
      location: "IT Park, Chandigarh",
      asking_price: 24000000,
      target_selling_price: 21500000,
      source_person_name: "J.K. Developers",
      source_person_type: "Builder",
      image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuAgrlBoiL2rZBpKzQXOWWkdXPWjHo7ZVWGKRJ6DTkBS_wrrgyyrSEAERpw6iVvmBktjhXhxq9Aely12tZQLDXPp19Q7LG6p02ie3BpGzDwaRTD52DPnVZFSFTP1vTcGwc-BYgN712ZyjXCfvzR9hT0k4VsW9rm-7KKKjYgp-cGoJdsMF9ymBQ00V4DyQgE-hVcseISESOai3mnovy1UBkd113nRXwb8dQ-GMmJnsDWz2AWa5zlVRG8Z6qR3lki2QuNk-eVBfji5gYSf",
      status: "Available"
    }
  ],
  inbound_revenues: [
    {
      id: "rev-1",
      project_id: "pr-3",
      amount: 8542000,
      head_account: "Property Sale",
      payment_mode: "Online",
      payment_stage: "Advance",
      date: "2026-06-24T09:30:00Z"
    }
  ],
  daily_payments: [
    {
      id: "dp-1",
      project_id: "pr-3",
      amount: 12500,
      paid_by: "Supervisor Amit",
      remarks: "Paid shuttering labor wages",
      category: "Labor",
      date: "2026-06-26T10:45:00-07:00"
    },
    {
      id: "dp-2",
      project_id: "pr-3",
      amount: 18000,
      paid_by: "Supervisor Amit",
      remarks: "Cement delivery (50 bags)",
      category: "Materials",
      date: "2026-06-26T13:20:00-07:00"
    },
    {
      id: "dp-3",
      project_id: "pr-3",
      amount: 1200,
      paid_by: "Supervisor Amit",
      remarks: "Petty cash for plumbing bits",
      category: "Miscellaneous",
      date: "2026-06-26T16:15:00-07:00"
    }
  ],
  office_expenses: [],
  deal_adjustments: [],
  material_stocks: [
    {
      id: "st-1",
      name: "Grade 43 OPC Cement",
      category: "Cement",
      location: "Warehouse Sector 4",
      current_stock: 450,
      unit: "Bags",
      critical_level: 100,
      status: "In Stock",
      icon: "architecture"
    },
    {
      id: "st-2",
      name: "TMT Steel 12mm",
      category: "Steel",
      location: "South Yard A",
      current_stock: 0.8,
      unit: "Tons",
      critical_level: 2.0,
      status: "Low Stock",
      icon: "layers"
    },
    {
      id: "st-3",
      name: "Seasoned Teak Wood",
      category: "Wood",
      location: "Carpentry Unit 2",
      current_stock: 1200,
      unit: "Sq. Ft.",
      critical_level: 200,
      status: "In Stock",
      icon: "forest"
    },
    {
      id: "st-4",
      name: "Copper Pipes 0.5\"",
      category: "Plumbing",
      location: "Warehouse Sector 4",
      current_stock: 0,
      unit: "Meters",
      critical_level: 50,
      status: "Out of Stock",
      icon: "plumbing"
    }
  ],
  vendors: [
    {
      id: "ven-1",
      name: "Gupta Marbles",
      category: "Finishes",
      rating: 4.9,
      status: "PREFERRED",
      active_orders_count: 3,
      last_delivery_date: "Oct 24, 2023",
      total_spent: 1240000,
      paid_amount: 820000,
      balance_due: 420000,
      on_time_delivery_pct: 98,
      quality_rating: 4.8
    },
    {
      id: "ven-2",
      name: "Apex Steel",
      category: "Structural",
      rating: 4.7,
      status: "ACTIVE",
      active_orders_count: 1,
      last_delivery_date: "Nov 02, 2023",
      total_spent: 812400,
      paid_amount: 812400,
      balance_due: 0,
      on_time_delivery_pct: 95,
      quality_rating: 4.6
    },
    {
      id: "ven-3",
      name: "Nara Electricals",
      category: "Electrical",
      rating: 3.8,
      status: "ON HOLD",
      active_orders_count: 0,
      last_delivery_date: "Sep 15, 2023",
      total_spent: 150000,
      paid_amount: 50000,
      balance_due: 100000,
      on_time_delivery_pct: 85,
      quality_rating: 3.8
    }
  ],
  purchase_orders: [
    {
      id: "VE-104",
      vendor_id: "ven-1",
      vendor_name: "Gupta Marbles",
      project_name: "Green Valley Estates",
      order_date: "Oct 24, 2023",
      expected_delivery: "Oct 28, 2023",
      amount: 345000,
      status: "In Transit",
      item_name: "Italian Marble (Premium White)",
      item_sku: "MAR-ITA-500",
      quantity_description: "500 Sq. Ft.",
      unit_price: 690,
      timeline: [
        { title: "Order Placed", date: "Oct 24, 09:30 AM", done: true },
        { title: "Processed", date: "Oct 25, 02:15 PM", done: true },
        { title: "In Transit", date: "Rajasthan Hub - En route", done: true },
        { title: "Expected Delivery", date: "Oct 28 (Estimated)", done: false }
      ]
    },
    {
      id: "AS-882",
      vendor_id: "ven-2",
      vendor_name: "Apex Steel",
      project_name: "Green Valley Estates",
      order_date: "Oct 18, 2023",
      expected_delivery: "Oct 22, 2023",
      amount: 812400,
      status: "Completed",
      item_name: "12 Tons Reinforcement Bars",
      item_sku: "STL-RE-12",
      quantity_description: "12 Tons",
      unit_price: 67700,
      timeline: [
        { title: "Order Placed", date: "Oct 18, 08:00 AM", done: true },
        { title: "Processed", date: "Oct 18, 11:30 AM", done: true },
        { title: "In Transit", date: "Dispatched from warehouse", done: true },
        { title: "Delivered", date: "Oct 22, 04:00 PM", done: true }
      ]
    },
    {
      id: "CH-312",
      vendor_id: "ven-3",
      vendor_name: "Modern Paints Ltd.",
      project_name: "Nara Tower",
      order_date: "Oct 15, 2023",
      expected_delivery: "Oct 18, 2023",
      amount: 42500,
      status: "Cancelled",
      item_name: "40 Industrial Primer Tins",
      item_sku: "PNT-PRM-40",
      quantity_description: "40 Tins",
      unit_price: 1062.5,
      timeline: [
        { title: "Order Placed", date: "Oct 15, 10:00 AM", done: true },
        { title: "Rejected / Cancelled", date: "Oct 16, 09:00 AM", done: true }
      ]
    },
    {
      id: "CC-550",
      vendor_id: "ven-4",
      vendor_name: "City Concrete Co.",
      project_name: "Silver Oak Residency",
      order_date: "Oct 23, 2023",
      expected_delivery: "Oct 26, 2023",
      amount: 115000,
      status: "In Transit",
      item_name: "M25 Ready Mix (4 Trucks)",
      item_sku: "CON-M25-TRK",
      quantity_description: "4 Trucks",
      unit_price: 28750,
      timeline: [
        { title: "Order Placed", date: "Oct 23, 11:15 AM", done: true },
        { title: "Processed", date: "Oct 24, 08:30 AM", done: true },
        { title: "In Transit", date: "En route to Sector 45", done: true },
        { title: "Expected Delivery", date: "Oct 26 (Estimated)", done: false }
      ]
    }
  ],
  alerts: [
    { id: "al-1", type: "Stock", title: "Low Cement Stock", description: "Silver Oak Residency • 12 bags left", project_name: "Silver Oak Residency" },
    { id: "al-2", type: "Deadline", title: "Bayana Deadline", description: "Nara Tower • Due in 48 hours", project_name: "Nara Tower" }
  ]
};

// Database utility functions
function readDb(): DatabaseState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading db file, returning default state", err);
  }
  // If db file doesn't exist, write defaultState and return it
  writeDb(defaultState);
  return defaultState;
}

function writeDb(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db file", err);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Endpoints for read/write operations
  app.get("/api/db", (req, res) => {
    res.json(readDb());
  });

  app.post("/api/db", (req, res) => {
    const newState = req.body;
    writeDb(newState);
    res.json({ success: true, state: newState });
  });

  // Feature A: Voice-to-Khata Multi-Lingual Parser Endpoint
  app.post("/api/voice-to-khata", async (req, res) => {
    const { phrase, projectId } = req.body;
    if (!phrase) {
      return res.status(400).json({ error: "No voice text or phrase provided." });
    }

    const targetProjectId = projectId || "pr-3";

    try {
      const ai = getGeminiClient();
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey || apiKey === "MOCK_KEY") {
        // Fallback Mock Parser
        let amount = 1500;
        let category: 'Labor' | 'Materials' | 'Miscellaneous' = 'Miscellaneous';
        let remarks = phrase;

        if (phrase.toLowerCase().includes("cement") || phrase.toLowerCase().includes("material")) {
          category = "Materials";
          amount = 18000;
          remarks = "Cement delivery (50 bags)";
        } else if (phrase.toLowerCase().includes("labor") || phrase.toLowerCase().includes("wage") || phrase.toLowerCase().includes("shuttering")) {
          category = "Labor";
          amount = 12500;
          remarks = "Paid shuttering labor wages";
        } else if (phrase.toLowerCase().includes("plumbing") || phrase.toLowerCase().includes("bit") || phrase.toLowerCase().includes("petty")) {
          category = "Miscellaneous";
          amount = 1200;
          remarks = "Petty cash for plumbing bits";
        }

        const mockPayment: Partial<DailyPayment> = {
          amount,
          paid_by: "Supervisor Amit",
          remarks,
          category,
          date: new Date().toISOString()
        };

        // Write directly to DB for immediate persistence
        const db = readDb();
        const newPayment: DailyPayment = {
          id: "dp-" + Date.now(),
          project_id: targetProjectId,
          amount: mockPayment.amount || 0,
          paid_by: mockPayment.paid_by || "Supervisor Amit",
          remarks: mockPayment.remarks || phrase,
          category: mockPayment.category || "Miscellaneous",
          date: new Date().toLocaleString()
        };
        db.daily_payments.unshift(newPayment);
        writeDb(db);

        return res.json({ payment: newPayment, isMock: true });
      }

      // Real Gemini Parsing with robust local fallback inside try-catch block
      let parsedData: any = null;
      let isMockFallback = false;

      try {
        const prompt = `You are a multi-lingual transaction ledger parser for an Indian real-estate construction company (BuildEstimate BOS).
Analyze the given speech phrase and extract:
1. Amount (numeric)
2. Remarks (clean, human-readable English summary)
3. Category (one of exactly: "Labor", "Materials", "Miscellaneous")
4. Paid By (default to "Supervisor Amit" if not specified)

Context: The phrases will often be in mixed English/Hindi/Punjabi (hinglish/code-switching).
Example inputs and outputs:
- "Paid shuttering labor wages 12500" -> { amount: 12500, remarks: "Paid shuttering labor wages", category: "Labor", paid_by: "Supervisor Amit" }
- "Aaj cement bori mangaaye tha athara hazar ka" -> { amount: 18000, remarks: "Cement delivery (50 bags)", category: "Materials", paid_by: "Supervisor Amit" }
- "petty cash plumbers ko diya baara sau" -> { amount: 1200, remarks: "Petty cash for plumbing bits", category: "Miscellaneous", paid_by: "Supervisor Amit" }

Phrase: "${phrase}"`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                amount: { type: Type.INTEGER, description: "Total Rupee amount in the phrase" },
                remarks: { type: Type.STRING, description: "A highly concise human-friendly description of the transaction" },
                category: { type: Type.STRING, enum: ["Labor", "Materials", "Miscellaneous"], description: "The classification of the spend" },
                paid_by: { type: Type.STRING, description: "Person who spent the cash" }
              },
              required: ["amount", "remarks", "category", "paid_by"]
            }
          }
        });

        const parsedText = response.text || "{}";
        parsedData = JSON.parse(parsedText);
      } catch (geminiError: any) {
        console.warn("Real Gemini parsing failed (possibly 503 or quota), using smart local fallback", geminiError);
        isMockFallback = true;
        
        // Match numbers from the phrase to find the amount
        const numbers = phrase.match(/\d+/g);
        let amount = 0;
        if (numbers) {
          amount = parseInt(numbers[numbers.length - 1], 10);
        } else {
          if (phrase.toLowerCase().includes("baara sau") || phrase.toLowerCase().includes("1200") || phrase.toLowerCase().includes("baarasau")) amount = 1200;
          else if (phrase.toLowerCase().includes("athara hazar") || phrase.toLowerCase().includes("18000")) amount = 18000;
          else if (phrase.toLowerCase().includes("baara hazar") || phrase.toLowerCase().includes("12500")) amount = 12500;
          else amount = 1500;
        }

        let category: 'Labor' | 'Materials' | 'Miscellaneous' = 'Miscellaneous';
        let remarks = phrase;

        if (phrase.toLowerCase().includes("cement") || phrase.toLowerCase().includes("material") || phrase.toLowerCase().includes("bori")) {
          category = "Materials";
          remarks = "Cement delivery: " + phrase;
        } else if (phrase.toLowerCase().includes("labor") || phrase.toLowerCase().includes("wage") || phrase.toLowerCase().includes("shuttering") || phrase.toLowerCase().includes("plumber")) {
          category = phrase.toLowerCase().includes("plumber") && amount < 2000 ? "Miscellaneous" : "Labor";
          remarks = "Wages/Labor paid: " + phrase;
        } else {
          remarks = "Local parsed transaction: " + phrase;
        }

        parsedData = {
          amount,
          remarks,
          category,
          paid_by: "Supervisor Amit (Local Fallback)"
        };
      }

      // Save to local DB state
      const db = readDb();
      const newPayment: DailyPayment = {
        id: "dp-" + Date.now(),
        project_id: targetProjectId,
        amount: parsedData.amount || 0,
        paid_by: parsedData.paid_by || "Supervisor Amit",
        remarks: parsedData.remarks || phrase,
        category: parsedData.category || "Miscellaneous",
        date: new Date().toLocaleString()
      };
      db.daily_payments.unshift(newPayment);
      writeDb(db);

      res.json({ payment: newPayment, isMock: isMockFallback });

    } catch (error: any) {
      console.error("Gemini voice parsing general failure", error);
      res.status(500).json({ error: "Failed to parse speech text using AI.", details: error.message });
    }
  });

  // Feature B: Broker Agent - Dynamic Lead Inventory Auto-Matcher Endpoint with Maps Grounding
  app.post("/api/auto-match", async (req, res) => {
    const { clientName, propertyType, preferredLocation, maxBudget } = req.body;

    try {
      const db = readDb();
      // Filter list of matching properties
      const matches = db.properties.filter(p => {
        const typeMatch = !propertyType || p.property_type.toLowerCase() === propertyType.toLowerCase();
        const budgetMatch = !maxBudget || p.target_selling_price <= Number(maxBudget);
        return typeMatch && budgetMatch;
      });

      if (matches.length === 0) {
        return res.json({ matches: [], message: "No matching properties found in inventory." });
      }

      const matchedProperty = matches[0]; // Take primary match for sales pitch
      const ai = getGeminiClient();
      const apiKey = process.env.GEMINI_API_KEY;

      let salesPitch = "";
      let mapsLinks: { title: string; uri: string }[] = [];

      if (!apiKey || apiKey === "MOCK_KEY") {
        // Fallback Mock Pitch
        const formattedPrice = (matchedProperty.target_selling_price / 100000).toFixed(1) + " Lakh";
        salesPitch = `Hi ${clientName || "Sir/Madam"}! I found a perfect option matching your requirement:\n\n🏡 *${matchedProperty.title}*\n📍 Location: ${matchedProperty.location}\n💰 Owner Asking: ₹${formattedPrice}\n\nThis is a premium, verified deal in Kharar/Mohali. Let me know if you would like to arrange a site visit or virtual walkthrough!`;
        mapsLinks = [{ title: "View " + matchedProperty.location + " on Google Maps", uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchedProperty.location)}` }];
      } else {
        // Real Gemini Pitch with Maps Grounding
        const prompt = `You are an elite, highly persuasive real estate channel partner and relationship manager in Mohali and Kharar (Punjab, India).
Write a professional, compelling, extremely tailored WhatsApp marketing pitch for the client named "${clientName || "Client"}".
The matched property details are:
- Title: "${matchedProperty.title}"
- Location: "${matchedProperty.location}"
- Deal price to offer: ₹${matchedProperty.target_selling_price.toLocaleString()}

Using Google Maps grounding, please lookup the neighborhood "${matchedProperty.location}" in Kharar/Mohali, Punjab, India. Highlight some real nearby landmarks, connectivity features, parks, or roads to make the pitch authentic and highly accurate.
Make the message warm, direct, respectful, and slightly colloquial (incorporating a few premium Indian business terms if suited). Highlight the location and the pricing advantage. Ensure there is a strong call-to-action to connect on WhatsApp or visit. Do not write markdown blocks (bold text with stars is fine). Keep it ready to copy and paste.`;

        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              tools: [{ googleMaps: {} }]
            }
          });

          salesPitch = response.text || "";

          // Extract Maps grounding links
          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
          if (chunks && Array.isArray(chunks)) {
            for (const chunk of chunks) {
              if (chunk.maps?.uri) {
                mapsLinks.push({
                  title: chunk.maps.title || "View Location on Google Maps",
                  uri: chunk.maps.uri
                });
              }
              if (chunk.maps?.placeAnswerSources?.reviewSnippets) {
                for (const snippet of chunk.maps.placeAnswerSources.reviewSnippets) {
                  const anySnippet = snippet as any;
                  if (anySnippet.reviewUri) {
                    mapsLinks.push({
                      title: anySnippet.title || "Read Google Review",
                      uri: anySnippet.reviewUri
                    });
                  }
                }
              }
            }
          }
          
          // Deduplicate links
          const seenUris = new Set<string>();
          mapsLinks = mapsLinks.filter(link => {
            if (seenUris.has(link.uri)) return false;
            seenUris.add(link.uri);
            return true;
          });

          // Fallback if no grounding links were returned
          if (mapsLinks.length === 0) {
            mapsLinks.push({
              title: "View " + matchedProperty.location + " on Google Maps",
              uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchedProperty.location + " Kharar Mohali Punjab")}`
            });
          }

        } catch (apiErr: any) {
          console.warn("Real Gemini auto-match with maps grounding failed (possibly 503 or quota), using local fallback", apiErr);
          const formattedPrice = (matchedProperty.target_selling_price / 100000).toFixed(1) + " Lakh";
          salesPitch = `Hi ${clientName || "Sir/Madam"}! I found a perfect option matching your requirement:\n\n🏡 *${matchedProperty.title}*\n📍 Location: ${matchedProperty.location}\n💰 Owner Asking: ₹${formattedPrice}\n\nThis is a premium, verified deal in Kharar/Mohali. Let me know if you would like to arrange a site visit or virtual walkthrough!`;
          mapsLinks = [{ title: "View " + matchedProperty.location + " on Google Maps", uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchedProperty.location)}` }];
        }
      }

      res.json({
        matches,
        pitch: salesPitch,
        encodedPitch: encodeURIComponent(salesPitch),
        mapsLinks
      });

    } catch (error: any) {
      console.error("Broker auto-match error", error);
      res.status(500).json({ error: "Failed to generate AI auto-match sales pitch.", details: error.message });
    }
  });

  // Vite Integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BuildEstimate BOS running at http://localhost:${PORT}`);
  });
}

startServer();
