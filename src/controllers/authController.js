console.log("✅ authController loaded");

import bcrypt from "bcryptjs";
import supabase from "../config/supabaseClient.js";
import { generateToken } from "../config/jwt.js";

/**
 * SIGNUP  (UNCHANGED)
 */
export const register = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Insert user into database
  const { data, error } = await supabase
    .from("users")
    .insert([{ email, password: hashedPassword }])
    .select()
    .single();

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(201).json({
    message: "User created successfully",
    user: {
      id: data.id,
      email: data.email,
    },
  });
};

/**
 * LOGIN
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) {
    console.log("❌ User fetch error:", error);
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  const token = generateToken(user);

  return res.status(200).json({
    message: "Login successful",
    token,
  });
};
