// frontend/src/lib/auth.js
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import clientPromise from "./mongodb";
import bcrypt from "bcryptjs";

export const authOptions = {

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        // Hardcoded admin check
        if (credentials.email === "admin@sentimentplus.com" && credentials.password === "admin@123") {
          return {
            id: "admin-1",
            email: "admin@sentimentplus.com",
            name: "System Admin",
            image: null,
            role: "admin"
          };
        }

        const client = await clientPromise;
        const db = client.db("sentiment_db");
        
        const user = await db.collection("user-management").findOne({
          email: credentials.email
        });

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        // Check if user is active
        if (user.status !== "active") {
          throw new Error("Account is suspended or terminated");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        // Update last login
        await db.collection("user-management").updateOne(
          { email: credentials.email },
          { $set: { last_login: new Date() } }
        );

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role || "user",
          status: user.status
        };
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.status = token.status;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      try {
        const client = await clientPromise;
        const db = client.db("sentiment_db");
        const usersCollection = db.collection("user-management");

        if (account?.provider === "google") {
          // Google sign-in flow
          const existingUser = await usersCollection.findOne({ email: user.email });

          if (!existingUser) {
            // Create new user
            const newUser = {
              name: user.name,
              email: user.email,
              image: user.image,
              role: "user",
              status: "active",
              created_at: new Date(),
              last_login: new Date(),
              auth_provider: "google",
              google_id: account.providerAccountId,
              review_count: 0,
              correction_count: 0
            };
            
            const result = await usersCollection.insertOne(newUser);
            console.log('✅ Created new Google user:', user.email);
            
            // Set user properties for JWT
            user.id = result.insertedId.toString();
            user.role = "user";
            user.status = "active";
          } else {
            // User exists - check if active
            if (existingUser.status !== "active") {
              console.log('❌ Account is not active:', user.email);
              return false;
            }
            
            // Update existing user with Google info
            await usersCollection.updateOne(
              { email: user.email },
              { 
                $set: { 
                  last_login: new Date(),
                  image: user.image,
                  name: user.name,
                  google_id: account.providerAccountId,
                  auth_provider: "google"
                } 
              }
            );
            
            console.log('✅ Linked Google account to existing user:', user.email);
            
            // Set user properties for JWT
            user.id = existingUser._id.toString();
            user.role = existingUser.role || "user";
            user.status = existingUser.status;
          }
        } else if (account?.provider === "credentials") {
          // Credentials login is handled in authorize callback
          // User object already has id, role, status from authorize
        }
        
        return true; // Allow sign in
      } catch (error) {
        console.error("❌ Error in signIn callback:", error);
        return false;
      }
    },
    async redirect({ url, baseUrl }) {
      console.log('🔄 Redirect callback - URL:', url, 'BaseURL:', baseUrl);
      
      // If already on a dashboard, stay there
      if (url.includes('/user/dashboard') || url.includes('/admin/dashboard')) {
        return url;
      }
      
      // Default redirect after sign in - will be overridden by client-side logic
      if (url.includes('/login') || url.includes('/register') || url.includes('/api/auth')) {
        // We'll return a placeholder - the actual redirect happens client-side based on role
        return `${baseUrl}/auth/redirecting`;
      }
      
      // Handle relative URLs
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }
      
      // Handle same origin URLs
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Default fallback
      return baseUrl;
    }
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log('📝 Sign in event:', {
        email: user.email,
        provider: account?.provider,
        isNewUser
      });
    },
    async createUser({ user }) {
      console.log('👤 User created by adapter:', user.email);
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Keep debug on to see what's happening
};