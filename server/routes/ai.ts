import { Router } from "express";
import { Type } from "@google/genai";
import { getGeminiClient, generateContentWithRetry } from "../services/gemini";
import { readDb, writeDb } from "../services/database";
import { DailyPayment } from "../../src/types";

const router = Router();

// Feature A: Voice-to-Khata Multi-Lingual Parser Endpoint
router.post("/voice-to-khata", async (req, res) => {
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

      const response = await generateContentWithRetry({
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
    console.warn("[Gemini API] Gemini voice parsing handled failure", error?.message || error);
    res.status(500).json({ error: "Failed to parse speech text using AI.", details: error.message });
  }
});

// Feature B: Broker Agent - Dynamic Lead Inventory Auto-Matcher Endpoint with Maps Grounding
router.post("/auto-match", async (req, res) => {
  const { clientName, propertyType, preferredLocation, maxBudget, selectedProperty, properties } = req.body;

  try {
    const db = readDb();
    
    // Support using client-side properties state passed in request body, falling back to local db
    const activeProperties = (properties && Array.isArray(properties) && properties.length > 0)
      ? properties
      : db.properties;

    // Helper to normalize price to raw Rupees if it was entered in Lakhs
    const getNormalizedValue = (val: any): number => {
      const num = Number(val || 0);
      if (num > 0 && num < 10000) {
        return num * 100000;
      }
      return num;
    };

    // Filter list of matching properties
    const matches = activeProperties.filter((p: any) => {
      const typeMatch = !propertyType || String(p.property_type).toLowerCase().trim() === String(propertyType).toLowerCase().trim();
      
      const pPrice = getNormalizedValue(p.target_selling_price);
      const limitBudget = getNormalizedValue(maxBudget);
      const budgetMatch = !maxBudget || pPrice <= limitBudget;
      
      return typeMatch && budgetMatch;
    });

    // Use passed selectedProperty first, otherwise fallback to matches[0] or any active property
    const matchedProperty = selectedProperty || matches[0] || activeProperties[0];

    if (!matchedProperty) {
      return res.json({ matches: [], message: "No matching properties found in inventory." });
    }
    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;

    let salesPitch = "";
    let mapsLinks: { title: string; uri: string }[] = [];

    const normalizedPriceVal = getNormalizedValue(matchedProperty.target_selling_price);
    const formattedPrice = (normalizedPriceVal / 100000).toFixed(1) + " Lakh";

    if (!apiKey || apiKey === "MOCK_KEY") {
      // Fallback Mock Pitch
      salesPitch = `Hi ${clientName || "Sir/Madam"}! I found a perfect option matching your requirement:\n\n🏡 *${matchedProperty.title}*\n📍 Location: ${matchedProperty.location}\n💰 Owner Asking: ₹${formattedPrice}\n\nThis is a premium, verified deal in Kharar/Mohali. Let me know if you would like to arrange a site visit or virtual walkthrough!`;
      mapsLinks = [{ title: "View " + matchedProperty.location + " on Google Maps", uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchedProperty.location)}` }];
    } else {
      // Real Gemini Pitch with Maps Grounding
      const prompt = `You are an elite, highly persuasive real estate channel partner and relationship manager in Mohali and Kharar (Punjab, India).
Write a professional, compelling, extremadamente tailored WhatsApp marketing pitch for the client named "${clientName || "Client"}".
The matched property details are:
- Title: "${matchedProperty.title}"
- Location: "${matchedProperty.location}"
- Deal price to offer: ₹${formattedPrice} (${normalizedPriceVal.toLocaleString()})

Using Google Maps grounding, please lookup the neighborhood "${matchedProperty.location}" in Kharar/Mohali, Punjab, India. Highlight some real nearby landmarks, connectivity features, parks, or roads to make the pitch authentic and highly accurate.

CRITICAL: Keep the WhatsApp pitch extremely concise, high-impact, and UNDER 120 words (approx. 700 characters) so it fits inside WhatsApp sharing links without browser truncation. Incorporate a few warm Indian terms respectfully, and end with a direct call-to-action to visit. Do not write markdown blocks (bold text with stars is fine). Keep it ready to copy and paste.`;

      try {
        const response = await generateContentWithRetry({
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
    console.warn("[Gemini API] Broker auto-match handled error", error?.message || error);
    res.status(500).json({ error: "Failed to generate AI auto-match sales pitch.", details: error.message });
  }
});

// Feature C: AI Dashboard Summary Endpoint
router.post("/ai/dashboard-summary", async (req, res) => {
  const { projects, inbound_revenues, daily_payments, office_expenses, vendors } = req.body;
  
  // Calculate some simple stats to feed into our fallback/prompt
  const totalBudget = (projects || []).reduce((sum: number, p: any) => sum + (p.total_budget || 0), 0);
  const totalInbound = (inbound_revenues || []).reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const totalDailyPayments = (daily_payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
  const totalOfficeExpenses = (office_expenses || []).reduce((sum: number, o: any) => sum + (o.amount || 0), 0);
  
  const netInflow = totalInbound - totalDailyPayments - totalOfficeExpenses;
  const numProjects = (projects || []).length;
  const numVendors = (vendors || []).length;

  // Let's format some values for fallback
  const formatLakhs = (val: number) => {
    const isNeg = val < 0;
    const absVal = Math.abs(val);
    if (absVal >= 100000) {
      return `${isNeg ? "-" : ""}₹${(absVal / 100000).toFixed(1)}L`;
    }
    return `${isNeg ? "-" : ""}₹${absVal.toLocaleString("en-IN")}`;
  };

  try {
    const ai = getGeminiClient();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === "MOCK_KEY" || apiKey === "") {
      // Return dynamic fallback output using the client's actual data
      const netPosText = netInflow >= 0 ? `${formatLakhs(netInflow)} positive` : `${formatLakhs(netInflow)} deficit`;
      const firstProj = (projects && projects.length > 0) ? projects[0] : null;
      let projText = "Your sites are progressing according to plan.";
      if (firstProj) {
        const pct = firstProj.completion_pct || 0;
        const budgetStatus = firstProj.spent > firstProj.total_budget * (pct / 100) ? "running slightly over budget" : "within expected budget";
        projText = `"${firstProj.project_name}" is ${pct}% complete and is ${budgetStatus}.`;
      }
      const vendorText = numVendors > 0 ? `You have ${numVendors} active vendor partnerships.` : "No outstanding vendor balances detected.";
      const summary = `Your net position this month is ${netPosText}. ${projText} ${vendorText} Total contract value across ${numProjects} project(s) stands at ${formatLakhs(totalBudget)}.`;
      return res.json({ summary, isMock: true });
    }

    // Call Gemini
    const prompt = `You are a professional CFO and senior construction management consultant for BuildEstimate BOS, a real estate development and construction enterprise.
Generate a concise, high-level, exactly 3 to 4 sentences natural language dashboard executive summary of the company's financial status and operational health based on the following real-time data:

Projects:
${JSON.stringify(projects, null, 2)}

Inbound Revenues (Client Payments):
${JSON.stringify(inbound_revenues, null, 2)}

Daily Payments (Site Expenses):
${JSON.stringify(daily_payments, null, 2)}

Office Expenses:
${JSON.stringify(office_expenses, null, 2)}

Vendors:
${JSON.stringify(vendors, null, 2)}

Instructions:
1. State the net cash position (Inbound client payments minus daily payments and office expenses). Mention whether it is positive or negative, formatting values using Indian numbering system (e.g. ₹2.3L, ₹1.5Cr).
2. Highlight the status of one or two prominent projects (e.g., completion percentage and whether they are running over or under budget based on total budget vs spent).
3. Mention any vendor outstanding/management status or potential action items.
4. Keep the summary exactly 3 to 4 sentences long. Ensure it is highly professional, direct, elegant, and action-oriented. No markdown code formatting, just return pure text.`;

    const response = await generateContentWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const summary = response.text?.trim() || "";
    return res.json({ summary, isMock: false });

  } catch (error: any) {
    console.warn("[Gemini API] Dashboard summary fell back gracefully to analytical model.", error?.message || error);
    // Dynamic Fallback on error
    const netPosText = netInflow >= 0 ? `${formatLakhs(netInflow)} positive` : `${formatLakhs(netInflow)} deficit`;
    const firstProj = (projects && projects.length > 0) ? projects[0] : null;
    let projText = "Your sites are progressing according to plan.";
    if (firstProj) {
      const pct = firstProj.completion_pct || 0;
      const budgetStatus = firstProj.spent > firstProj.total_budget * (pct / 100) ? "running slightly over budget" : "within expected budget";
      projText = `"${firstProj.project_name}" is ${pct}% complete and is ${budgetStatus}.`;
    }
    const vendorText = numVendors > 0 ? `You have ${numVendors} active supplier channels.` : "No outstanding vendor balances detected.";
    const summary = `Your net position is currently ${netPosText}. ${projText} ${vendorText} Total contract value across ${numProjects} project(s) stands at ${formatLakhs(totalBudget)}.`;
    
    return res.json({ summary, isMock: true, error: error.message });
  }
});

export default router;
