import { NextResponse } from "next/server";
import { ChatService } from "@/services/chat.service";

export async function POST(request: Request) {
  try {
    const { text, weight } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: "Please provide transportation text." },
        { status: 400 },
      );
    }

    const chatService = new ChatService(process.env.GEMINI_API_KEY || "");

    // Info: (20260428 - Luphia) Use Gemini to analyze text and split routes
    const prompt = `
      You are an expert logistics and transportation analyst.
      Based on the following user input, identify the starting point and ending point of the transportation.
      Then, split the journey into logical segments (land, sea, air) assuming typical international or domestic freight routes.
      For each segment, estimate the mileage (in miles).
      
      User Input: "${text}"
      
      Respond STRICTLY in JSON format without any markdown wrappers or additional text:
      {
        "startPoint": "Start Location",
        "endPoint": "End Location",
        "bbox": "minLon,minLat,maxLon,maxLat",
        "segments": [
          {
            "mode": "land" | "sea" | "air",
            "from": "Segment Start",
            "to": "Segment End",
            "estimatedKm": 100,
            "bbox": "minLon,minLat,maxLon,maxLat"
          }
        ]
      }
      
      Note: Provide the "bbox" (bounding box) that covers the ENTIRE route as a comma-separated string: "min_longitude,min_latitude,max_longitude,max_latitude". Make sure to provide valid geographical coordinates.
      Also provide a "bbox" for EACH segment covering exactly that segment's path. Use metric units (KM) for estimatedKm.
    `;

    const responseText = await chatService.generateRaw(prompt);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response into JSON");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    // Info: (20260428 - Luphia) Coefficients (from Table 8)
    const totalWeightTonnes = weight || 1;

    // Info: (20260428 - Luphia) IPCC Standard Emission Factors (kg CO2e / tonne-km)
    const IPCC_LAND_COEF = 0.105;
    const IPCC_SEA_COEF = 0.016;
    const IPCC_AIR_COEF = 0.602;

    let totalEmissions = 0;

    const segmentsWithEmissions = parsedData.segments.map(
      (seg: {
        mode: string;
        from: string;
        to: string;
        estimatedKm: number;
        bbox?: string;
      }) => {
        let coef = 0;
        if (seg.mode === "land") coef = IPCC_LAND_COEF;
        else if (seg.mode === "sea") coef = IPCC_SEA_COEF;
        else if (seg.mode === "air") coef = IPCC_AIR_COEF;

        // Info: (20260428 - Luphia) Calculate emissions using IPCC standards: Tonnes * Km * Coefficient
        const emissions = seg.estimatedKm * totalWeightTonnes * coef;
        totalEmissions += emissions;

        const thumbnailUrl = seg.bbox
          ? `https://www.openstreetmap.org/export/embed.html?bbox=${seg.bbox}&layer=mapnik`
          : `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(seg.from)}%20%E2%86%92%20${encodeURIComponent(seg.to)}`;

        return {
          ...seg,
          thumbnailUrl,
          coefficient: coef,
          coefficientUnit: "kg CO₂e / tonne-km",
          coefficientSource:
            "IPCC Guidelines for National Greenhouse Gas Inventories",
          emissions: Math.round(emissions * 10) / 10,
          emissionsUnit: "kg CO₂e",
        };
      },
    );

    // Info: (20260428 - Luphia) Generate OSM embed URL as thumbnail
    const thumbnailUrl = parsedData.bbox
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${parsedData.bbox}&layer=mapnik`
      : `https://placehold.co/600x400/1e293b/ffffff?text=${encodeURIComponent(parsedData.startPoint)}%20%E2%86%92%20${encodeURIComponent(parsedData.endPoint)}`;

    return NextResponse.json({
      startPoint: parsedData.startPoint,
      endPoint: parsedData.endPoint,
      totalWeightTonnes: weight || 1,
      totalEmissions: Number(totalEmissions.toFixed(2)),
      thumbnailUrl,
      segments: segmentsWithEmissions,
    });
  } catch (error) {
    console.error("Error in transportation calculator API:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 },
    );
  }
}
