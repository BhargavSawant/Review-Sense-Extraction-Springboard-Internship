// frontend/src/lib/auth.js
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        const db = client.db("sentiment_db");
        
        const user = await db.collection("users").findOne({ 
          email: credentials.email 
        });
        
        if (!user) {
          client.close();
          throw new Error("No user found");
        }
        
        const isValid = await bcrypt.compare(credentials.password, user.password);
        
        if (!isValid) {
          client.close();
          throw new Error("Invalid password");
        }
        
        // Update last_login
        await db.collection("users").updateOne(
          { email: user.email },
          { $set: { last_login: new Date() } }
        );
        
        client.close();
        
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        // Handle Google sign-in - save to MongoDB if new user
        const client = await MongoClient.connect(process.env.MONGODB_URI);
        const db = client.db("sentiment_db");
        
        const existingUser = await db.collection("users").findOne({ 
          email: user.email 
        });
        
        if (!existingUser) {
          await db.collection("users").insertOne({
            name: user.name,
            email: user.email,
            role: "user",
            status: "active",
            created_at: new Date(),
            last_login: new Date(),
            review_count: 0,
            correction_count: 0,
            provider: "google"
          });
        } else {
          await db.collection("users").updateOne(
            { email: user.email },
            { $set: { last_login: new Date() } }
          );
        }
        
        client.close();
      }
      return true;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};