// app/api/register/route.js
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();
    
    // Connect to MongoDB
    const client = await MongoClient.connect(process.env.MONGODB_URI);
    const db = client.db("sentiment_db");
    
    // FIXED: Use "user-management" collection
    const usersCollection = db.collection("user-management");
    
    // Check if user exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      await client.close();
      return Response.json({ error: "User already exists" }, { status: 400 });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user document
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: "user",
      status: "active",
      created_at: new Date(),
      last_login: null,
      review_count: 0,
      correction_count: 0
    };
    
    // Save to MongoDB
    await usersCollection.insertOne(newUser);
    
    await client.close();
    
    return Response.json({ success: true, message: "User created successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}