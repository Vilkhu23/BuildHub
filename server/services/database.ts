import fs from "fs";
import path from "path";
import { DatabaseState } from "../../src/types";

const DB_FILE = path.join(process.cwd(), "db.json");

// Seed Data
export const defaultState: DatabaseState = {
  profiles: [
    { id: "ak-1", name: "Amit Kumar", user_role: "Manager", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "ps-1", name: "Priya Sharma", user_role: "Telecaller", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "rk-1", name: "Rahul Khan", user_role: "Supervisor", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "vj-1", name: "Vikram Joshi", user_role: "Manager", account_status: "Active", parent_owner_id: "owner-1" },
    { id: "owner-1", name: "Rajesh Singh", user_role: "Owner", account_status: "Active", parent_owner_id: null }
  ],
  clients: [],
  projects: [],
  properties: [],
  inbound_revenues: [],
  daily_payments: [],
  office_expenses: [],
  deal_adjustments: [],
  material_stocks: [],
  vendors: [],
  purchase_orders: [],
  alerts: [],
  buyer_requirements: []
};

// Database utility functions
export function readDb(): DatabaseState {
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

export function writeDb(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing db file", err);
  }
}
