//sentiment-app\frontend\src\app\api\sentiment\route.js
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const API_URL = process.env.BACKEND_API_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    
    const { text, save = true } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    // Choose endpoint based on whether to save
    const endpoint = save ? "/save-review" : "/predict";

    // Call your Python backend with user_id (email)
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        text,
        user_id: session?.user?.email || null, // Pass user email as user_id
        product_id: null, // Optional: add product tracking if needed
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "Backend request failed");
    }

    const data = await response.json();

    // Return unified response format
    return NextResponse.json({
      text: data.text,
      sentiment: data.sentiment,
      confidence: data.confidence,
      id: data.id || null,
      timestamp: data.timestamp || null,
      saved: save,
      user_id: data.user_id, // Include user_id in response
    });
  } catch (error) {
    console.error("Sentiment API Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to analyze sentiment" },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch saved reviews
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const sentiment = searchParams.get('sentiment');
    const userEmail = searchParams.get('user_email'); // Optional: filter by user
    
    let url = `${API_URL}/reviews?limit=${limit}`;
    if (sentiment) {
      url += `&sentiment=${sentiment}`;
    }
    if (userEmail) {
      url += `&user_email=${userEmail}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error("Failed to fetch reviews");
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}